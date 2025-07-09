import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { websiteService, Website } from '@/services/websiteService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CollaborationDialog } from '@/components/CollaborationDialog';
import { CollaborativeWebsiteBuilder } from '@/components/CollaborativeWebsiteBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Coins } from 'lucide-react';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';

export const Collaborate = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const navigate = useNavigate();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  const [collaborativeSession, setCollaborativeSession] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadWebsite();
    }
  }, [websiteId, user]);

  const loadWebsite = async () => {
    if (!websiteId || !user) {
      navigate('/');
      return;
    }

    try {
      const websiteData = await websiteService.getWebsite(websiteId);
      if (!websiteData) {
        toast({
          title: "Website nicht gefunden",
          description: "Die angeforderte Website existiert nicht",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Check if user owns the website (only required for starting sessions)
      // Joining sessions via PIN is handled separately
      const userIsOwner = websiteData.userId === user.uid;
      setIsOwner(userIsOwner);
      
      console.log('Collaboration Debug:', {
        websiteUserId: websiteData.userId,
        currentUserId: user.uid,
        userIsOwner: userIsOwner
      });
      
      if (!userIsOwner) {
        // Allow access but show a note that they can only join sessions
        console.log('User does not own website, but can join sessions via PIN');
      }

      setWebsite(websiteData);
    } catch (error) {
      console.error('Error loading website:', error);
      toast({
        title: "Fehler",
        description: "Website konnte nicht geladen werden",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionStart = (sessionId: string) => {
    setCollaborativeSession(sessionId);
  };

  const handleSessionEnd = () => {
    setCollaborativeSession(null);
    setShowCollaborationDialog(false);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{!user ? 'Lade Benutzer...' : 'Lade Website...'}</p>
        </div>
      </div>
    );
  }

  if (collaborativeSession && website) {
    return (
      <CollaborativeWebsiteBuilder
        website={website}
        sessionId={collaborativeSession}
        onSave={() => {
          setCollaborativeSession(null);
          loadWebsite(); // Refresh website data
        }}
        onBack={handleSessionEnd}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Website nicht gefunden</p>
          <Button onClick={handleBack} className="mt-4">
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button onClick={handleBack} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kollaboration für "{website.name}"
          </h1>
          <p className="text-gray-600">
            {isOwner 
              ? "Starten Sie eine Kollaborationssession, um mit anderen an dieser Website zu arbeiten"
              : "Sie können an dieser Website teilnehmen, wenn Sie eine Session-PIN haben"
            }
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {isOwner ? (
            <Card className="bg-white/80 shadow-xl border-0 backdrop-blur-md">
              <CardHeader className="flex flex-col items-center gap-2 pb-0">
                <Users className="h-8 w-8 text-blue-600 mb-1" />
                <CardTitle className="text-2xl font-bold text-blue-900">Kollaborationssession starten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 pt-2">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col items-center">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-blue-400" />Wie funktioniert Kollaboration?</h3>
                    <ul className="text-sm text-blue-800 space-y-2 w-full pl-4 list-disc">
                      <li>Starten Sie eine Session mit 2-20 Teilnehmern</li>
                      <li>Erhalten Sie eine 6-stellige PIN</li>
                      <li>Teilen Sie die PIN mit Ihren Kollegen</li>
                      <li>Bearbeiten Sie die Website in Echtzeit zusammen</li>
                      <li>Alle Änderungen werden automatisch synchronisiert</li>
                    </ul>
                  </div>
                  <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex flex-col items-center">
                    <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2"><Coins className="h-5 w-5 text-yellow-500" />Token-Kosten</h3>
                    <ul className="text-sm text-yellow-800 space-y-2 w-full pl-4 list-disc">
                      <li>2 Teilnehmer: <span className="font-bold">20 Tokens</span></li>
                      <li>3 Teilnehmer: <span className="font-bold">30 Tokens</span></li>
                      <li>4 Teilnehmer: <span className="font-bold">40 Tokens</span></li>
                      <li>5 Teilnehmer: <span className="font-bold">50 Tokens</span></li>
                      <li>5+ Teilnehmer: <span className="font-bold">Custom Pricing</span></li>
                      <li>Tokens werden pro Session abgezogen und teilweise erstattet</li>
                    </ul>
                  </div>
                </div>
                {/* Refund info box */}
                <div className="mt-6 w-full bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-green-600" />Teilweise Rückerstattung bei kurzer Session
                  </h3>
                  <ul className="text-sm text-green-800 space-y-1 w-full max-w-lg text-center">
                    <li><span className="font-bold">75% Rückerstattung</span> bei Beenden unter 5 Minuten</li>
                    <li><span className="font-bold">50% Rückerstattung</span> bei Beenden unter 10 Minuten</li>
                    <li><span className="font-bold">10% Rückerstattung</span> bei Beenden unter 30 Minuten</li>
                    <li>Keine Rückerstattung bei längeren Sessions. Rückerstattung nicht fix.</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => setShowCollaborationDialog(true)}
                  className="w-full mt-6 text-lg font-bold py-3 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white shadow-lg rounded-xl"
                  size="lg"
                >
                  Kollaborationssession starten
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Session beitreten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Wie trete ich einer Session bei?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Bitten Sie den Website-Besitzer um die Session-PIN</li>
                    <li>• Gehen Sie zu Ihrem Dashboard</li>
                    <li>• Klicken Sie auf "Entwicklungssession beitreten"</li>
                    <li>• Geben Sie die 6-stellige PIN ein</li>
                    <li>• Sie können dann an der Website mitarbeiten</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Hinweis</h3>
                  <p className="text-sm text-gray-700">
                    Sie können nur an Kollaborationssessions teilnehmen, wenn Sie eine gültige PIN haben. 
                    Nur der Website-Besitzer kann neue Sessions starten.
                  </p>
                </div>

                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-600 hover:bg-gray-700"
                  size="lg"
                >
                  Zum Dashboard zurückkehren
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Collaboration Dialog */}
        <CollaborationDialog
          isOpen={showCollaborationDialog}
          onClose={() => setShowCollaborationDialog(false)}
          websiteId={website.id!}
          onSessionStart={handleSessionStart}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}; 