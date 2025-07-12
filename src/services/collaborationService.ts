import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from './userService';

export interface CollaborationSession {
  id: string;
  websiteId: string;
  ownerId: string;
  pin: string;
  maxParticipants: number;
  currentParticipants: number;
  participants: Array<{
    userId: string;
    displayName: string;
    joinedAt: any; // Can be Date or Timestamp
    role?: string;
  }>;
  isActive: boolean;
  createdAt: any; // Can be Date or Timestamp
  lastActivity: any; // Can be Date or Timestamp
  isLocked: boolean;
  bellQueue: Array<{ userId: string; displayName: string; requestedAt: any }>;
  deniedUsers: Array<string>;
  isFreeTrial?: boolean; // Added for free trial tracking
}

export interface RealtimeUpdate {
  type: 'element_update' | 'element_add' | 'element_delete' | 'element_reorder' | 'user_joined' | 'user_left' | 'connection_test' | 'free_trial_ended';
  sessionId: string;
  userId: string;
  displayName?: string;
  elements?: any[];
  elementId?: string;
  updates?: any;
  newElement?: any;
  timestamp: any; // Can be number or Timestamp
}

export interface RealtimeCallbacks {
  onElementUpdate?: (elements: any[], userId: string) => void;
  onUserJoined?: (userId: string, displayName: string) => void;
  onUserLeft?: (userId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onFreeTrialEnded?: (userId: string) => void; // Added for free trial ended notification
}

// Configurable queue timeout (in milliseconds)
const QUEUE_TIMEOUT_MS = 3 * 60 * 1000; // 2 minutes
// Configurable free trial duration (ms)
export const FREE_COLLAB_TRIAL_DURATION_MS = 15 * 60 * 1000; // 20 seconds for testing (set to 15 * 60 * 1000 for 15 min)

export const collaborationService = {
  // Generate a 6-character PIN
  generatePin(pinType: 'standard' | 'numbers' | 'emojis' = 'standard'): string {
    if (pinType === 'numbers') {
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += Math.floor(Math.random() * 10).toString();
      }
      return result;
    } else if (pinType === 'emojis') {
      const emojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😜','😝','😛','🤑','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🤧','😇','🥳','🥺','🤠','🤡','🤥','🤫','🤭','🧐','🤓','😈','👿','👹','👺','💀','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'];
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += emojis[Math.floor(Math.random() * emojis.length)];
      }
      return result;
    } else {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },

  // Create a new collaboration session
  async createSession(websiteId: string, ownerId: string, maxParticipants: number = 2, pinType: 'standard' | 'numbers' | 'emojis' = 'standard'): Promise<string> {
    // Check for free collab trial
    const userProfile = await userService.getUserProfile(ownerId);
    let isFreeTrial = false;
    if (userProfile && userProfile.hasUsedFreeCollabTrial === false) {
      isFreeTrial = true;
    }
    let totalTokens = userService.calculateCollaborationCost(maxParticipants);
    if (isFreeTrial) {
      totalTokens = 0; // Free for trial
    }
    const success = totalTokens === 0 ? true : await userService.deductTokens(
      ownerId, 
      totalTokens,
      `Collaboration session (${maxParticipants} participants)`,
      websiteId
    );
    if (!success) {
      throw new Error('Nicht genügend Tokens für Kollaborationssession');
    }
    const pin = this.generatePin(pinType);
    const sessionData = {
      websiteId,
      ownerId,
      pin,
      maxParticipants,
      currentParticipants: 1,
      participants: [{
        userId: ownerId,
        displayName: 'Owner', // Will be updated with actual user name
        joinedAt: Timestamp.fromDate(new Date())
      }],
      isActive: true,
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      isLocked: false,
      bellQueue: [],
      deniedUsers: [],
      isFreeTrial, // Mark session as free trial if applicable
      pinType, // Store the pin type
    };
    const docRef = doc(collection(db, 'collaboration_sessions'));
    await setDoc(docRef, sessionData);
    // If free trial, set timer to end after 15 minutes
    if (isFreeTrial) {
      setTimeout(async () => {
        // Save session and mark trial as used
        await userService.updateUserProfile(ownerId, { hasUsedFreeCollabTrial: true });
        // Lock the session for everyone (forces queue UI)
        await updateDoc(doc(db, 'collaboration_sessions', docRef.id), { isLocked: true });
        // Send a custom real-time update to notify all clients
        this.sendRealtimeUpdate(docRef.id, {
          type: 'free_trial_ended',
          userId: ownerId,
          timestamp: Date.now()
        });
      }, FREE_COLLAB_TRIAL_DURATION_MS); // Use constant
    }
    return docRef.id;
  },

