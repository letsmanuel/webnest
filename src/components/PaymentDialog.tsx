import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Coins } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

const PACKAGES = [
  { id: '20', label: 'Mini Paket', tokensLabel: '20 Tokens', price: '3.50', tokens: 20 },
  { id: '50', label: 'Kleines Paket', tokensLabel: '50 Tokens', price: '8.00', tokens: 50 },
  { id: '100', label: 'Großes Paket', tokensLabel: '100 Tokens', price: '15.00', tokens: 100 },
  { id: '300', label: 'Riesiges Paket', tokensLabel: '300 Tokens', price: '30.00', tokens: 300 },
  { id: '1000', label: 'Mega Paket', tokensLabel: '1000 Tokens', price: '80.00', tokens: 1000 },
];

export function PaymentDialog({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess?: (tokens: number) => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleBuy = async (packageId: string) => {
    setLoading(packageId);
    setError(null);
    try {
      if (!user) throw new Error('Nicht eingeloggt');
      const pkg = PACKAGES.find(p => p.id === packageId);
      if (!pkg) throw new Error('Ungültiges Paket');

      // Call backend to create Stripe Checkout Session
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          packageLabel: pkg.label,
          tokensLabel: pkg.tokensLabel,
          tokens: pkg.tokens,
          price: pkg.price
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Stripe Fehler');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      toast({
        title: 'Fehler',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl p-8 bg-gradient-to-br from-yellow-50 to-blue-50 shadow-xl border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-yellow-700">
            <Coins className="inline-block mr-2 text-yellow-500 animate-bounce" />
            Tokens kaufen
          </DialogTitle>
          <DialogDescription className="text-base text-gray-700 mt-2">
            Unterstütze die Weiterentwicklung von Webnest und schalte neue Features frei!<br/>
            Wähle ein Paket und bezahle sicher mit PayPal oder Kreditkarte. Die Tokens werden sofort gutgeschrieben.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PACKAGES.slice(0, 2).map(pkg => (
              <div key={pkg.id} className="relative rounded-xl border-2 p-5 flex flex-col items-center bg-white shadow-sm transition-transform hover:scale-105 border-blue-400">
                <span className="absolute -top-3 right-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow">{pkg.label}</span>
                <div className="text-xl font-semibold text-gray-800 mb-1">{pkg.tokensLabel}</div>
                <div className="text-lg font-bold text-blue-700 mb-2">{pkg.price}€</div>
                <Button
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold py-2 rounded-lg shadow hover:from-yellow-500 hover:to-yellow-700 transition-colors"
                  onClick={() => handleBuy(pkg.id)}
                  disabled={!!loading}
                >
                  Jetzt kaufen
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.slice(2).map(pkg => (
              <div key={pkg.id} className="relative rounded-xl border-2 p-5 flex flex-col items-center bg-white shadow-sm transition-transform hover:scale-105 border-blue-400">
                <span className="absolute -top-3 right-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow">{pkg.label}</span>
                <div className="text-xl font-semibold text-gray-800 mb-1">{pkg.tokensLabel}</div>
                <div className="text-lg font-bold text-blue-700 mb-2">{pkg.price}€</div>
                <Button
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold py-2 rounded-lg shadow hover:from-yellow-500 hover:to-yellow-700 transition-colors"
                  onClick={() => handleBuy(pkg.id)}
                  disabled={!!loading}
                >
                  Jetzt kaufen
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-6">
          Deine Zahlung wird sicher über Stripe abgewickelt.<br/>
          Bei Fragen oder Problemen schreibe uns gerne an <a href="mailto:support@webnest.app" className="underline text-blue-600">support@webnest.app</a>.
        </div>
        {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
      </DialogContent>
    </Dialog>
  );
} 