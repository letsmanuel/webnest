import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [tokensGranted, setTokensGranted] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || !user) {
      setLoading(false);
      return;
    }
    // Call backend to fetch session details and grant tokens
    const grantTokens = async () => {
      try {
        const res = await fetch(`/api/fetch-stripe-session?session_id=${sessionId}`);
        if (!res.ok) throw new Error('Fehler beim Abrufen der Zahlungsdaten');
        const data = await res.json();
        const tokens = parseInt(data.tokens, 10);
        if (!tokens || tokens <= 0) throw new Error('Ungültige Token-Anzahl');
        await userService.addTokens(user.uid, tokens, 'Stripe payment');
        setTokensGranted(true);
        toast({
          title: 'Zahlung erfolgreich!',
          description: 'Deine Tokens wurden zu deinem Konto hinzugefügt.',
        });
      } catch (e: any) {
        setError(e.message);
        toast({
          title: 'Fehler',
          description: e.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    grantTokens();
  }, [searchParams, toast, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verarbeite Zahlung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-600">Zahlung erfolgreich!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : tokensGranted ? (
            <>
              <p className="text-gray-600 dark:text-gray-400">
                Vielen Dank für deinen Kauf! Deine Tokens wurden erfolgreich zu deinem Konto hinzugefügt.
              </p>
              <p className="text-sm text-gray-500">
                Du kannst jetzt Websites erstellen und alle Features von Webnest nutzen.
              </p>
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Zahlung wurde verarbeitet.</p>
          )}
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}; 