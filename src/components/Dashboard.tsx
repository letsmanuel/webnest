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
import { Plus, Edit, Eye, Trash2, LogOut, Globe, FileText, Settings, Coins, Users, Loader2, AlertTriangle, LayoutGrid } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { WebsiteBuilder } from './WebsiteBuilder';
import { UserSettings } from './UserSettings';
import { JoinSessionDialog } from './JoinSessionDialog';
import { CollaborativeWebsiteBuilder } from './CollaborativeWebsiteBuilder';
import { useLanguage } from '@/hooks/useLanguage';
import { PaymentDialog } from './PaymentDialog';
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import './dashboard-delete-animation.css';

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
  const [deletingWebsite, setDeletingWebsite] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Website | null>(null);

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

  const openDeleteDialog = (website: Website) => {
    setDeleteTarget(website);
    setShowDeleteDialog(true);
  };

  const handleDeleteWebsite = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingWebsite(true);
      setShowDeleteDialog(false);
      await websiteService.deleteWebsite(deleteTarget.id!);
      setWebsites(websites.filter(w => w.id !== deleteTarget.id));
      refreshProfile();
      toast({ title: t('deleted'), description: t('websiteDeleted') });
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('deleteError'),
        variant: "destructive"
      });
    } finally {
      setDeletingWebsite(false);
      setDeleteTarget(null);
    }
  };

  // Accept htmlContent and elementsJson from TemplateSelector
  const handleCreateFromTemplate = async (templateId: string, projectName: string, htmlContent?: string, elementsJson?: string) => {
    if (!user || !profile) return;

    if (profile.tokens < userService.TOKEN_COSTS.WEBSITE_CREATION) {
      setShowPayment(true);
      return;
    }

    try {
      setCreatingWebsite(true);
      console.log('Creating website with template:', templateId, 'for user:', user.uid);
      
      // If htmlContent is provided (AI or custom), use it, otherwise generate from templateId
      const finalHtmlContent = htmlContent || websiteService.generateTemplateHTML(templateId);
      // If elementsJson is provided (AI), use it, otherwise leave undefined
      const websiteId = await websiteService.createWebsite({
        name: projectName,
        userId: user.uid,
        htmlContent: finalHtmlContent,
        elementsJson: elementsJson || "",
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
      refreshProfile();
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
      {/* Modern Loading Overlay for Website Creation or Deletion */}
      {(creatingWebsite || deletingWebsite) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center dashboard-animated-bg backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 p-10 bg-white/90 rounded-2xl shadow-2xl border border-blue-200 animate-fade-in">
            {deletingWebsite && (
              <div className="relative flex flex-col items-center mb-2 h-32 w-32">
                {/* Document deletion animation */}
                <div className="delete-doc-anim absolute left-1/2 -translate-x-1/2 top-0">
                  <svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="8" width="40" height="48" rx="6" fill="#e0e7ef" stroke="#3b82f6" strokeWidth="2"/>
                    <rect x="12" y="20" width="24" height="4" rx="2" fill="#3b82f6" opacity="0.2"/>
                    <rect x="12" y="30" width="24" height="4" rx="2" fill="#3b82f6" opacity="0.2"/>
                    <rect x="12" y="40" width="16" height="4" rx="2" fill="#3b82f6" opacity="0.2"/>
                  </svg>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-10">
                  <Trash2 className="h-12 w-12 text-blue-600 drop-shadow-lg" />
                </div>
              </div>
            )}
            {creatingWebsite && (
              <div className="relative flex flex-col items-center mb-2 h-32 w-32">
                {/* Document creation animation */}
                <svg className="create-doc-anim" width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="8" width="40" height="48" rx="6" fill="#e0e7ef" stroke="#3b82f6" strokeWidth="2"/>
                  <rect className="create-doc-line" x="12" y="20" width="24" height="4" rx="2" fill="#3b82f6" opacity="0.2"/>
                  <rect className="create-doc-line" x="12" y="30" width="24" height="4" rx="2" fill="#3b82f6" opacity="0.2"/>
                  <rect className="create-doc-line" x="12" y="40" width="16" height="4" rx="2" fill="#3b82f6" opacity="0.2"/>
                </svg>
              </div>
            )}
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-800 tracking-tight">
              {creatingWebsite ? 'Website wird erstellt...' : 'Website wird gelöscht...'}
            </div>
            <div className="text-blue-600 text-sm">Bitte warte einen Moment.</div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6 text-red-500" /> Website löschen
            </DialogTitle>
            <DialogDescription className="text-gray-700 mt-2">
              Bist du sicher, dass du die Website <span className="font-semibold text-blue-700">{deleteTarget?.name}</span> löschen möchtest?<br />
              Du erhältst eine zeitbasierte Rückerstattung der verwendeten Tokens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-6">
            <button
              className="flex-1 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold transition"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deletingWebsite}
            >Abbrechen</button>
            <button
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition"
              onClick={handleDeleteWebsite}
              disabled={deletingWebsite}
            >
              <Trash2 className="h-5 w-5" />
              Löschen
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <div className="relative group flex flex-col items-center">
                <div
                  className="flex items-center bg-yellow-100 px-3 py-2 rounded-full cursor-pointer hover:bg-yellow-200 transition-colors"
                  onClick={() => window.location.href = "/afk"}
                >
                  <Coins className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-800">{profile.tokens} Tokens</span>
                </div>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg z-50 whitespace-nowrap">
                  Click to earn free tokens
                </div>
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
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg px-6 py-3 rounded-full shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <LayoutGrid className="h-5 w-5 mr-2" />
            Projekt starten
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
                      onClick={() => openDeleteDialog(website)}
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
            <Button variant="outline" type="button" onClick={() => setRenameDialogOpen(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
