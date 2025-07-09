import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collaborationService } from '@/services/collaborationService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, AlertCircle } from 'lucide-react';

interface JoinSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionJoin: (sessionId: string, denied: boolean) => void;
}

// Utility to detect incognito/private mode (best effort, not 100% reliable)
function useIncognitoWarning() {
  const [isIncognito, setIsIncognito] = useState(false);
  useEffect(() => {
    // Try to detect incognito mode using FileSystem API (works in Chrome/Edge)
    const detect = async () => {
      let incognito = false;
      if ((window as any).webkitRequestFileSystem) {
        (window as any).webkitRequestFileSystem(
          (window as any).TEMPORARY, 100,
          () => setIsIncognito(false),
          () => setIsIncognito(true)
        );
      } else if (navigator.storage && navigator.storage.estimate) {
        // Firefox/modern browsers: quota is lower in private mode
        navigator.storage.estimate().then(estimate => {
          if (estimate.quota && estimate.quota < 120000000) {
            setIsIncognito(true);
          }
        });
      }
    };
    detect();
  }, []);
  return isIncognito;
}

export const JoinSessionDialog = ({ isOpen, onClose, onSessionJoin }: JoinSessionDialogProps) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const isIncognito = useIncognitoWarning();

  const handleJoinSession = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await collaborationService.joinSession(
        pin, 
        user.uid, 
        user.displayName || user.email || 'Anonymous'
      );
      if ('status' in result && result.status === 'queued') {
        if (result.denied) {
          toast({
            title: "Warteschlange (erneuter Versuch)",
            description: "Du wurdest zuvor abgelehnt. Der Host muss dich explizit über die Glocke zulassen.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Warteschlange",
            description: "Die Session ist gesperrt. Du wirst zugelassen, sobald der Host dich bestätigt.",
          });
        }
        onSessionJoin(result.sessionId, result.denied === true);
        handleClose();
        return;
      }
      // Only access session.pin and session.id if result is a CollaborationSession
      const session = result as any;
      if (session && session.pin && session.id) {
        toast({
          title: "Session beigetreten!",
          description: `Sie sind der Session ${session.pin} beigetreten`,
        });
        onSessionJoin(session.id, false);
        handleClose();
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

  const handleClose = () => {
    setPin('');
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Entwicklungssession beitreten
          </DialogTitle>
          <DialogDescription>
            Geben Sie die 6-stellige PIN ein, um einer Kollaborationssession beizutreten
          </DialogDescription>
        </DialogHeader>

        {isIncognito && (
          <div className="bg-red-100 border border-red-400 text-red-800 rounded p-2 mb-2 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>
              Sie befinden sich im privaten/Inkognito-Modus. Die Kollaborationsfunktion funktioniert in privaten Tabs meist nicht zuverlässig!
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="sessionPin">Session PIN</Label>
            <Input
              id="sessionPin"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="6-stellige PIN eingeben"
              maxLength={6}
              className="text-center text-lg font-mono tracking-widest"
            />
          </div>

          <div className="text-xs text-gray-600">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Wenn die Session voll ist, werden Sie benachrichtigt sobald ein Platz frei wird.
          </div>

          <Button 
            onClick={handleJoinSession} 
            disabled={loading || pin.length !== 6}
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
      </DialogContent>
    </Dialog>
  );
}; 