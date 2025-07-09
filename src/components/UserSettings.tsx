import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { userService } from '@/services/userService';
import { TokenHistory } from './TokenHistory';
import { ArrowLeft, Coins, User, Globe, Moon, TrendingUp, TrendingDown, History } from 'lucide-react';

interface UserSettingsProps {
  onBack: () => void;
}

export const UserSettings = ({ onBack }: UserSettingsProps) => {
  const { profile, updateProfile, referralClaimCount } = useUserProfile();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [showTokenHistory, setShowTokenHistory] = useState(false);

  const handleLanguageChange = async (language: 'de' | 'en') => {
    setSaving(true);
    try {
      await updateProfile({ language });
      toast({ title: t('languageChanged'), description: t('settingsSaved') });
    } catch (error) {
      toast({ title: t('error'), description: t('languageChangeError'), variant: "destructive" });
    } finally {
      setSaving(false);
      window.location.reload();
    }
  };

  const handleDarkModeToggle = async (darkMode: boolean) => {
    setSaving(true);
    try {
      await updateProfile({ darkMode });
      // Apply dark mode to body
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      toast({ title: t('darkModeChanged'), description: t('settingsSaved') });
    } catch (error) {
      toast({ title: t('error'), description: t('darkModeError'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">{t('loadingProfile')}</div>;
  }

  if (showTokenHistory) {
    return <TokenHistory onBack={() => setShowTokenHistory(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button onClick={onBack} variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{t('userSettings')}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Token Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Coins className="mr-2 h-5 w-5 text-yellow-500" />
                {t('tokenStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">
                  {profile.tokens}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('availableTokens')}</p>
                
                {/* Token Statistics */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <div className="flex items-center justify-center text-green-600 dark:text-green-400">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span className="font-medium">{profile.totalTokensEarned || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Earned</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <div className="flex items-center justify-center text-red-600 dark:text-red-400">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      <span className="font-medium">{profile.totalTokensSpent || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Spent</p>
                  </div>
                </div>

                {/* Token Costs */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">Token Kosten:</h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Website erstellen:</span>
                      <span className="font-medium">{userService.TOKEN_COSTS.WEBSITE_CREATION} Tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custom Path:</span>
                      <span className="font-medium">{userService.TOKEN_COSTS.CUSTOM_PATH} Tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kollaboration (2 Personen):</span>
                      <span className="font-medium">{userService.TOKEN_COSTS.COLLABORATION_BASE} Tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ pro zusätzliche Person:</span>
                      <span className="font-medium">{userService.TOKEN_COSTS.COLLABORATION_PER_PARTICIPANT} Tokens</span>
                    </div>
                  </div>
                </div>

                {/* Refund Information */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-300">Rückerstattungen:</h4>
                  <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Website löschen (&lt;24h):</span>
                      <span className="font-medium">100% Rückerstattung</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Website löschen (&lt;7 Tage):</span>
                      <span className="font-medium">50% Rückerstattung</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kollaboration &lt;5min:</span>
                      <span className="font-medium">75% Rückerstattung</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kollaboration &lt;15min:</span>
                      <span className="font-medium">50% Rückerstattung</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kollaboration &lt;30min:</span>
                      <span className="font-medium">25% Rückerstattung</span>
                    </div>
                  </div>
                </div>

                {/* Referral Link */}
                <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-300">Referral Link:</h4>
                  <div className="flex items-center gap-2">
                    <Input value={window.location.origin + '/refferal/' + profile.uid} readOnly className="flex-1" />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/refferal/' + profile.uid);
                        toast({ title: 'Referral link copied!' });
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-semibold">
                    Total uses: {referralClaimCount}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Share this link to give users 1 token and earn 2 tokens for each new user! <br/>
                    <span className="text-xs text-gray-500">
                      <b>Note:</b> That extra token will not be deducted from your account.
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                {t('profile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('email')}</Label>
                <Input value={profile.email} disabled />
              </div>
              <div>
                <Label>{t('name')}</Label>
                <Input value={profile.displayName || ''} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                {t('language')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={profile.language} 
                onValueChange={handleLanguageChange}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">{t('german')}</SelectItem>
                  <SelectItem value="en">{t('english')}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Dark Mode Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Moon className="mr-2 h-5 w-5" />
                {t('appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">{t('darkMode')}</Label>
                <Switch
                  id="dark-mode"
                  checked={profile.darkMode}
                  onCheckedChange={handleDarkModeToggle}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
