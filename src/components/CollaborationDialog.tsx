import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { collaborationService, CollaborationSession } from '@/services/collaborationService';
import { userService } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Users, Copy, CheckCircle, AlertCircle, Loader2, Coins } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CollaborationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  onSessionStart: (sessionId: string) => void;
  isOwner?: boolean;
}

export const CollaborationDialog = ({ isOpen, onClose, websiteId, onSessionStart, isOwner = true }: CollaborationDialogProps) => {
  const [mode, setMode] = useState<'start' | 'join'>(isOwner ? 'start' : 'join');
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [showSlotSlider, setShowSlotSlider] = useState(false);
  const [pinType, setPinType] = useState<'standard' | 'numbers' | 'emojis'>('standard');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pin, setPin] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTokenError, setShowTokenError] = useState(false);
  
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();

  const totalTokens = userService.calculateCollaborationCost(maxParticipants);

  const handleStartSession = async () => {
    if (!user || !profile) return;

    const hasFreeTrial = profile.hasUsedFreeCollabTrial === false;
    if (!hasFreeTrial && profile.tokens < totalTokens) {
      toast({
        title: "Nicht genügend Tokens",
        description: `Sie benötigen ${totalTokens} Tokens für diese Session`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const sessionId = await collaborationService.createSession(websiteId, user.uid, maxParticipants, pinType as any);
      const session = await collaborationService.getSession(sessionId);
      if (session) {
        setSession(session);
        setPin(session.pin);
        toast({
          title: "Session gestartet!",
          description: `Kollaborationssession mit PIN ${session.pin} erstellt`,
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Session konnte nicht erstellt werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await collaborationService.joinSession(sessionPin, user.uid, user.displayName || user.email || 'Anonymous');
      if ('id' in result) {
        setSession(result);
        toast({
          title: "Session beigetreten!",
          description: `Sie sind der Session ${result.pin} beigetreten`,
        });
        onSessionStart(result.id);
      } else {
        // Handle queued/denied state if needed
        toast({
          title: result.denied ? "Zugang verweigert" : "Warteschlange",
          description: result.denied ? "Du wurdest von dieser Session abgelehnt." : "Du bist in der Warteschlange. Warte auf Freigabe.",
          variant: result.denied ? "destructive" : undefined
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Session konnte nicht beigetreten werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPin = async () => {
    if (pin) {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "PIN kopiert!",
        description: "PIN wurde in die Zwischenablage kopiert",
      });
    }
  };

  const handleClose = () => {
    setMode(isOwner ? 'start' : 'join');
    setPin('');
    setSessionPin('');
    setSession(null);
    setCopied(false);
    onClose();
  };

  const hasFreeTrial = profile && profile.hasUsedFreeCollabTrial === false;
  const notEnoughTokens = profile && !hasFreeTrial && profile.tokens < totalTokens;
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kollaboration
          </DialogTitle>
          <DialogDescription>
            {isOwner 
              ? "Erstellen Sie eine Kollaborationssession oder treten Sie einer bestehenden bei"
              : "Treten Sie einer bestehenden Kollaborationssession bei"
            }
          </DialogDescription>
        </DialogHeader>

        {!session ? (
          <div className="space-y-4">
            {/* Mode Selection - only show if user is owner */}
            {isOwner && (
              <div className="flex gap-2">
                <Button
                  variant={mode === 'start' ? 'default' : 'outline'}
                  onClick={() => setMode('start')}
                  className="flex-1"
                >
                  Session starten
                </Button>
                <Button
                  variant={mode === 'join' ? 'default' : 'outline'}
                  onClick={() => setMode('join')}
                  className="flex-1"
                >
                  Session beitreten
                </Button>
              </div>
            )}

            {mode === 'start' ? (
              <div className="flex flex-col items-center gap-6 p-2">
                <Card className="w-full max-w-md shadow-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="flex flex-col items-center gap-6 py-8">
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-6 w-6 text-blue-600" />
                        <span className="text-lg font-bold text-blue-900">Kollaborationssession starten</span>
                      </div>
                      <div className="w-full">
                        <Label htmlFor="maxParticipants" className="block mb-1 text-blue-800">Anzahl der Slots</Label>
                        <Select value={showSlotSlider ? '5+' : maxParticipants.toString()} onValueChange={(value) => {
                          if (value === '5+') {
                            setShowSlotSlider(true);
                            setMaxParticipants(6);
                          } else {
                            setShowSlotSlider(false);
                            setMaxParticipants(parseInt(value));
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Slots (20 Tokens)</SelectItem>
                            <SelectItem value="3">3 Slots (30 Tokens)</SelectItem>
                            <SelectItem value="4">4 Slots (40 Tokens)</SelectItem>
                            <SelectItem value="5">5 Slots (50 Tokens)</SelectItem>
                            <SelectItem value="5+">5+ Slots</SelectItem>
                          </SelectContent>
                        </Select>
                        {showSlotSlider && (
                          <div className="mt-4">
                            <Slider
                              min={6}
                              max={20}
                              step={1}
                              value={[maxParticipants]}
                              onValueChange={([v]) => setMaxParticipants(v)}
                            />
                            <div className="text-xs text-gray-600 mt-2 text-center">{maxParticipants} Slots ausgewählt</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <span className="text-sm text-blue-800">Token-Kosten</span>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={totalTokens + (profile && profile.hasUsedFreeCollabTrial === false ? '-free' : '')}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.3 }}
                          className="mb-1"
                        >
                          <div className={`flex items-center gap-2 text-4xl font-extrabold ${profile && profile.hasUsedFreeCollabTrial === false ? 'text-green-600' : 'text-blue-700'} drop-shadow-lg`}
                          >
                            <Coins className="h-8 w-8" />
                            {profile && profile.hasUsedFreeCollabTrial === false ? '0' : totalTokens}
                            <span className="text-lg font-bold align-super ml-1">Tokens</span>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-xs text-gray-700 text-center">
                        {profile && profile.hasUsedFreeCollabTrial === false
                          ? 'Deine erste Session ist 15 Minuten gratis.'
                          : maxParticipants > 5
                            ? 'Ab 5 Slots: Jeder weitere Slot kostet +5 Tokens.'
                            : '2 Slots = 20 Tokens, 3 = 30, 4 = 40, 5 = 50.'}
                      </div>
                    </div>
                    <div className="w-full mt-2 mb-2 relative">
                      <motion.button
                        type="button"
                        className="absolute top-0 right-0 text-gray-400 hover:text-blue-600 p-1 h-7 w-7 bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 flex items-center justify-center transition-colors"
                        onClick={() => setShowAdvanced((v) => !v)}
                        aria-label="Erweiterte Einstellungen"
                        tabIndex={0}
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <span className="sr-only">Erweiterte Einstellungen anzeigen</span>
                        <motion.svg
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                          animate={{ rotate: showAdvanced ? 90 : 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          style={{ display: 'block' }}
                        >
                          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
                          <circle cx="10" cy="10" r="2" fill="currentColor" />
                        </motion.svg>
                      </motion.button>
                      <AnimatePresence initial={false}>
                        {showAdvanced && (
                          <motion.div
                            key="advanced-settings"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            className="mt-2 p-3 rounded-lg border bg-gray-50 overflow-hidden"
                          >
                            <Label className="block mb-1 text-blue-800">PIN-Typ</Label>
                            <RadioGroup value={pinType} onValueChange={v => setPinType(v as 'standard' | 'numbers' | 'emojis')} className="flex flex-row gap-4">
                              <RadioGroupItem value="standard" id="pin-standard" />
                              <Label htmlFor="pin-standard" className="mr-4 cursor-pointer">Standard</Label>
                              <RadioGroupItem value="numbers" id="pin-numbers" />
                              <Label htmlFor="pin-numbers" className="mr-4 cursor-pointer">Nur Zahlen</Label>
                              <RadioGroupItem value="emojis" id="pin-emojis" />
                              <Label htmlFor="pin-emojis" className="cursor-pointer">Emojis</Label>
                            </RadioGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <Button 
                      onClick={handleStartSession} 
                      disabled={loading || !profile || (!hasFreeTrial && profile.tokens < totalTokens)}
                      className="w-full mt-2 text-lg font-bold py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white shadow-lg rounded-xl"
                      onMouseEnter={() => setShowTokenError(true)}
                      onMouseLeave={() => setShowTokenError(false)}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Session wird erstellt...
                        </>
                      ) : (
                        'Session starten'
                      )}
                    </Button>
                    {notEnoughTokens && showTokenError && (
                      <div className="text-red-600 text-sm mt-2 text-center">
                        Du hast nicht genügend Tokens für diese Session. Bitte kaufe mehr Tokens oder nutze deine kostenlose Testphase, falls verfügbar.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sessionPin">Session PIN</Label>
                  <Input
                    id="sessionPin"
                    value={sessionPin}
                    onChange={(e) => setSessionPin(e.target.value.toUpperCase())}
                    placeholder="6-stellige PIN eingeben"
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>

                <Button 
                  onClick={handleJoinSession} 
                  disabled={loading || sessionPin.length !== 6}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Beitreten...
                    </>
                  ) : (
                    'Session beitreten'
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Session aktiv
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PIN:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-1 rounded border font-mono text-lg tracking-widest">
                        {pin}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyPin}
                        className="h-8 w-8 p-0"
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Teilnehmer:</span>
                    <Badge variant="outline">
                      {session.currentParticipants}/{session.maxParticipants}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600">
                    Teilnehmer können sich mit dieser PIN über ihr Dashboard der Session anschließen
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={() => onSessionStart(session.id)} className="flex-1">
                Editor öffnen
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Schließen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 