import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft } from 'lucide-react';

export const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-red-600">Zahlung abgebrochen</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Die Zahlung wurde abgebrochen. Keine Tokens wurden abgebucht.
          </p>
          <p className="text-sm text-gray-500">
            Du kannst jederzeit erneut versuchen, Tokens zu kaufen.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="w-full"
            >
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 