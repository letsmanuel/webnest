import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, doc, updateDoc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { userService } from '@/services/userService';
// Add imports for icons
import { Globe, Users as UsersIcon, Link as LinkIcon, LogOut, ArrowLeft, Search, Trash2, Edit, Eye, Coins, XCircle } from 'lucide-react';

const ADMIN_EMAILS = ['luap.palu@gmail.com', 'letsmanuel.service@gmail.com'];
const BATCH_SIZE = 100;

const AdminPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'websites' | 'users' | 'userdns' | 'marketplace' | 'collabs'>('websites');
  // Websites state
  const [websites, setWebsites] = useState<any[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [previewMap, setPreviewMap] = useState<{ [id: string]: string | null }>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userWebsiteCounts, setUserWebsiteCounts] = useState<{ [userId: string]: number }>({});
  // Add state for showing user websites modal
  const [userWebsitesModal, setUserWebsitesModal] = useState<{ user: any; websites: any[] } | null>(null);
  const [userWebsitesLoading, setUserWebsitesLoading] = useState(false);
  // UserDNS state
  const [dnsTab, setDnsTab] = useState<any[]>([]);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [deletingDnsId, setDeletingDnsId] = useState<string | null>(null);
  // Marketplace state
  const [marketplaceTab, setMarketplaceTab] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceUserFilter, setMarketplaceUserFilter] = useState<string | null>(null);
  const [marketplaceUserArticles, setMarketplaceUserArticles] = useState<any[]>([]);
  // Notification state
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);
  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), message }]);
  };
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const [websiteDnsMap, setWebsiteDnsMap] = useState<{ [websiteId: string]: string[] }>({});
  const [websiteMarketplaceMap, setWebsiteMarketplaceMap] = useState<{ [websiteId: string]: boolean }>({});
  const [expandedWebsites, setExpandedWebsites] = useState<{ [websiteId: string]: boolean }>({});
  const [tokenDialogUser, setTokenDialogUser] = useState<any>(null);
  const [tokenAction, setTokenAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  // Add state for search
  const [websiteSearch, setWebsiteSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dnsSearch, setDnsSearch] = useState('');
  // Collabs state
  const [collabs, setCollabs] = useState<any[]>([]);
  const [collabsLoading, setCollabsLoading] = useState(false);
  const [collabsShowActive, setCollabsShowActive] = useState(true);

  // Auth check (must not return before hooks)
  const hasAccess = user && ADMIN_EMAILS.includes(user.email || '');

  // Fetch websites in batches
  const fetchWebsites = useCallback(async (loadMore = false) => {
    setLoading(true);
    const db = getFirestore();
    let q = query(collection(db, 'websites'), orderBy('createdAt', 'desc'), limit(BATCH_SIZE));
    if (loadMore && lastDoc) {
      q = query(collection(db, 'websites'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(BATCH_SIZE));
    }
    const snap = await getDocs(q);
    const newWebsites = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    setWebsites(prev => loadMore ? [...prev, ...newWebsites] : newWebsites);
    setLastDoc(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length === BATCH_SIZE);
    setLoading(false);
  }, [lastDoc]);

  // Infinite scroll for websites (batch loading still applies, but UI is always up to date)
  useEffect(() => {
    if (tab !== 'websites' || !hasMore || loading) return;
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
        !loading && hasMore
      ) {
        fetchWebsites(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchWebsites, loading, hasMore, tab]);

  // Render preview for each website
  useEffect(() => {
    if (tab !== 'websites') return;
    websites.forEach(site => {
      if (!previewMap[site.id] && site.htmlContent) {
        // Decode base64 htmlContent
        let decodedHtml = '';
        try {
          decodedHtml = decodeURIComponent(escape(window.atob(site.htmlContent)));
        } catch (e) {
          decodedHtml = atob(site.htmlContent);
        }
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.width = '400px';
        iframe.style.height = '200px';
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            html2canvas(iframe.contentDocument!.body, { backgroundColor: null }).then(canvas => {
              setPreviewMap(prev => ({ ...prev, [site.id]: canvas.toDataURL('image/png') }));
              document.body.removeChild(iframe);
            }).catch(() => {
              setPreviewMap(prev => ({ ...prev, [site.id]: null }));
              document.body.removeChild(iframe);
            });
          }, 2000);
        };
        iframe.srcdoc = decodedHtml;
      }
    });
    // eslint-disable-next-line
  }, [websites, tab]);

  // Edit, rename, delete handlers for websites
  const handleEdit = (site: any) => {
    window.location.href = `/editor/${site.id}`;
  };
  const handleRename = async (site: any) => {
    if (!renameValue.trim()) return;
    const db = getFirestore();
    await updateDoc(doc(db, 'websites', site.id), { name: renameValue.trim() });
    setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, name: renameValue.trim() } : w));
    setRenamingId(null);
    setRenameValue('');
    addNotification(`Website "${site.name}" renamed to "${renameValue.trim()}"`);
    fetchWebsites(false); // Reload after rename
  };
  // Remove manual refreshes after deletion; UI will update automatically
  const handleDelete = async (site: any) => {
    setDeletingId(site.id);
    const db = getFirestore();
    // Delete userdns record if exists
    const dnsSnap = await getDocs(query(collection(db, 'userdns'), where('websiteId', '==', site.id)));
    await Promise.all(dnsSnap.docs.map(d => deleteDoc(doc(db, 'userdns', d.id))));
    // Delete website
    await deleteDoc(doc(db, 'websites', site.id));
    setDeletingId(null);
    addNotification(`Website "${site.name}" and its DNS records deleted`);
    fetchWebsites(false); // Reload after delete
  };

  // Realtime users listener
  useEffect(() => {
    if (tab !== 'users') return;
    setUsersLoading(true);
    const db = getFirestore();
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const userList = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setUsers(userList);
      setUsersLoading(false);
      // Fetch website counts for each user
      const counts: { [userId: string]: number } = {};
      userList.forEach(async (u) => {
        const q = query(collection(db, 'websites'), where('userId', '==', u.id));
        const wsnap = await getDocs(q);
        counts[u.id] = wsnap.size;
        setUserWebsiteCounts(c => ({ ...c, [u.id]: wsnap.size }));
      });
    });
    return () => unsub();
  }, [tab]);

  // Delete all websites for a user
  const handleDeleteAllWebsites = async (userId: string) => {
    setDeletingUserId(userId);
    const db = getFirestore();
    const q = query(collection(db, 'websites'), where('userId', '==', userId));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      // Delete userdns record if exists
      const dnsSnap = await getDocs(query(collection(db, 'userdns'), where('websiteId', '==', docSnap.id)));
      await Promise.all(dnsSnap.docs.map(d => deleteDoc(doc(db, 'userdns', d.id))));
      await deleteDoc(doc(db, 'websites', docSnap.id));
      addNotification(`Website "${docSnap.data().name || docSnap.id}" and its DNS records deleted`);
    }
    setDeletingUserId(null);
  };

  // Realtime userdns listener
  useEffect(() => {
    if (tab !== 'userdns') return;
    setDnsLoading(true);
    const db = getFirestore();
    const unsub = onSnapshot(collection(db, 'userdns'), (snap) => {
      setDnsTab(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      setDnsLoading(false);
    });
    return () => unsub();
  }, [tab]);

  // Fetch userdns records
  const fetchUserDns = useCallback(async () => {
    setDnsLoading(true);
    const db = getFirestore();
    const snap = await getDocs(collection(db, 'userdns'));
    setDnsTab(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    setDnsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'userdns') fetchUserDns();
    // eslint-disable-next-line
  }, [tab]);

  // Delete userdns record
  const handleDeleteDns = async (dnsId: string) => {
    setDeletingDnsId(dnsId);
    const db = getFirestore();
    await deleteDoc(doc(db, 'userdns', dnsId));
    setDnsTab(prev => prev.filter(d => d.id !== dnsId));
    setDeletingDnsId(null);
    addNotification(`DNS record "${dnsId}" deleted`);
  };

  // Fetch DNS and marketplace info for all websites
  useEffect(() => {
    if (tab !== 'websites' || websites.length === 0) return;
    const db = getFirestore();
    // Fetch all userdns records
    getDocs(collection(db, 'userdns')).then((snap) => {
      const dnsMap: { [websiteId: string]: string[] } = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.websiteId) {
          if (!dnsMap[data.websiteId]) dnsMap[data.websiteId] = [];
          dnsMap[data.websiteId].push(doc.id);
        }
      });
      setWebsiteDnsMap(dnsMap);
    });
    // Fetch all marketplace records
    getDocs(collection(db, 'marketplace')).then((snap) => {
      const mpMap: { [websiteId: string]: boolean } = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.websiteId) mpMap[data.websiteId] = true;
      });
      setWebsiteMarketplaceMap(mpMap);
    });
  }, [tab, websites]);

  useEffect(() => {
    if (tab === 'websites') fetchWebsites(false);
    // eslint-disable-next-line
  }, [tab]);

  // Fetch all marketplace articles for the Marketplace tab
  useEffect(() => {
    if (tab !== 'marketplace') return;
    setMarketplaceLoading(true);
    const db = getFirestore();
    getDocs(collection(db, 'marketplace')).then(snap => {
      setMarketplaceTab(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMarketplaceLoading(false);
    });
  }, [tab]);
  // Fetch all marketplace articles for a user
  const handleShowUserArticles = async (userId: string) => {
    setMarketplaceUserFilter(userId);
    setMarketplaceLoading(true);
    const db = getFirestore();
    const snap = await getDocs(query(collection(db, 'marketplace'), where('authorId', '==', userId)));
    setMarketplaceUserArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setMarketplaceLoading(false);
  };
  const handleCloseUserArticles = () => {
    setMarketplaceUserFilter(null);
    setMarketplaceUserArticles([]);
  };
  const handleDeleteMarketplaceArticle = async (id: string) => {
    if (!window.confirm('Delete this marketplace article?')) return;
    setMarketplaceLoading(true);
    const db = getFirestore();
    await deleteDoc(doc(db, 'marketplace', id));
    setMarketplaceTab(prev => prev.filter(a => a.id !== id));
    setMarketplaceUserArticles(prev => prev.filter(a => a.id !== id));
    setMarketplaceLoading(false);
    addNotification('Marketplace article deleted');
  };

  const handleTokenAction = async () => {
    if (!tokenDialogUser || !tokenAmount || isNaN(Number(tokenAmount))) {
      setTokenError('Enter a valid number');
      return;
    }
    setTokenLoading(true);
    setTokenError('');
    const uid = tokenDialogUser.id;
    const amount = Number(tokenAmount);
    try {
      if (tokenAction === 'add') {
        await userService.addTokens(uid, amount, 'Admin panel add');
      } else if (tokenAction === 'subtract') {
        await userService.deductTokens(uid, amount, 'Admin panel subtract');
      } else if (tokenAction === 'set') {
        await userService.updateUserProfile(uid, { tokens: amount });
      }
      addNotification(`Tokens updated for ${tokenDialogUser.displayName || tokenDialogUser.email}`);
      setTokenDialogUser(null);
      setTokenAmount('');
      setTokenAction('add');
      fetchWebsites(false); // Refresh websites in case tokens are shown
    } catch (e) {
      setTokenError('Error updating tokens');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleDeleteAllUserArticles = async (userId: string) => {
    if (!window.confirm('Delete ALL marketplace articles by this user?')) return;
    setMarketplaceLoading(true);
    const db = getFirestore();
    const snap = await getDocs(query(collection(db, 'marketplace'), where('authorId', '==', userId)));
    await Promise.all(snap.docs.map(doc => deleteDoc(doc.ref)));
    setMarketplaceTab(prev => prev.filter(a => a.authorId !== userId));
    setMarketplaceUserArticles(prev => prev.filter(a => a.authorId !== userId));
    setMarketplaceLoading(false);
    addNotification('All marketplace articles by user deleted');
  };

  // Fetch and show all websites for a user in a modal
  const handleShowUserWebsites = async (user: any) => {
    setUserWebsitesLoading(true);
    setUserWebsitesModal({ user, websites: [] });
    const db = getFirestore();
    const q = query(collection(db, 'websites'), where('userId', '==', user.id));
    const snap = await getDocs(q);
    setUserWebsitesModal({ user, websites: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    setUserWebsitesLoading(false);
  };
  const handleCloseUserWebsites = () => {
    setUserWebsitesModal(null);
  };

  // Fetch collabs
  const fetchCollabs = useCallback(async () => {
    setCollabsLoading(true);
    const db = getFirestore();
    let q = query(collection(db, 'collaboration_sessions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    let sessions = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    if (collabsShowActive) sessions = sessions.filter(s => s.isActive);
    setCollabs(sessions);
    setCollabsLoading(false);
  }, [collabsShowActive]);
  useEffect(() => { if (tab === 'collabs') fetchCollabs(); }, [tab, fetchCollabs]);
  // Delete session
  const handleDeleteSession = async (session: any) => {
    setCollabsLoading(true);
    const db = getFirestore();
    await deleteDoc(doc(db, 'collaboration_sessions', session.id));
    setCollabs(prev => prev.filter(s => s.id !== session.id));
    addNotification(`Session ${session.id} deleted`);
    setCollabsLoading(false);
  };
  // Delete website+DNS+session
  const handleDeleteWebsiteAndSession = async (session: any) => {
    setCollabsLoading(true);
    const db = getFirestore();
    // Delete DNS
    const dnsSnap = await getDocs(query(collection(db, 'userdns'), where('websiteId', '==', session.websiteId)));
    await Promise.all(dnsSnap.docs.map(d => deleteDoc(doc(db, 'userdns', d.id))));
    // Delete website
    await deleteDoc(doc(db, 'websites', session.websiteId));
    // Delete session
    await deleteDoc(doc(db, 'collaboration_sessions', session.id));
    setCollabs(prev => prev.filter(s => s.id !== session.id));
    addNotification(`Website, DNS, and session for ${session.websiteId} deleted`);
    setCollabsLoading(false);
  };
  // Join as admin
  const handleAdminJoin = async (session: any) => {
    setCollabsLoading(true);
    // Call adminJoinSession
    await import('@/services/collaborationService').then(({ collaborationService }) =>
      collaborationService.adminJoinSession(session.id, user.uid, user.displayName || user.email || 'Admin')
    );
    window.open(`/collaborate/${session.websiteId}?admin=1`, '_blank');
    setCollabsLoading(false);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  if (!hasAccess) {
    return <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">Access denied.</div>;
  }

  // Redesigned header and navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur shadow flex items-center justify-between px-8 py-4 border-b">
        <div className="flex items-center gap-4">
          <Globe className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight">Admin Panel</h1>
        </div>
        <nav className="flex gap-2">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${tab === 'websites' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} onClick={() => setTab('websites')}><Globe className="h-5 w-5" />Websites</button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${tab === 'users' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} onClick={() => setTab('users')}><UsersIcon className="h-5 w-5" />Users</button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${tab === 'userdns' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} onClick={() => setTab('userdns')}><LinkIcon className="h-5 w-5" />UserDNS</button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${tab === 'marketplace' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} onClick={() => setTab('marketplace')}><Coins className="h-5 w-5" />Marketplace</button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${tab === 'collabs' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} onClick={() => setTab('collabs')}><UsersIcon className="h-5 w-5" />Collabs</button>
        </nav>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold" onClick={() => window.location.href = '/'}><ArrowLeft className="h-5 w-5" />Back to app</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold" onClick={() => { window.localStorage.clear(); window.location.href = '/'; }}><LogOut className="h-5 w-5" />Log out</button>
        </div>
      </header>
      <main className="container mx-auto py-10 px-4 max-w-7xl">
        {/* Websites Tab */}
        {tab === 'websites' && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <input type="text" className="w-full rounded-lg border px-4 py-2 pl-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Search websites by name, ID, or DNS..." value={websiteSearch} onChange={e => setWebsiteSearch(e.target.value)} />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
              {websites.filter(site => {
                const dnsPaths = websiteDnsMap[site.id] || [];
                const search = websiteSearch.toLowerCase();
                return (
                  site.name?.toLowerCase().includes(search) ||
                  site.id?.toLowerCase().includes(search) ||
                  dnsPaths.some(path => path.toLowerCase().includes(search))
                );
              }).map(site => {
                const isPublished = !!site.isPublished;
                const dnsPaths = websiteDnsMap[site.id] || [];
                const inMarketplace = !!websiteMarketplaceMap[site.id];
                const expanded = !!expandedWebsites[site.id];
                return (
                  <div key={site.id} className={`bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-3 relative transition-all duration-200 border-2 ${expanded ? 'border-blue-400' : 'border-transparent'} hover:shadow-2xl`} style={{ minHeight: 260 }}>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedWebsites(e => ({ ...e, [site.id]: !e[site.id] }))}>
                      <div className="w-28 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                        {previewMap[site.id] === undefined ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        ) : previewMap[site.id] ? (
                          <img src={previewMap[site.id]!} alt="Preview" className="object-contain max-h-16 max-w-full" />
                        ) : (
                          <span className="text-gray-400">No Preview</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold truncate text-blue-900" title={site.name}>{site.name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{isPublished ? 'Published' : 'Unpublished'}</span>
                          {dnsPaths.length > 0 && <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700" title={dnsPaths.join(', ')}>DNS: {dnsPaths.length}</span>}
                          {inMarketplace && <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">Marketplace</span>}
                        </div>
                        <div className="text-xs text-gray-500 truncate">ID: {site.id}</div>
                        <div className="text-xs text-gray-400">Created: {site.createdAt ? new Date(site.createdAt.seconds ? site.createdAt.seconds * 1000 : site.createdAt).toLocaleString() : 'Unknown'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded text-xs shadow" onClick={e => { e.stopPropagation(); window.open(`/view/${site.id}`, '_blank'); }}><Eye className="h-4 w-4" />Open</button>
                      <button className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-3 py-1 rounded text-xs shadow" onClick={e => { e.stopPropagation(); setRenamingId(site.id); setRenameValue(site.name); }}><Edit className="h-4 w-4" />Rename</button>
                      <button className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded text-xs shadow" onClick={e => { e.stopPropagation(); handleDelete(site); }} disabled={deletingId === site.id}><Trash2 className="h-4 w-4" />{deletingId === site.id ? 'Deleting...' : 'Delete'}</button>
                    </div>
                    {expanded && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border text-sm text-gray-700 animate-fade-in">
                        <div><b>Website ID:</b> {site.id}</div>
                        <div><b>Published:</b> {isPublished ? 'Yes' : 'No'}</div>
                        <div><b>Marketplace:</b> {inMarketplace ? 'Yes' : 'No'}</div>
                        <div><b>Custom DNS Path(s):</b> {dnsPaths.length > 0 ? dnsPaths.join(', ') : 'None'}</div>
                        <div><b>All Paths:</b>
                          <ul className="list-disc ml-6">
                            <li><code>/view/{site.id}</code></li>
                            {dnsPaths.map(path => <li key={path}><code>/{path}</code></li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                    {renamingId === site.id && (
                      <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          className="border rounded px-2 py-1 flex-1"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(site); }}
                        />
                        <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => handleRename(site)}>Save</button>
                        <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => setRenamingId(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {tab === 'websites' && loading && (
          <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        )}
        {tab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {users.map(u => {
              const userArticlesCount = marketplaceTab.filter(a => a.authorId === u.id).length;
              return (
                <div key={u.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative">
                  <div className="font-semibold text-blue-800 flex items-center gap-2">
                    {u.displayName || u.email || u.id}
                    <span className="text-xs text-gray-500">({userWebsiteCounts[u.id] ?? '...'} websites)</span>
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 font-bold">{typeof u.tokens === 'number' ? `${u.tokens} Tokens` : 'Tokens: ...'}</span>
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800 font-bold">{userArticlesCount} Articles</span>
                  </div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button className="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => setTokenDialogUser(u)}>Tokens</button>
                    <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => handleShowUserArticles(u.id)}>Display all articles</button>
                    {/* New button to show all websites for this user */}
                    <button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => handleShowUserWebsites(u)}>
                      Show Websites
                    </button>
                    <button className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => handleDeleteAllWebsites(u.id)} disabled={deletingUserId === u.id}>
                      {deletingUserId === u.id ? 'Deleting all websites...' : 'Delete All Websites'}
                    </button>
                    <button className="bg-red-700 hover:bg-red-800 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => handleDeleteAllUserArticles(u.id)}>
                      Delete all articles
                    </button>
                  </div>
                  {/* User's marketplace articles modal */}
                  {marketplaceUserFilter === u.id && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full text-center relative">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={handleCloseUserArticles}><XCircle className="h-6 w-6" /></button>
                        <h2 className="text-xl font-bold mb-4">Articles by {u.displayName || u.email || u.id}</h2>
                        {marketplaceLoading ? (
                          <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                        ) : marketplaceUserArticles.length === 0 ? (
                          <div className="text-gray-500">No articles found.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto pr-2">
                            {marketplaceUserArticles.map(article => (
                              <div key={article.id} className="bg-blue-50 rounded-xl shadow p-4 flex flex-col gap-2">
                                <div className="font-bold text-blue-900">{article.name}</div>
                                <div className="text-xs text-gray-500">{article.description}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {article.preview ? <img src={article.preview} alt="Preview" className="h-10 w-10 object-contain rounded" /> : <span className="text-gray-400">No Preview</span>}
                                  <span className="text-xs text-blue-700">{article.authorName || 'Unknown'}</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => window.open(`/marketplace/product/${article.websiteId}`, '_blank')}>Visit</button>
                                  <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => handleDeleteMarketplaceArticle(article.id)}><Trash2 className="h-4 w-4" />Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === 'users' && usersLoading && (
          <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        )}
        {tab === 'userdns' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dnsTab.map(dns => (
              <div key={dns.id} className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative">
                <div className="font-semibold text-blue-800">{dns.id}</div>
                <div className="text-xs text-gray-500">User: {dns.userId || 'Unknown'}</div>
                <div className="text-xs text-gray-500">Website: {dns.websiteId || 'Unknown'}</div>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded text-xs mt-2"
                  onClick={() => handleDeleteDns(dns.id)}
                  disabled={deletingDnsId === dns.id}
                >
                  {deletingDnsId === dns.id ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'userdns' && dnsLoading && (
          <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        )}
        {tab === 'marketplace' && (
          <div className="py-6">
            {marketplaceLoading ? (
              <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                {marketplaceTab.map(article => (
                  <div key={article.id} className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-3 relative">
                    <div className="flex items-center gap-3">
                      {article.preview ? (
                        <img src={article.preview} alt="Preview" className="object-contain max-h-16 max-w-24 rounded" />
                      ) : (
                        <span className="text-gray-400">No Preview</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold truncate text-blue-900" title={article.name}>{article.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{article.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {article.authorAvatar && <img src={article.authorAvatar} alt="Avatar" className="h-6 w-6 rounded-full" />}
                          <span className="text-xs text-blue-700">{article.authorName || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded text-xs shadow" onClick={() => window.open(`/marketplace/product/${article.websiteId}`, '_blank')}>Visit Article</button>
                      <button className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded text-xs shadow" onClick={() => handleDeleteMarketplaceArticle(article.id)}><Trash2 className="h-4 w-4" />Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'collabs' && (
          <main className="container mx-auto py-10 px-4 max-w-7xl">
            <div className="flex items-center gap-4 mb-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={collabsShowActive} onChange={e => setCollabsShowActive(e.target.checked)} />
                Show only active sessions
              </label>
              <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={fetchCollabs}>Refresh</button>
            </div>
            {collabsLoading ? (
              <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-xl shadow">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Session ID</th>
                      <th className="px-4 py-2">Website ID</th>
                      <th className="px-4 py-2">Owner</th>
                      <th className="px-4 py-2">Participants</th>
                      <th className="px-4 py-2">Created</th>
                      <th className="px-4 py-2">Locked</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collabs.map(session => (
                      <tr key={session.id} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{session.id}</td>
                        <td className="px-4 py-2 font-mono text-xs">{session.websiteId}</td>
                        <td className="px-4 py-2">{session.ownerId}</td>
                        <td className="px-4 py-2">{session.participants?.map(p => p.displayName).join(', ')}</td>
                        <td className="px-4 py-2">{session.createdAt?.seconds ? new Date(session.createdAt.seconds * 1000).toLocaleString() : ''}</td>
                        <td className="px-4 py-2">{session.isLocked ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <button className="bg-green-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleAdminJoin(session)}>Join as Admin</button>
                          <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleDeleteSession(session)}>Delete Session</button>
                          <button className="bg-red-700 text-white px-2 py-1 rounded text-xs" onClick={() => handleDeleteWebsiteAndSession(session)}>Delete Website+DNS+Session</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        )}
      </main>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {notifications.map(n => (
            <div key={n.id} className="bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2">
              <span>{n.message}</span>
              <button className="ml-2 text-white hover:text-gray-200" onClick={() => removeNotification(n.id)}>&times;</button>
            </div>
          ))}
        </div>
      )}
      {/* Token management dialog */}
      {tokenDialogUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-2">Manage Tokens</h2>
            <div className="mb-2">User: <b>{tokenDialogUser.displayName || tokenDialogUser.email || tokenDialogUser.id}</b></div>
            <div className="mb-2">Current tokens: <b>{tokenDialogUser.tokens}</b></div>
            <div className="flex gap-2 justify-center mb-4">
              <button className={`px-3 py-1 rounded ${tokenAction === 'add' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setTokenAction('add')}>Add</button>
              <button className={`px-3 py-1 rounded ${tokenAction === 'subtract' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setTokenAction('subtract')}>Subtract</button>
              <button className={`px-3 py-1 rounded ${tokenAction === 'set' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => setTokenAction('set')}>Set</button>
            </div>
            <input
              type="number"
              className="border rounded px-2 py-1 w-32 text-center mb-2"
              placeholder="Amount"
              value={tokenAmount}
              onChange={e => setTokenAmount(e.target.value)}
              min="0"
            />
            {tokenError && <div className="text-red-600 text-sm mb-2">{tokenError}</div>}
            <div className="flex gap-2 justify-center mt-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleTokenAction} disabled={tokenLoading}>{tokenLoading ? 'Saving...' : 'Save'}</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setTokenDialogUser(null)} disabled={tokenLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* User's websites modal */}
      {userWebsitesModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full text-center relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={handleCloseUserWebsites}><XCircle className="h-6 w-6" /></button>
            <h2 className="text-xl font-bold mb-4">Websites by {userWebsitesModal.user.displayName || userWebsitesModal.user.email || userWebsitesModal.user.id}</h2>
            {userWebsitesLoading ? (
              <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : userWebsitesModal.websites.length === 0 ? (
              <div className="text-gray-500">No websites found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto pr-2">
                {userWebsitesModal.websites.map(site => (
                  <div key={site.id} className="bg-blue-50 rounded-xl shadow p-4 flex flex-col gap-2">
                    <div className="font-bold text-blue-900">{site.name || site.id}</div>
                    <div className="text-xs text-gray-500">ID: {site.id}</div>
                    <div className="text-xs text-gray-400">Created: {site.createdAt ? new Date(site.createdAt.seconds ? site.createdAt.seconds * 1000 : site.createdAt).toLocaleString() : 'Unknown'}</div>
                    <div className="flex gap-2 mt-2">
                      <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => window.open(`/view/${site.id}`, '_blank')}>Visit</button>
                      <button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-3 py-1 rounded text-xs" onClick={() => window.open(`/editor/${site.id}`, '_blank')}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 