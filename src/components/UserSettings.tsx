
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Coins, User, Globe, Moon } from 'lucide-react';

interface UserSettingsProps {
  onBack: () => void;
}

export const UserSettings = ({ onBack }: UserSettingsProps) => {
  const { profile, updateProfile } = useUserProfile();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleLanguageChange = async (language: 'de' | 'en') => {
    setSaving(true);
    try {
      await updateProfile({ language });
      toast({ title: "Sprache geändert", description: "Einstellungen wurden gespeichert" });
    } catch (error) {
      toast({ title: "Fehler", description: "Sprache konnte nicht geändert werden", variant: "destructive" });
    } finally {
      setSaving(false);
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
      toast({ title: "Dark Mode geändert", description: "Einstellungen wurden gespeichert" });
    } catch (error) {
      toast({ title: "Fehler", description: "Dark Mode konnte nicht geändert werden", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">Lade Profil...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button onClick={onBack} variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Benutzereinstellungen</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Token Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Coins className="mr-2 h-5 w-5 text-yellow-500" />
                Token Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">
                  {profile.tokens}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Verfügbare Tokens</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Neue Website: 2 Tokens</p>
                  <p>• Custom Path: 5 Tokens</p>
                  <p>• Veröffentlichen: Kostenlos</p>
                  <p>• Löschen: 1 Token zurück</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>E-Mail</Label>
                <Input value={profile.email} disabled />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={profile.displayName || ''} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Sprache
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
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Dark Mode Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Moon className="mr-2 h-5 w-5" />
                Darstellung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Dark Mode</Label>
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