  // Join a collaboration session
  async joinSession(pin: string, userId: string, displayName: string): Promise<CollaborationSession | { status: 'queued', sessionId: string, denied: boolean }> {
    // Find session by PIN
    const sessionsRef = collection(db, 'collaboration_sessions');
    const q = query(sessionsRef, where('pin', '==', pin), where('isActive', '==', true));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error('Session nicht gefunden oder inaktiv');
    }

    const sessionDoc = querySnapshot.docs[0];
    const sessionData = sessionDoc.data() as CollaborationSession;
    const sessionId = sessionDoc.id;

    // ADMIN BYPASS: If user is admin, always allow join, add as admin role if not present
    if (userService.isAdmin && typeof userService.isAdmin === 'function' && await userService.isAdmin(userId)) {
      const isAlready = sessionData.participants.some(p => p.userId === userId);
      let updatedParticipants = sessionData.participants;
      if (!isAlready) {
        updatedParticipants = [
          ...sessionData.participants,
          { userId, displayName, joinedAt: Timestamp.fromDate(new Date()), role: 'admin' }
        ];
        await updateDoc(doc(db, 'collaboration_sessions', sessionId), {
          participants: updatedParticipants,
          currentParticipants: updatedParticipants.length,
          lastActivity: serverTimestamp()
        });
      }
      return {
        id: sessionId,
        ...sessionData,
        participants: updatedParticipants,
        currentParticipants: updatedParticipants.length
      };
    }

    // Check if session is full
    if (sessionData.currentParticipants >= sessionData.maxParticipants) {
      throw new Error('Session ist voll. Bitte warten Sie bis ein Platz frei wird.');
    }

    // Check if user is already in session
    const isAlreadyParticipant = sessionData.participants.some(p => p.userId === userId);
    if (isAlreadyParticipant) {
      throw new Error('Sie sind bereits in dieser Session');
    }

    // If session is locked, handle bellQueue/deniedUsers logic
    if (sessionData.isLocked) {
      const isDenied = sessionData.deniedUsers.includes(userId);
      const isQueued = sessionData.bellQueue.some(u => u.userId === userId);
      if (!isDenied && !isQueued) {
        await updateDoc(doc(db, 'collaboration_sessions', sessionId), {
          bellQueue: [
            ...sessionData.bellQueue,
            { userId, displayName, requestedAt: Timestamp.fromDate(new Date()) }
          ],
          lastActivity: serverTimestamp()
        });
      }
      if (isDenied) {
        return { status: 'queued', sessionId, denied: true };
      }
      return { status: 'queued', sessionId, denied: false };
    }

    // Add user to session (unlocked or approved)
    const updatedParticipants = [
      ...sessionData.participants,
      {
        userId,
        displayName,
        joinedAt: Timestamp.fromDate(new Date())
      }
    ];

    const newCurrentParticipants = updatedParticipants.length; // Use actual count

    await updateDoc(doc(db, 'collaboration_sessions', sessionId), {
      participants: updatedParticipants,
      currentParticipants: newCurrentParticipants,
      lastActivity: serverTimestamp()
    });

