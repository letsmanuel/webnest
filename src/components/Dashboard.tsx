import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/services/authService';
import { websiteService, Website } from '@/services/websiteService';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Eye, Trash2, LogOut, Globe, FileText, Settings, Coins } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { WebsiteBuilder } from './WebsiteBuilder';
import { UserSettings } from './UserSettings';

export const Dashboard = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const { user } = useAuth();
  const { profile, refreshProfile } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    loadWebsites();
  }, [user]);

  const loadWebsites = async () => {
    if (!user) return;
    
    try {
      console.log('Loading websites for user:', user.uid);
      const userWebsites = await websiteService.getUserWebsites(user.uid);
      console.log('Loaded websites:', userWebsites);
      setWebsites(userWebsites);
    } catch (error) {
      console.error('Error loading websites:', error);
      toast({
        title: "Fehler",
        description: "Websites konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast({ title: "Abgemeldet", description: "Bis zum nächsten Mal!" });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Abmeldung fehlgeschlagen",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    if (!confirm('Website wirklich löschen? Du erhältst 50% der verwendeten Tokens zurück.')) return;
    
    try {
      await websiteService.deleteWebsite(id);
      setWebsites(websites.filter(w => w.id !== id));
      refreshProfile(); // Refresh to show updated tokens
      toast({ title: "Gelöscht", description: "Website wurde erfolgreich gelöscht und Tokens erstattet" });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Website konnte nicht gelöscht werden",
        variant: "destructive"
      });
    }
  };

  const handleCreateFromTemplate = async (templateId: string, projectName: string) => {
    if (!user || !profile) return;

    if (profile.tokens < 2) {
      toast({
        title: "Nicht genügend Tokens",
        description: "Du benötigst 2 Tokens um eine neue Website zu erstellen",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating website with template:', templateId, 'for user:', user.uid);
      
      const htmlContent = websiteService.generateTemplateHTML(templateId);
      
      const websiteId = await websiteService.createWebsite({
        name: projectName,
        userId: user.uid,
        htmlContent,
        isPublished: false
      });
      
      console.log('Created website with ID:', websiteId);
      
      setShowTemplates(false);
      await loadWebsites();
      refreshProfile(); // Refresh to show updated tokens
      toast({ title: "Projekt erstellt!", description: `${projectName} wurde erfolgreich erstellt` });
    } catch (error) {
      console.error('Error creating website:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Projekt konnte nicht erstellt werden",
        variant: "destructive"
      });
    }
  };

  const handleCreateBlankWebsite = async () => {
    if (!user || !profile) return;

    if (profile.tokens < 2) {
      toast({
        title: "Nicht genügend Tokens",
        description: "Du benötigst 2 Tokens um eine neue Website zu erstellen",
        variant: "destructive"
      });
      return;
    }

    try {
      const projectName = `Neue Website ${new Date().toLocaleDateString('de-DE')}`;
      console.log('Creating blank website for user:', user.uid);
      
      const websiteId = await websiteService.createWebsite({
        name: projectName,
        userId: user.uid,
        htmlContent: '',
        isPublished: false
      });
      
      console.log('Created blank website with ID:', websiteId);
      
      await loadWebsites();
      refreshProfile(); // Refresh to show updated tokens
      toast({ title: "Leere Website erstellt!", description: `${projectName} wurde erfolgreich erstellt` });
    } catch (error) {
      console.error('Error creating blank website:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Leere Website konnte nicht erstellt werden",
        variant: "destructive"
      });
    }
  };

  if (showSettings) {
    return <UserSettings onBack={() => setShowSettings(false)} />;
  }

  if (editingWebsite) {
    return (
      <WebsiteBuilder 
        website={editingWebsite}
        onSave={() => {
          setEditingWebsite(null);
          loadWebsites();
        }}
        onBack={() => setEditingWebsite(null)}
      />
    );
  }

  if (showTemplates) {
    return (
      <TemplateSelector
        onSelectTemplate={handleCreateFromTemplate}
        onBack={() => setShowTemplates(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Webnest Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Hallo {user?.displayName || user?.email}!</p>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="flex items-center bg-yellow-100 px-3 py-2 rounded-full">
                <Coins className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">{profile.tokens} Tokens</span>
              </div>
            )}
            <Button onClick={() => setShowSettings(true)} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Einstellungen
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>

        <div className="mb-6 flex gap-3">
          <Button 
            onClick={() => setShowTemplates(true)}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            disabled={!profile || profile.tokens < 2}
          >
            <Plus className="mr-2 h-4 w-4" />
            Mit Template erstellen (2 Tokens)
          </Button>
          <Button 
            onClick={handleCreateBlankWebsite}
            variant="outline"
            className="border-2"
            disabled={!profile || profile.tokens < 2}
          >
            <FileText className="mr-2 h-4 w-4" />
            Leere Website erstellen (2 Tokens)
          </Button>
        </div>

        {loading ? (
          <div className="text-center">Lade Websites...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website) => (
              <Card key={website.id} className="bg-white/70 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{website.name}</CardTitle>
                      <CardDescription>
                        Erstellt am {new Date(website.createdAt).toLocaleDateString('de-DE')}
                      </CardDescription>
                    </div>
                    <Badge variant={website.isPublished ? "default" : "secondary"}>
                      {website.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => setEditingWebsite(website)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Bearbeiten
                    </Button>
                    
                    {website.isPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/view/${website.id}`, '_blank')}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Ansehen
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteWebsite(website.id!)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {websites.length === 0 && !loading && (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Websites</h3>
            <p className="text-gray-500 mb-4">Erstelle deine erste Website mit unseren Templates oder starte mit einer leeren Seite!</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowTemplates(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Mit Template erstellen
              </Button>
              <Button onClick={handleCreateBlankWebsite} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Leere Website erstellen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
