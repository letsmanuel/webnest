import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/services/authService';
import { websiteService, Website } from '@/services/websiteService';
import { collaborationService } from '@/services/collaborationService';
import { userService } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Eye, Trash2, LogOut, Globe, FileText, Settings, Coins, Users, Loader2 } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { WebsiteBuilder } from './WebsiteBuilder';
import { UserSettings } from './UserSettings';
import { JoinSessionDialog } from './JoinSessionDialog';
import { CollaborativeWebsiteBuilder } from './CollaborativeWebsiteBuilder';
import { useLanguage } from '@/hooks/useLanguage';
import { PaymentDialog } from './PaymentDialog';
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const ADMIN_EMAILS = ['luap.palu@gmail.com', 'letsmanuel.service@gmail.com'];

export const Dashboard = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [showJoinSession, setShowJoinSession] = useState(false);
  const [collaborativeSession, setCollaborativeSession] = useState<{ website: any, sessionId: string, denied?: boolean } | null>(null);
  const { user } = useAuth();
  const { profile, refreshProfile } = useUserProfile();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Website | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [creatingWebsite, setCreatingWebsite] = useState(false);

  useEffect(() => {
    loadWebsites();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    userService.getUnreadReferralNotifications(user.uid).then((notifications) => {
      notifications.forEach((n: any) => {
        toast({
          title: 'Referral Claimed!',
          description: n.message,
          variant: 'default',
        });
      });
    });
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
        title: t('error'),
        description: t('websiteLoadError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast({ title: t('loggedOut'), description: t('seeYouLater') });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('logoutError'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    if (!confirm('Website wirklich löschen? Du erhältst eine zeitbasierte Rückerstattung der verwendeten Tokens.')) return;
    
    try {
      await websiteService.deleteWebsite(id);
      setWebsites(websites.filter(w => w.id !== id));
      refreshProfile(); // Refresh to show updated tokens
      toast({ title: t('deleted'), description: t('websiteDeleted') });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('deleteError'),
        variant: "destructive"
      });
    }
  };

  const handleCreateFromTemplate = async (templateId: string, projectName: string) => {
    if (!user || !profile) return;

    if (profile.tokens < userService.TOKEN_COSTS.WEBSITE_CREATION) {
      setShowPayment(true);
      return;
    }

    try {
      setCreatingWebsite(true);
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
        title: t('error'),
        description: error instanceof Error ? error.message : t('projectCreateError'),
        variant: "destructive"
      });
    } finally {
      setCreatingWebsite(false);
    }
  };

  const handleCreateBlankWebsite = async () => {
    if (!user || !profile) return;

    if (profile.tokens < userService.TOKEN_COSTS.WEBSITE_CREATION) {
      setShowPayment(true);
      return;
    }

    try {
      setCreatingWebsite(true);
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
        title: t('error'),
        description: error instanceof Error ? error.message : t('blankWebsiteError'),
        variant: "destructive"
      });
    } finally {
      setCreatingWebsite(false);
    }
  };

  const handleJoinSession = async (sessionId: string, denied: boolean) => {
    try {
      // Get the session to find the associated website
      const session = await collaborationService.getSession(sessionId);
      if (session) {
        const website = await websiteService.getWebsite(session.websiteId);
        if (website) {
          setCollaborativeSession({ website, sessionId, denied });
        } else {
          toast({
            title: t('error'),
            description: t('sessionWebsiteError'),
            variant: "destructive"
          });
        }
      } else {
        // User is queued for a locked session, show waiting editor
        setCollaborativeSession({ website: { id: '', name: 'Wartend...', htmlContent: '', createdAt: '', isPublished: false }, sessionId, denied });
      }
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        title: t('error'),
        description: t('sessionLoadError'),
        variant: "destructive"
      });
    }
  };

  const openRenameDialog = (website: Website) => {
    setRenameTarget(website);
    setRenameValue(website.name);
    setRenameDialogOpen(true);
  };

  const handleRenameWebsite = async () => {
    if (!user || !profile || !renameTarget) return;
    if (profile.tokens < 1) {
      toast({
        title: t('error'),
        description: t('notEnoughTokens'),
        variant: 'destructive',
      });
      return;
    }
    if (!renameValue || renameValue.trim() === '' || renameValue === renameTarget.name) return;
    setRenameLoading(true);
    try {
      await websiteService.updateWebsite(renameTarget.id, { name: renameValue });
      await userService.deductTokens(user.uid, 1, 'Website rename', renameTarget.id);
      toast({
        title: t('saved'),
        description: 'Website wurde umbenannt! (1 Token abgezogen)',
      });
      setRenameDialogOpen(false);
      setRenameTarget(null);
      setRenameValue('');
      await loadWebsites();
      refreshProfile();
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Fehler beim Umbenennen der Website.',
        variant: 'destructive',
      });
    } finally {
      setRenameLoading(false);
    }
  };

  if (showSettings) {
    return <UserSettings onBack={() => setShowSettings(false)} />;
  }

  if (collaborativeSession) {
    return (
      <CollaborativeWebsiteBuilder
        website={collaborativeSession.website}
        sessionId={collaborativeSession.sessionId}
        denied={collaborativeSession.denied}
        onSave={() => {
          setCollaborativeSession(null);
          loadWebsites();
        }}
        onBack={() => setCollaborativeSession(null)}
        onSessionEnd={() => setCollaborativeSession(null)}
      />
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Loading Overlay */}
      {creatingWebsite && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-40">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded shadow-lg">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            <div className="text-lg font-semibold text-blue-700">Website wird erstellt...</div>
          </div>
        </div>
      )}
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('dashboardTitle')}
            </h1>
            <p className="text-gray-600 mt-2">{t('hello')} {user?.displayName || user?.email}!</p>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div 
                className="flex items-center bg-yellow-100 px-3 py-2 rounded-full cursor-pointer hover:bg-yellow-200 transition-colors"
                onClick={() => setShowPayment(true)}
              >
                <Coins className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">{profile.tokens} Tokens</span>
              </div>
            )}
            <Button onClick={() => setShowSettings(true)} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              {t('settings')}
            </Button>
            {/* Admin Panel Button for Admins */}
            {user && ADMIN_EMAILS.includes(user.email || '') && (
              <Button onClick={() => window.open('/admin', '_blank')} variant="outline" className="border-blue-400 text-blue-700">
                Admin Panel
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              {t('logout')}
            </Button>
          </div>
        </div>

        <div className="flex justify-end p-4">
          <Link to="/marketplace">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" /> Marktplatz
            </Button>
          </Link>
        </div>

        <div className="mb-6 flex gap-3">
          <Button 
            onClick={() => setShowTemplates(true)}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            disabled={!profile || profile.tokens < userService.TOKEN_COSTS.WEBSITE_CREATION}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('createWithTemplate')} ({userService.TOKEN_COSTS.WEBSITE_CREATION} Tokens)
          </Button>
          <Button 
            onClick={handleCreateBlankWebsite}
            variant="outline"
            className="border-2"
            disabled={!profile || profile.tokens < userService.TOKEN_COSTS.WEBSITE_CREATION}
          >
            <FileText className="mr-2 h-4 w-4" />
            {t('createBlank')} ({userService.TOKEN_COSTS.WEBSITE_CREATION} Tokens)
          </Button>
          <Button 
            onClick={() => setShowJoinSession(true)}
            variant="outline"
            className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Users className="mr-2 h-4 w-4" />
            {t('joinSession')}
          </Button>
        </div>

        {loading ? (
          <div className="text-center">{t('loadingWebsites')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website) => (
              <Card key={website.id} className="bg-white dark:bg-gray-900 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-foreground">{website.name}</CardTitle>
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
                      {t('edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRenameDialog(website)}
                      disabled={!profile || profile.tokens < 1}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      {t('rename')}
                    </Button>
                    
                    {website.isPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/view/${website.id}`, '_blank')}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        {t('view')}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noWebsites')}</h3>
            <p className="text-gray-500 mb-4">{t('createFirst')}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowTemplates(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('createWithTemplate')}
              </Button>
              <Button onClick={handleCreateBlankWebsite} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                {t('createBlank')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Join Session Dialog */}
      <JoinSessionDialog
        isOpen={showJoinSession}
        onClose={() => setShowJoinSession(false)}
        onSessionJoin={(sessionId) => handleJoinSession(sessionId, false)}
      />
      
      {/* Payment Dialog */}
      <PaymentDialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={(tokens) => {
          refreshProfile();
          toast({
            title: 'Tokens hinzugefügt!',
            description: `${tokens} Tokens wurden erfolgreich gekauft.`,
          });
        }}
      />

      {/* Rename Website Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rename')}</DialogTitle>
            <DialogDescription>{t('enterNewWebsiteName')}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            placeholder={t('enterNewWebsiteName')}
            disabled={renameLoading}
            autoFocus
            className="mt-2"
          />
          <div className="text-xs text-gray-500 mt-2 mb-1">(1 Token)</div>
          <DialogFooter>
            <Button
              onClick={handleRenameWebsite}
              disabled={renameLoading || !renameValue || renameValue.trim() === '' || (renameTarget && renameValue === renameTarget.name)}
            >
              {t('rename')}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {t('cancel')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