    return {
      id: sessionId,
      ...sessionData,
      participants: updatedParticipants,
      currentParticipants: newCurrentParticipants
    };
  },

  // Leave a collaboration session
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      return; // Session already deleted
    }

    const sessionData = sessionDoc.data() as CollaborationSession;
    
    // Send user left notification before leaving
    this.sendRealtimeUpdate(sessionId, {
      type: 'user_left',
      userId,
      timestamp: Date.now()
    });
    
    // If owner is leaving, terminate the session and provide refund
    if (sessionData.ownerId === userId) {
      // Calculate refund based on session duration and usage
      const sessionDuration = Date.now() - (sessionData.createdAt?.toMillis?.() || sessionData.createdAt || Date.now());
      const sessionDurationMinutes = sessionDuration / (1000 * 60);
      
      // Calculate total cost and potential refund
      const totalTokens = userService.calculateCollaborationCost(sessionData.maxParticipants);
      const refundAmount = userService.calculateCollaborationRefund(
        sessionDurationMinutes, 
        totalTokens
      );
      
      if (refundAmount > 0) {
        await userService.addTokens(
          userId, 
          refundAmount, 
          `Collaboration session refund (${sessionDurationMinutes.toFixed(1)}min, ${sessionData.currentParticipants} participants)`
        );
        console.log(`Refunded ${refundAmount} tokens to session owner for early termination (session duration: ${sessionDurationMinutes.toFixed(1)} minutes)`);
      }
      
      // Always delete the session from Firestore when ended
      await deleteDoc(sessionRef);
      // Clean up all related data
      await this.cleanupSessionData(sessionId);
      return;
    }
    
    const updatedParticipants = sessionData.participants.filter(p => p.userId !== userId);
    const newCurrentParticipants = updatedParticipants.length; // Use actual count

    // Only update the session, don't delete it
    // Sessions should only end when the host leaves
    await updateDoc(sessionRef, {
      participants: updatedParticipants,
      currentParticipants: newCurrentParticipants,
      lastActivity: serverTimestamp()
    });
  },

  // Get session by ID
  async getSession(sessionId: string): Promise<CollaborationSession | null> {
    const sessionDoc = await getDoc(doc(db, 'collaboration_sessions', sessionId));
    if (sessionDoc.exists()) {
      return {
        id: sessionDoc.id,
        ...sessionDoc.data()
      } as CollaborationSession;
    }
    return null;
  },

  // Get session by PIN
  async getSessionByPin(pin: string): Promise<CollaborationSession | null> {
    const sessionsRef = collection(db, 'collaboration_sessions');
    const q = query(sessionsRef, where('pin', '==', pin), where('isActive', '==', true));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const sessionDoc = querySnapshot.docs[0];
    return {
      id: sessionDoc.id,
      ...sessionDoc.data()
    } as CollaborationSession;
  },

  // Listen to session changes (participants, session status, etc.)
  onSessionChange(sessionId: string, callback: (session: CollaborationSession | null) => void): () => void {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    
    const unsubscribe = onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const session = {
          id: doc.id,
          ...doc.data(),
          // Ensure new fields are present
          isLocked: doc.data().isLocked ?? false,
          bellQueue: doc.data().bellQueue ?? [],
          deniedUsers: doc.data().deniedUsers ?? []
        } as CollaborationSession;
        callback(session);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  },

  // Listen for real-time updates (admin_joined, etc.)
  onRealtimeUpdate(sessionId: string, callback: (event: any) => void) {
    if (!sessionId) return () => {};
    const eventsRef = collection(db, 'collaboration_sessions', sessionId, 'events');
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          callback(change.doc.data());
        }
      });
    });
    return unsubscribe;
  },

  // Firestore methods for real-time collaboration
  activeListeners: new Map<string, () => void>(),

  // Connect to real-time updates for a session
  connectToRealtimeUpdates(sessionId: string, userId: string, displayName: string, callbacks: RealtimeCallbacks): () => void {
    // Clean up any existing listener for this session
    this.disconnectFromRealtimeUpdates(sessionId);

    const updatesRef = collection(db, 'collaboration_updates');
    const sessionQuery = query(updatesRef, where('sessionId', '==', sessionId));
    
    // Test connection by writing a test message
    const testUpdate = {
      sessionId,
      userId,
      displayName,
      type: 'connection_test' as const,
      timestamp: serverTimestamp()
    };

    addDoc(updatesRef, testUpdate).then(() => {
      callbacks.onConnectionChange?.(true);
      console.log('Firestore connected successfully');
    }).catch((error) => {
      console.error('Firestore connection failed:', error);
      callbacks.onConnectionChange?.(false);
      callbacks.onError?.(error.message);
    });
    
    const unsubscribe = onSnapshot(sessionQuery, (snapshot) => {
      console.log('Received real-time update from Firestore:', snapshot.docs.length, 'updates');
      
      // Sort documents by timestamp (newest first) on the client side
      const sortedDocs = snapshot.docs.sort((a, b) => {
        const aTime = a.data().timestamp?.toMillis?.() || a.data().timestamp || 0;
        const bTime = b.data().timestamp?.toMillis?.() || b.data().timestamp || 0;
        return bTime - aTime;
      });
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const update = change.doc.data() as RealtimeUpdate;
          if (update.type !== 'connection_test') {
            console.log('Processing update:', update);
            this.handleRealtimeUpdate(update, callbacks);
          } else {
            console.log('Ignoring test message:', update);
          }
        }
      });
    }, (error) => {
      console.error('Firestore error:', error);
      callbacks.onConnectionChange?.(false);
      callbacks.onError?.(error.message);
    });

    // Store the unsubscribe function
    this.activeListeners.set(sessionId, unsubscribe);

    // Send user joined notification after a short delay to ensure connection is established
    setTimeout(() => {
      console.log('Sending user joined notification...');
      this.sendRealtimeUpdate(sessionId, {
        type: 'user_joined',
        userId,
        displayName,
        timestamp: Date.now()
      });
    }, 1000);

    return unsubscribe;
  },

  // Disconnect from real-time updates
  disconnectFromRealtimeUpdates(sessionId: string): void {
    const unsubscribe = this.activeListeners.get(sessionId);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(sessionId);
    }
  },

  // Send real-time update
  sendRealtimeUpdate(sessionId: string, update: Omit<RealtimeUpdate, 'sessionId'>): void {
    console.log('Sending real-time update:', update.type, 'for session:', sessionId);
    const updatesRef = collection(db, 'collaboration_updates');
    
    addDoc(updatesRef, {
      ...update,
      sessionId,
      timestamp: serverTimestamp()
    }).then(() => {
      console.log('Real-time update sent successfully');
    }).catch(error => {
      console.error('Error sending real-time update:', error);
    });
  },

  // Handle incoming real-time updates
  handleRealtimeUpdate(update: RealtimeUpdate, callbacks: RealtimeCallbacks): void {
    switch (update.type) {
      case 'element_update':
        if (update.elements) {
          callbacks.onElementUpdate?.(update.elements, update.userId);
        }
        break;
      
      case 'element_add':
        if (update.elements) {
          callbacks.onElementUpdate?.(update.elements, update.userId);
        }
        break;
      
      case 'element_delete':
        if (update.elements) {
          callbacks.onElementUpdate?.(update.elements, update.userId);
        }
        break;
      
      case 'element_reorder':
        if (update.elements) {
          callbacks.onElementUpdate?.(update.elements, update.userId);
        }
        break;
      
      case 'user_joined':
        if (update.displayName) {
          callbacks.onUserJoined?.(update.userId, update.displayName);
        }
        break;
      
      case 'user_left':
        callbacks.onUserLeft?.(update.userId);
        break;
      
      case 'free_trial_ended':
        if (callbacks.onFreeTrialEnded) {
          callbacks.onFreeTrialEnded(update.userId);
        }
        break;
    }
  },

  // Send element updates
  sendElementUpdate(sessionId: string, userId: string, elements: any[]): void {
    this.sendRealtimeUpdate(sessionId, {
      type: 'element_update',
      userId,
      elements,
      timestamp: Date.now()
    });
  },

  sendElementAdd(sessionId: string, userId: string, elements: any[]): void {
    this.sendRealtimeUpdate(sessionId, {
      type: 'element_add',
      userId,
      elements,
      timestamp: Date.now()
    });
  },

  sendElementDelete(sessionId: string, userId: string, elements: any[]): void {
    this.sendRealtimeUpdate(sessionId, {
      type: 'element_delete',
      userId,
      elements,
      timestamp: Date.now()
    });
  },

  sendElementReorder(sessionId: string, userId: string, elements: any[]): void {
    this.sendRealtimeUpdate(sessionId, {
      type: 'element_reorder',
      userId,
      elements,
      timestamp: Date.now()
    });
  },

  // Clean up session data when session ends
  async cleanupSessionData(sessionId: string): Promise<void> {
    const updatesRef = collection(db, 'collaboration_updates');
    const sessionQuery = query(updatesRef, where('sessionId', '==', sessionId));
    const snapshot = await getDocs(sessionQuery);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    console.log(`Cleaned up Firestore data for session: ${sessionId}`);
  },

  // Terminate session completely (for admin or emergency cleanup)
  async terminateSession(sessionId: string): Promise<void> {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'collaboration_sessions', sessionId));
      // Clean up Realtime Database data
      await this.cleanupSessionData(sessionId);
      console.log(`Terminated session: ${sessionId}`);
    } catch (error) {
      console.error(`Error terminating session ${sessionId}:`, error);
    }
  },

  // Test Firestore connection
  async testConnection(): Promise<boolean> {
    try {
      const testRef = collection(db, 'connection_test');
      const testDoc = await addDoc(testRef, {
        timestamp: serverTimestamp(),
        test: true
      });
      await deleteDoc(testDoc);
      console.log('Firestore connection test successful');
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return false;
    }
  },

  // Cleanup inactive sessions (run periodically)
  async cleanupInactiveSessions(): Promise<void> {
    const sessionsRef = collection(db, 'collaboration_sessions');
    const q = query(sessionsRef, where('isActive', '==', true));
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const doc of querySnapshot.docs) {
      const sessionData = doc.data();
      const lastActivity = sessionData.lastActivity?.toDate?.() || new Date(sessionData.lastActivity);
      
      if (now.getTime() - lastActivity.getTime() > inactiveThreshold) {
        await deleteDoc(doc.ref);
        // Also cleanup realtime data
        await this.cleanupSessionData(doc.id);
      }
    }
  },

  /**
   * Lock the session (owner only, free)
   */
  async lockSession(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const session = sessionDoc.data() as CollaborationSession;
    if (session.ownerId !== userId) throw new Error('Only the owner can lock the session');
    if (session.isLocked) return; // Already locked
    await updateDoc(sessionRef, { isLocked: true, lastActivity: serverTimestamp() });
  },

  /**
   * Unlock the session (owner only, costs 1 token)
   * Returns true if successful, false if not enough tokens
   */
  async unlockSession(sessionId: string, userId: string): Promise<boolean> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const session = sessionDoc.data() as CollaborationSession;
    if (session.ownerId !== userId) throw new Error('Only the owner can unlock the session');
    if (!session.isLocked) return true; // Already unlocked
    // Deduct 1 token from owner
    const success = await userService.deductTokens(userId, 1, 'Session unlock', session.websiteId, sessionId);
    if (!success) return false;
    await updateDoc(sessionRef, { isLocked: false, lastActivity: serverTimestamp() });
    // Auto-admit all users in bellQueue
    await this.autoAdmitBellQueue(sessionId);
    return true;
  },

  /**
   * Approve a user from the bellQueue (host only)
   * Moves user from bellQueue to participants
   */
  async approveQueuedUser(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const session = sessionDoc.data() as CollaborationSession;
    // Remove from bellQueue
    const userEntry = session.bellQueue.find(u => u.userId === userId);
    if (!userEntry) throw new Error('User not in bellQueue');
    const newBellQueue = session.bellQueue.filter(u => u.userId !== userId);
    // Add to participants
    const updatedParticipants = [
      ...session.participants,
      {
        userId: userEntry.userId,
        displayName: userEntry.displayName,
        joinedAt: Timestamp.fromDate(new Date())
      }
    ];
    await updateDoc(sessionRef, {
      bellQueue: newBellQueue,
      participants: updatedParticipants,
      currentParticipants: updatedParticipants.length,
      lastActivity: serverTimestamp()
    });
  },

  /**
   * Deny a user from the bellQueue (host only)
   * Moves user from bellQueue to deniedUsers
   */
  async denyQueuedUser(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const session = sessionDoc.data() as CollaborationSession;
    // Remove from bellQueue
    const userEntry = session.bellQueue.find(u => u.userId === userId);
    if (!userEntry) throw new Error('User not in bellQueue');
    const newBellQueue = session.bellQueue.filter(u => u.userId !== userId);
    // Add to deniedUsers
    const newDeniedUsers = [...session.deniedUsers, userId];
    await updateDoc(sessionRef, {
      bellQueue: newBellQueue,
      deniedUsers: newDeniedUsers,
      lastActivity: serverTimestamp()
    });
  },

  /**
   * Defer a user from the bellQueue (host only)
   * Leaves user in bellQueue, no changes needed
   */
  async deferQueuedUser(sessionId: string, userId: string): Promise<void> {
    // No-op, but could update lastActivity
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    await updateDoc(sessionRef, { lastActivity: serverTimestamp() });
  },

  /**
   * Remove users from bellQueue who have been waiting too long
   */
  async cleanupBellQueueTimeouts(sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) return;
    const session = sessionDoc.data() as CollaborationSession;
    const now = Date.now();
    const newBellQueue = session.bellQueue.filter(u => {
      const requestedAt = u.requestedAt?.toMillis?.() || (u.requestedAt?.seconds ? u.requestedAt.seconds * 1000 : Date.now());
      return now - requestedAt < QUEUE_TIMEOUT_MS;
    });
    if (newBellQueue.length !== session.bellQueue.length) {
      await updateDoc(sessionRef, {
        bellQueue: newBellQueue,
        lastActivity: serverTimestamp()
      });
    }
  },

  /**
   * Auto-admit all users in bellQueue (when session is unlocked)
   * Moves all users from bellQueue to participants in order, clears bellQueue
   */
  async autoAdmitBellQueue(sessionId: string): Promise<void> {
    // Clean up timed-out users first
    await this.cleanupBellQueueTimeouts(sessionId);
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const session = sessionDoc.data() as CollaborationSession;
    if (!session.bellQueue.length) return;
    // Only admit users not in deniedUsers
    const toAdmit = session.bellQueue.filter(u => !session.deniedUsers.includes(u.userId));
    const newParticipants = [
      ...session.participants,
      ...toAdmit.map(u => ({
        userId: u.userId,
        displayName: u.displayName,
        joinedAt: Timestamp.fromDate(new Date())
      }))
    ];
    await updateDoc(sessionRef, {
      participants: newParticipants,
      currentParticipants: newParticipants.length,
      // Remove all users who were in the bellQueue (admitted or denied)
      bellQueue: [],
      lastActivity: serverTimestamp()
    });
  },

  // Admin join session (bypass all restrictions, add as special participant, send admin_joined event)
  async adminJoinSession(sessionId: string, adminId: string, displayName: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Session not found');
    const session = sessionDoc.data() as CollaborationSession;
    // Check if admin is already a participant
    const isAlready = session.participants.some(p => p.userId === adminId);
    if (!isAlready) {
      const updatedParticipants = [
        ...session.participants,
        { userId: adminId, displayName, joinedAt: Timestamp.fromDate(new Date()), role: 'admin' }
      ];
      await updateDoc(sessionRef, {
        participants: updatedParticipants,
        currentParticipants: updatedParticipants.length,
        lastActivity: serverTimestamp()
      });
    }
    // Send admin_joined event
    this.sendRealtimeUpdate(sessionId, {
      type: 'admin_joined',
      userId: adminId,
      displayName,
      timestamp: Date.now()
    });
  },

  // Kick a participant from a session (host only)
  async kickParticipant(sessionId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'collaboration_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) return;
    const sessionData = sessionDoc.data() as CollaborationSession;
    // Prevent kicking admin
    const participant = sessionData.participants.find(p => p.userId === userId);
    if (participant && participant.role === 'admin') return;
    // Remove the participant
    const updatedParticipants = sessionData.participants.filter(p => p.userId !== userId);
    const newCurrentParticipants = updatedParticipants.length;
    await updateDoc(sessionRef, {
      participants: updatedParticipants,
      currentParticipants: newCurrentParticipants,
      lastActivity: serverTimestamp()
    });
    // Send user_left notification
    this.sendRealtimeUpdate(sessionId, {
      type: 'user_left',
      userId,
      timestamp: Date.now()
    });
  }
}; 