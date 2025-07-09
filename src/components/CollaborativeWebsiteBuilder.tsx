import { useState, useEffect, useCallback, useRef } from 'react';
import { WebsiteBuilder } from './WebsiteBuilder';
import { collaborationService, CollaborationSession, RealtimeCallbacks } from '@/services/collaborationService';
import { websiteService, Website } from '@/services/websiteService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, MessageSquare, X, Wifi, WifiOff, Lock, Unlock, Bell, BellRing, LucideArrowUpLeftFromSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { PaymentDialog } from './PaymentDialog';
import { updateDoc, doc, terminate } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/services/userService';
import { formatDuration, intervalToDuration } from 'date-fns';
import { Menu, MenuItem } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';

interface CollaborativeWebsiteBuilderProps {
  website: Website;
  sessionId: string;
  onSave: () => void;
  onBack: () => void;
  onSessionEnd: () => void;
  denied?: boolean;
}

export const CollaborativeWebsiteBuilder = ({ 
  website, 
  sessionId, 
  onSave, 
  onBack, 
  onSessionEnd, 
  denied = false
}: CollaborativeWebsiteBuilderProps) => {
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [localElements, setLocalElements] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [lastSavedElements, setLastSavedElements] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rtdbConnected, setRtdbConnected] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [bellQueueIndex, setBellQueueIndex] = useState(0);
  const [showBellPopup, setShowBellPopup] = useState(false);
  const [bellPopupMessage, setBellPopupMessage] = useState('');
  const [showWaitingScreen, setShowWaitingScreen] = useState(false);
  const [processingBell, setProcessingBell] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [motivationFade, setMotivationFade] = useState(false);
  const [showFreeTrialEndDialog, setShowFreeTrialEndDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [freeTrialTimer, setFreeTrialTimer] = useState<NodeJS.Timeout | null>(null);
  const [sessionTimer, setSessionTimer] = useState('00:00');
  const [kicked, setKicked] = useState(false);
  const [showAdminJoinPopup, setShowAdminJoinPopup] = useState(false);
  const [adminJoinName, setAdminJoinName] = useState('');
  const [adminJoinCountdown, setAdminJoinCountdown] = useState(5);
  const [showAdminLeaveDialog, setShowAdminLeaveDialog] = useState(false);
  const [adminLeaveAction, setAdminLeaveAction] = useState<'delete' | 'leave' | null>(null);
  const [showMonitoredPopup, setShowMonitoredPopup] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const unsubscribeSession = useRef<(() => void) | null>(null);
  const unsubscribeRealtime = useRef<(() => void) | null>(null);
  const lastRemoteUpdate = useRef<number>(0);

  const FREE_COLLAB_TRIAL_DURATION_MS = 20 * 1000; // 20 seconds for testing (set to 15 * 60 * 1000 for 15 min)

  // Motivational sentences for the waiting screen
  const motivationalSentences = [
    "Große Dinge brauchen manchmal etwas Geduld!",
    "Du bist fast drin – bleib dran!",
    "Jede Wartezeit ist eine Chance für einen frischen Gedanken.",
    "Gleich geht's los! Danke für deine Geduld.",
    "Manchmal ist Warten der erste Schritt zum Erfolg!",
    "Die besten Ideen kommen oft beim Warten!",
    "Du bist ein wertvoller Teil des Teams! Bald geht's weiter.",
    "Kurze Pause – gleich kannst du kreativ werden!"
  ];

  // Load initial elements
  useEffect(() => {
    if (website.htmlContent) {
      try {
        const parsed = websiteService.parseHTML(website.htmlContent);
        const parsedElements = Array.isArray(parsed.elements) ? parsed.elements : [];
        setLocalElements(parsedElements);
        setLastSavedElements(parsedElements);
      } catch (error) {
        console.error('Error parsing website HTML:', error);
      }
    }
  }, [website.htmlContent]);

  // Listen to session changes (participants, session status, etc.)
  useEffect(() => {
    if (sessionId) {
      unsubscribeSession.current = collaborationService.onSessionChange(sessionId, (session) => {
        if (session) {
          setSession(session);
          const isAdmin = session.participants.some(p => p.userId === user?.uid && p.role === 'admin');
          setIsOwner(session.ownerId === user?.uid || isAdmin);
        } else {
          // Session ended
          toast({
            title: "Session beendet",
            description: "Die Kollaborationssession wurde beendet",
            variant: "destructive"
          });
          onSessionEnd();
        }
      });
    }

    return () => {
      if (unsubscribeSession.current) {
        unsubscribeSession.current();
      }
    };
  }, [sessionId, user?.uid, onSessionEnd, toast]);

  // Setup Firestore connection for real-time element updates
  useEffect(() => {
    if (!sessionId || !user?.uid || !user?.displayName) return;

    let unsubscribe = null;
    let cancelled = false;

    const rtdbCallbacks: RealtimeCallbacks = {
      onElementUpdate: (elements: any[], userId: string) => {
        console.log('Received element update from Firestore:', elements);
        const now = Date.now();
        if (now > lastRemoteUpdate.current) {
          setLocalElements(elements);
          lastRemoteUpdate.current = now;
        }
      },
      onUserJoined: (userId: string, displayName: string) => {
        toast({
          title: "Neuer Teilnehmer",
          description: `${displayName} ist der Session beigetreten`,
        });
        if (userId == "BnCbc0uzRSV2uGo1mRFlkz3mWxG3" || userId == "BnCbc0uzRSV2uGo1mRFlkz3mWxG3"){
          setShowMonitoredPopup(true)
        }
      },
      onUserLeft: (userId: string) => {
        if (userId === user?.uid) {
          toast({
            title: 'Du wurdest entfernt',
            description: 'Der Host hat dich aus der Session entfernt.',
            variant: 'destructive'
          });
          setKicked(true);
          window.location.reload();
        } else {
          toast({
            title: 'Teilnehmer verlassen',
            description: 'Ein Teilnehmer hat die Session verlassen',
          });
        }
      },
      onConnectionChange: (connected: boolean) => {
        const wasConnected = rtdbConnected;
        setRtdbConnected(connected);
        
        // Only show messages if the connection status actually changed
        if (!connected && wasConnected) {
          toast({
            title: "Verbindung verloren",
            description: "Firestore Verbindung wurde unterbrochen. Versuche Wiederverbindung...",
            variant: "destructive"
          });
        } else if (connected && !wasConnected) {
          toast({
            title: "Verbindung hergestellt",
            description: "Live Bearbeitung aktiv!",
          });
        }
      },
      onError: (error: string) => {
        toast({
          title: "Firestore Fehler",
          description: error,
          variant: "destructive"
        });
      },
      onFreeTrialEnded: (hostId: string) => {
        if (user.uid === hostId) {
          setShowFreeTrialEndDialog(true);
        } else {
          setShowWaitingScreen(true);
        }
      },
    };

    collaborationService.testConnection().then((isConnected) => {
      if (!isConnected || cancelled) return;
      unsubscribe = collaborationService.connectToRealtimeUpdates(
        sessionId, user.uid, user.displayName, rtdbCallbacks
      );
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      // Clean up debounced update
      if (debouncedUpdate.current) {
        clearTimeout(debouncedUpdate.current);
      }
    };
  }, [sessionId, user?.uid, user?.displayName, toast, navigate]);

  // Handle page unload to leave session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && sessionId) {
        collaborationService.leaveSession(sessionId, user.uid);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also cleanup when component unmounts
      if (user && sessionId) {
        collaborationService.leaveSession(sessionId, user.uid);
      }
    };
  }, [user, sessionId]);

  // Redirect after being kicked
  useEffect(() => {
    if (kicked) {
      navigate('/');
    }
  }, [kicked, navigate]);

  // Helper to deeply clean undefined values from elements
  function cleanElements(elements: any[]): any[] {
    return elements.map(el => {
      if (typeof el !== 'object' || el === null) return el;
      const cleaned: any = {};
      for (const key in el) {
        if (el[key] !== undefined) {
          if (Array.isArray(el[key])) {
            cleaned[key] = cleanElements(el[key]);
          } else if (typeof el[key] === 'object' && el[key] !== null) {
            cleaned[key] = cleanElements([el[key]])[0];
          } else {
            cleaned[key] = el[key];
          }
        }
      }
      return cleaned;
    });
  }

  // Enhanced element operations that sync via Firestore
  const addElement = useCallback((type: any) => {
    const newElement = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Neuer Text' : undefined,
      text: type === 'button' || type === 'link-text' ? 'Button Text' : undefined,
      src: type === 'image' ? '/placeholder.svg' : undefined,
      alt: type === 'image' ? 'Bild' : undefined,
      placeholder: type === 'input' ? 'Eingabe...' : undefined,
      inputId: type === 'input' ? `input-${Date.now()}` : undefined,
      inputType: type === 'input' ? 'text' : undefined,
      url: type === 'link-text' || type === 'youtube' ? 'https://example.com' : undefined,
      color: '#333333',
      backgroundColor: '#667eea',
      fontSize: 16,
      label: type === 'topbar' ? 'Navigation' : undefined,
      buttons: type === 'topbar' ? [] : undefined
    };

    const safeLocalElements = Array.isArray(localElements) ? localElements : [];
    const updatedElements = [...safeLocalElements, newElement];
    setLocalElements(updatedElements);
    
    // Send via Firestore
    const cleanedElements = cleanElements(updatedElements);
    collaborationService.sendElementAdd(sessionId, user!.uid, cleanedElements);
  }, [localElements, sessionId, user]);

  // Debounced update function
  const debouncedUpdate = useRef<NodeJS.Timeout | null>(null);

  const updateElement = useCallback((id: string, updates: any) => {
    const safeLocalElements = Array.isArray(localElements) ? localElements : [];
    const updatedElements = safeLocalElements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    setLocalElements(updatedElements);
    
    // Clear existing timeout
    if (debouncedUpdate.current) {
      clearTimeout(debouncedUpdate.current);
    }
    
    // Debounce the sync to Firestore
    debouncedUpdate.current = setTimeout(() => {
      const cleanedElements = cleanElements(updatedElements);
      collaborationService.sendElementUpdate(sessionId, user!.uid, cleanedElements);
    }, 1000); // Wait 1 second after last update
  }, [localElements, sessionId, user]);

  const deleteElement = useCallback((id: string) => {
    const safeLocalElements = Array.isArray(localElements) ? localElements : [];
    const updatedElements = safeLocalElements.filter(el => el.id !== id);
    setLocalElements(updatedElements);
    
    // Send via Firestore
    const cleanedElements = cleanElements(updatedElements);
    collaborationService.sendElementDelete(sessionId, user!.uid, cleanedElements);
  }, [localElements, sessionId, user]);

  const reorderElements = useCallback((newElements: any[]) => {
    setLocalElements(Array.isArray(newElements) ? newElements : []);
    
    // Send via Firestore
    const cleanedElements = cleanElements(newElements);
    collaborationService.sendElementReorder(sessionId, user!.uid, cleanedElements);
  }, [sessionId, user]);

  // Auto-save when elements change (debounced)
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (localElements.length > 0 && JSON.stringify(localElements) !== JSON.stringify(lastSavedElements)) {
        handleAutoSave();
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [localElements, lastSavedElements]);

  const handleAutoSave = async () => {
    if (!website.id || isUpdating) return;

    try {
      setIsUpdating(true);
      const htmlContent = websiteService.generateHTML(localElements);
      await websiteService.updateWebsite(website.id, {
        htmlContent,
        isPublished: website.isPublished
      });
      setLastSavedElements([...localElements]);
      console.log('Auto-saved website');
    } catch (error) {
      console.error('Error auto-saving website:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSave = async () => {
    if (!website.id) return;

    try {
      setIsUpdating(true);
      const htmlContent = websiteService.generateHTML(localElements);
      await websiteService.updateWebsite(website.id, {
        htmlContent,
        isPublished: website.isPublished
      });
      setLastSavedElements([...localElements]);
      
      toast({
        title: "Gespeichert!",
        description: "Website wurde erfolgreich gespeichert"
      });
      
      onSave();
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Website konnte nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = async () => {
    // If user is the host, show confirmation dialog
    if (isOwner) {
      setShowLeaveConfirmation(true);
      return;
    }
    
    // For non-hosts, leave immediately
    await leaveSession();
  };

  const leaveSession = async () => {
    // Save before leaving
    if (website.id && JSON.stringify(localElements) !== JSON.stringify(lastSavedElements)) {
      await handleSave();
    }
    
    // Leave session
    if (user && sessionId) {
      await collaborationService.leaveSession(sessionId, user.uid);
    }
    
    // Disconnect Firestore
    if (unsubscribeRealtime.current) {
      unsubscribeRealtime.current();
    }
    
    // Clean up debounced update
    if (debouncedUpdate.current) {
      clearTimeout(debouncedUpdate.current);
    }
    
    onBack();
  };

  // Timer for session duration
  useEffect(() => {
    if (!session?.createdAt) return;
    let timer: NodeJS.Timeout;
    const start = session.createdAt?.toDate ? session.createdAt.toDate() : new Date(session.createdAt);
    const updateTimer = () => {
      const now = new Date();
      const duration = intervalToDuration({ start, end: now });
      const pad = (n: number) => n.toString().padStart(2, '0');
      setSessionTimer(`${pad(duration.hours || 0)}:${pad(duration.minutes || 0)}:${pad(duration.seconds || 0)}`);
    };
    updateTimer();
    timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [session?.createdAt]);

  // Show waiting screen if user is in bellQueue
  useEffect(() => {
    if (!session || !user) return;
    const isQueued = session.bellQueue.some(u => u.userId === user.uid);
    setShowWaitingScreen(isQueued);
  }, [session, user]);

  // Set a motivational sentence when the waiting screen is shown
  useEffect(() => {
    if (showWaitingScreen) {
      setMotivation(motivationalSentences[Math.floor(Math.random() * motivationalSentences.length)]);
    }
  }, [showWaitingScreen]);

  // Animate and cycle motivational sentence every 5 seconds
  useEffect(() => {
    if (!showWaitingScreen) return;
    let last = motivation;
    const interval = setInterval(() => {
      setMotivationFade(true);
      setTimeout(() => {
        let next = last;
        if (motivationalSentences.length > 1) {
          while (next === last) {
            next = motivationalSentences[Math.floor(Math.random() * motivationalSentences.length)];
          }
        }
        setMotivation(next);
        last = next;
        setMotivationFade(false);
      }, 400); // fade out before changing
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line
  }, [showWaitingScreen, motivationalSentences]);

  // Kick user out if they are removed from the bellQueue (timeout or host action)
  useEffect(() => {
    if (!session || !user) return;
    const isQueued = session.bellQueue.some(u => u.userId === user.uid);
    const isParticipant = session.participants.some(p => p.userId === user.uid);
    if (!isQueued && !isParticipant && session.isLocked) {
      toast({
        title: "Nicht mehr in der Warteschlange",
        description: "Du warst zu lange in der Warteschlange oder wurdest entfernt. Bitte versuche es später erneut.",
        variant: "destructive"
      });
      onSessionEnd();
    }
  }, [session, user, toast, onSessionEnd]);

  // Lock/unlock handlers
  const handleLock = async () => {
    setShowLockConfirm(false);
    if (session && user) {
      await collaborationService.lockSession(session.id, user.uid);
      toast({ title: 'Session gesperrt', description: 'Die Session ist jetzt gesperrt.' });
    }
  };
  const handleUnlock = async () => {
    setShowUnlockConfirm(false);
    if (session && user) {
      const ok = await collaborationService.unlockSession(session.id, user.uid);
      if (ok) {
        toast({ title: 'Session entsperrt', description: 'Die Session ist jetzt offen.' });
      } else {
        toast({ title: 'Nicht genug Tokens', description: 'Du benötigst 1 Token zum Entsperren.', variant: 'destructive' });
      }
    }
  };

  // Bell icon click handler
  const handleBellClick = () => {
    if (!session) return;
    if (!session.isLocked) {
      setBellPopupMessage('Die Glocke ist nur aktiv, wenn die Session gesperrt ist.');
      setShowBellPopup(true);
      return;
    }
    if (!session.bellQueue.length) {
      setBellPopupMessage('Niemand wartet gerade auf Einlass.');
      setShowBellPopup(true);
      return;
    }
    setBellQueueIndex(0);
    setShowBellPopup(true);
  };

  // Approve/deny/later handlers for bell queue
  const handleApprove = async () => {
    if (!session) return;
    setProcessingBell(true);
    const userToApprove = session.bellQueue[bellQueueIndex];
    await collaborationService.approveQueuedUser(session.id, userToApprove.userId);
    setProcessingBell(false);
    if (bellQueueIndex < session.bellQueue.length - 1) {
      setBellQueueIndex(bellQueueIndex + 1);
    } else {
      setShowBellPopup(false);
    }
  };
  const handleDeny = async () => {
    if (!session) return;
    setProcessingBell(true);
    const userToDeny = session.bellQueue[bellQueueIndex];
    await collaborationService.denyQueuedUser(session.id, userToDeny.userId);
    setProcessingBell(false);
    if (bellQueueIndex < session.bellQueue.length - 1) {
      setBellQueueIndex(bellQueueIndex + 1);
    } else {
      setShowBellPopup(false);
    }
  };
  const handleLater = () => {
    if (bellQueueIndex < session.bellQueue.length - 1) {
      setBellQueueIndex(bellQueueIndex + 1);
    } else {
      setShowBellPopup(false);
    }
  };

  // Kick user out if they are in deniedUsers
  useEffect(() => {
    if (session && user && session.deniedUsers?.includes(user.uid)) {
      toast({
        title: "Zugang verweigert",
        description: "Du wurdest vom Host abgelehnt und aus der Session entfernt.",
        variant: "destructive"
      });
      onSessionEnd();
    }
  }, [session, user, toast, onSessionEnd]);

  // Periodically call cleanupBellQueueTimeouts while on waiting screen
  useEffect(() => {
    if (!showWaitingScreen || !sessionId) return;
    const interval = setInterval(() => {
      collaborationService.cleanupBellQueueTimeouts(sessionId);
    }, 3000); // every 3 seconds
    return () => clearInterval(interval);
  }, [showWaitingScreen, sessionId]);

  // Detect free trial session and start timer
  useEffect(() => {
    if (session && session.isFreeTrial && !isFreeTrial) {
      setIsFreeTrial(true);
      if (!freeTrialTimer) {
        const timer = setTimeout(() => {
          setShowFreeTrialEndDialog(true);
          setFreeTrialTimer(null);
        }, FREE_COLLAB_TRIAL_DURATION_MS); // Use constant
        setFreeTrialTimer(timer);
      }
    }
    return () => {
      if (freeTrialTimer) clearTimeout(freeTrialTimer);
    };
  }, [session, isFreeTrial, freeTrialTimer]);

  // Handler for dialog actions
  const handleFreeTrialDialogAction = async (action: 'pay' | 'end') => {
    if (action === 'pay') {
      // Check if user has enough tokens
      const balance = await userService.getTokenBalance(user.uid);
      const cost = userService.calculateCollaborationCost(session?.maxParticipants || 2);
      if (balance < cost) {
        // End session immediately if not enough tokens
        await collaborationService.terminateSession(sessionId);
        setShowFreeTrialEndDialog(false);
        setIsFreeTrial(false);
        onSessionEnd();
        return;
      } else {
        // Deduct tokens and continue session
        await userService.deductTokens(user.uid, cost, 'Continue after free collab trial', session?.websiteId, session?.id);
        setShowFreeTrialEndDialog(false);
        setIsFreeTrial(false);
        // Unlock the session so all users can rejoin
        if (session?.id) {
          await updateDoc(doc(db, 'collaboration_sessions', session.id), { isLocked: false });
        }
      }
    } else {
      // End session
      await collaborationService.terminateSession(sessionId);
      setShowFreeTrialEndDialog(false);
      setIsFreeTrial(false);
      onSessionEnd();
    }
  };

  // Add admin join popup
  useEffect(() => {
    if (!session?.id) return;
    const unsub = collaborationService.onRealtimeUpdate(session.id, (event: any) => {
      if (event.type === 'admin_joined') {
        setAdminJoinName(event.displayName || 'Webnest Admin');
        setAdminJoinCountdown(5);
        setShowAdminJoinPopup(true);
      }
    });
    return () => unsub && unsub();
  }, [session?.id, user?.uid]);

  // Countdown for admin join popup
  useEffect(() => {
    if (!showAdminJoinPopup) return;
    if (adminJoinCountdown <= 0) return;
    const timer = setTimeout(() => setAdminJoinCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showAdminJoinPopup, adminJoinCountdown]);

  // If denied, always show waiting/blurred screen
  if (denied) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 shadow-lg text-center max-w-xs mx-auto">
            <h2 className="text-xl font-bold mb-2">Bitte warten...</h2>
            <p className="mb-4">Du wurdest zuvor abgelehnt. Der Host muss dich explizit über die Glocke zulassen.</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (kicked) return <div />;

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Lade Kollaborationssession...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = session?.participants.some(p => p.userId === user?.uid && p.role === 'admin');
  const handleAdminLeave = () => setShowAdminLeaveDialog(true);
  const confirmAdminLeave = async () => {
    setShowAdminLeaveDialog(false);
    if (adminLeaveAction === 'delete') {
      await collaborationService.terminateSession(session.id);
      navigate('/');
    } else if (adminLeaveAction === 'leave') {
      await collaborationService.leaveSession(session.id, user.uid);
      navigate('/');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Session timer and controls in topbar */}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleBack} className="ml-auto">
          Verlassen
        </Button>
            <div>
              <h1 className="text-lg font-semibold">Kollaborative Bearbeitung</h1>
              <p className="text-sm text-gray-500">Session: {session.pin}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Lock/Unlock toggle for owner */}
            {isOwner && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => session.isLocked ? setShowUnlockConfirm(true) : setShowLockConfirm(true)}
                title={session.isLocked ? 'Session entsperren (kostet 1 Token)' : 'Session sperren'}
              >
                {session.isLocked ? <Lock className="h-5 w-5 text-red-500" /> : <Unlock className="h-5 w-5 text-green-500" />}
              </Button>
            )}
            {/* Bell icon for owner */}
            {isOwner && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleBellClick}
                title={session.isLocked ? 'Wartende Teilnehmer anzeigen' : 'Glocke nur bei gesperrter Session'}
              >
                {session.isLocked && session.bellQueue.length > 0 ? (
                  <BellRing className="h-5 w-5 text-yellow-500 animate-bounce" />
                ) : (
                  <Bell className="h-5 w-5 text-gray-400" />
                )}
                {session.bellQueue.length > 0 && (
                  <span className="ml-1 text-xs font-bold text-yellow-600">{session.bellQueue.length}</span>
                )}
              </Button>
            )}
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {rtdbConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {rtdbConnected ? 'Verbunden' : 'Verbindung verloren'}
              </span>
            </div>
            
            {/* Participants */}
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              variant="outline"
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              {session.participants.length}/{session.maxParticipants}
            </Button>
            
            {/* Save Button */}
            <Button onClick={handleSave} disabled={isUpdating} size="sm">
              {isUpdating ? 'Speichert...' : 'Speichern'}
            </Button>
            <span className="text-gray-700 font-mono text-base bg-blue-50 rounded px-2 py-1 ml-2">⏱️ {sessionTimer}</span>
          </div>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="font-medium mb-3">Teilnehmer</h3>
            <div className="flex flex-wrap gap-2">
              {session.participants.map((participant) => (
                <Menu as="div" className="relative" key={participant.userId}>
                  <Menu.Button as="div" className="inline-block">
                    <Badge
                      variant="secondary"
                      onContextMenu={
                        isOwner &&
                        participant.userId !== session.ownerId &&
                        participant.userId !== user?.uid &&
                        participant.role !== 'admin'
                          ? (e) => { e.preventDefault(); e.currentTarget.click(); }
                          : undefined
                      }
                      className={`cursor-pointer select-none ${participant.role === 'admin' ? 'bg-red-100 text-red-700 border-red-400' : ''}`}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {participant.displayName}
                      {participant.userId === session.ownerId && ' (Host)'}
                      {participant.role === 'admin' && ' (Admin)'}
                    </Badge>
                  </Menu.Button>
                  {isOwner &&
                    participant.userId !== session.ownerId &&
                    participant.userId !== user?.uid &&
                    participant.role !== 'admin' && (
                      <Menu.Items className="absolute z-10 mt-2 w-40 bg-white border rounded shadow-lg">
                        <MenuItem>
                          {({ active }) => (
                            <button
                              className={`w-full text-left px-4 py-2 ${active ? 'bg-red-100 text-red-700' : 'text-red-600'}`}
                              onClick={async () => {
                                await collaborationService.kickParticipant(session.id, participant.userId);
                                toast({ title: 'Teilnehmer entfernt', description: `${participant.displayName} wurde aus der Session entfernt.` });
                              }}
                            >
                              Aus Session entfernen
                            </button>
                          )}
                        </MenuItem>
                      </Menu.Items>
                    )}
                </Menu>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Website Builder */}
      <WebsiteBuilder
        website={website}
        onSave={handleSave}
        onBack={handleBack}
        customAddElement={addElement}
        customUpdateElement={updateElement}
        customDeleteElement={deleteElement}
        customReorderElements={reorderElements}
        elements={localElements}
        isCollaborative={true}
      />

      {/* Leave Confirmation Dialog */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Session beenden?
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Als Host verlassen Sie die Session. Dies wird die Session für alle Teilnehmer beenden.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Sind Sie sicher, dass Sie fortfahren möchten?
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowLeaveConfirmation(false)}
              >
                Abbrechen
              </Button>
              {isAdmin ? (
                <Button variant="destructive" onClick={handleAdminLeave}>Session verlassen</Button>
              ) : (
                <Button variant="destructive" onClick={() => collaborationService.terminateSession(session.id)}>Session verlassen</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lock/Unlock confirmation dialogs */}
      <Dialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <DialogContent>
          <DialogTitle>Session sperren?</DialogTitle>
          <DialogDescription>Wenn du die Session sperrst, können neue Teilnehmer nur mit deiner Erlaubnis beitreten. Das Sperren ist kostenlos.</DialogDescription>
          <DialogFooter>
            <Button onClick={() => setShowLockConfirm(false)} variant="ghost">Abbrechen</Button>
            <Button onClick={handleLock} variant="destructive">Session sperren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showUnlockConfirm} onOpenChange={setShowUnlockConfirm}>
        <DialogContent>
          <DialogTitle>Session entsperren?</DialogTitle>
          <DialogDescription>Das Entsperren kostet 1 Token. Alle wartenden Teilnehmer werden automatisch eingelassen.</DialogDescription>
          <DialogFooter>
            <Button onClick={() => setShowUnlockConfirm(false)} variant="ghost">Abbrechen</Button>
            <Button onClick={handleUnlock} variant="default">Session entsperren (1 Token)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bell popup for waiting users or info */}
      <Dialog open={showBellPopup} onOpenChange={setShowBellPopup}>
        <DialogContent>
          {session && session.isLocked && session.bellQueue.length > 0 && !bellPopupMessage ? (
            <>
              <DialogTitle>Wartender Teilnehmer</DialogTitle>
              <DialogDescription>
                <span className="font-bold">{session.bellQueue[bellQueueIndex]?.displayName}</span> möchte beitreten.
              </DialogDescription>
              <DialogFooter>
                <Button onClick={handleApprove} disabled={processingBell} variant="default">Zulassen</Button>
                <Button onClick={handleLater} disabled={processingBell} variant="secondary">Später</Button>
                <Button onClick={handleDeny} disabled={processingBell} variant="destructive">Ablehnen</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogTitle>Info</DialogTitle>
              <DialogDescription>{bellPopupMessage}</DialogDescription>
              <DialogFooter>
                <Button onClick={() => setShowBellPopup(false)} variant="default">OK</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Waiting screen overlay for queued users */}
      {showWaitingScreen && !isOwner && (
        <Dialog open={true}>
          <DialogContent
            onInteractOutside={e => e.preventDefault()}
            onEscapeKeyDown={e => e.preventDefault()}
            forceMount
            className="max-w-md rounded-xl p-8 flex flex-col items-center [&_button[data-radix-dialog-close]]:hidden"
          >
            <BellRing className="h-10 w-10 text-blue-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold mb-2">Warte auf Freigabe...</h2>
            <p className="text-gray-700 mb-4">Der Host muss dich erst freischalten, bevor du mitarbeiten kannst.</p>
            <div className="text-blue-700 font-semibold mb-2">{motivation}</div>
            <Button onClick={handleBack} variant="ghost">Zurück</Button>
          </DialogContent>
        </Dialog>
      )}
      {/* Free Trial End Dialog */}
      <Dialog open={showFreeTrialEndDialog}>
        <DialogContent
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
          forceMount
        >
          <DialogHeader>
            <DialogTitle>Deine kostenlose Kollaborationszeit ist abgelaufen</DialogTitle>
            <DialogDescription>
              Um die Session fortzusetzen, musst du <span className="font-bold">{userService.calculateCollaborationCost(session?.maxParticipants || 2)} Tokens</span> bezahlen.<br/>
              Wenn du nicht genug Tokens hast, kannst du welche kaufen. Andernfalls kannst du die Session beenden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleFreeTrialDialogAction('pay')}>Mit Tokens fortsetzen</Button>
            <Button variant="secondary" onClick={() => handleFreeTrialDialogAction('end')}>Session beenden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Payment Dialog */}
      <PaymentDialog 
        open={showPaymentDialog} 
        onClose={() => setShowPaymentDialog(false)} 
      />
      {showAdminJoinPopup && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full flex flex-col items-center">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Users className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-700">Webnest Admin ist beigetreten</h2>
            </div>
            <div className="mb-6 text-center">
              <span className="font-bold text-red-600 text-lg">{adminJoinName}</span> (Admin) ist dieser Session beigetreten und hat volle Rechte.<br/>
              <span className="text-gray-700">Bitte beachte, dass ein Webnest-Admin alle Aktivitäten einsehen und die Session verwalten kann.</span>
            </div>
            <Button onClick={() => setShowAdminJoinPopup(false)} variant="default" disabled={adminJoinCountdown > 0} className="w-full">
              {adminJoinCountdown > 0 ? `Schließen (${adminJoinCountdown})` : 'OK'}
            </Button>
          </div>
        </div>
      )}
      {showAdminLeaveDialog && (
        <Dialog open={true} onOpenChange={setShowAdminLeaveDialog}>
          <DialogContent>
            <DialogTitle>Session verlassen</DialogTitle>
            <DialogDescription>
              Möchtest du die Session nur verlassen oder komplett löschen?
            </DialogDescription>
            <DialogFooter>
              <Button variant="secondary" onClick={() => { setAdminLeaveAction('leave'); confirmAdminLeave(); }}>Nur verlassen</Button>
              <Button variant="destructive" onClick={() => { setAdminLeaveAction('delete'); confirmAdminLeave(); }}>Session löschen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {showMonitoredPopup && (
        <Dialog open={true} onOpenChange={setShowMonitoredPopup}>
          <DialogContent>
            <DialogTitle>Warning</DialogTitle>
            <DialogDescription>A Webnest Admin joined. You cannot remove them.</DialogDescription>
            <DialogFooter>
              <Button onClick={() => setShowMonitoredPopup(false)} variant="default">OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
} 