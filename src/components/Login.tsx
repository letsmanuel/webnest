import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { Chrome, Mail, Lock, ArrowLeft } from 'lucide-react';

export const Login = ({ onBack }: { onBack?: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await authService.signUpWithEmail(email, password);
        toast({ title: t('accountCreated'), description: t('welcomeToWebnest') });
      } else {
        await authService.signInWithEmail(email, password);
        toast({ title: t('signedIn'), description: t('niceToSeeYou') });
      }
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('authError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      toast({ title: t('signedIn'), description: t('welcomeToWebnest') });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('googleSignInError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4 relative">
      <div className="absolute inset-0 bg-black/20"></div>
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      
      <Card className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('webnest')}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isSignUp ? t('createAccount') : t('signInAccount')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder={t('emailAddress')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? t('loading') : (isSignUp ? t('register') : t('signIn'))}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">{t('or')}</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleAuth}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {t('signInWithGoogle')}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isSignUp 
                ? t('alreadyHaveAccount')
                : t('noAccountYet')
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
