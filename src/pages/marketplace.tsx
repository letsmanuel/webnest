import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CommunityMarketplaceCard } from '@/components/CommunityMarketplaceCard';
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const INITIAL_PAGE_SIZE = 6;
const LOAD_MORE_SIZE = 6;
const TEST_DUPLICATE_COUNT = 1; // Set to 15 for testing to duplicate each template 15x
const SEARCH_BATCH_SIZE = 100;

const Marketplace: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLastDoc, setSearchLastDoc] = useState<any>(null);
  const [searchNoResults, setSearchNoResults] = useState(false);
  const [searchTimeoutActive, setSearchTimeoutActive] = useState(false);

  const navigate = useNavigate();

  const fetchTemplates = useCallback(async (loadMore = false) => {
    setLoading(true);
    const db = getFirestore();
    let q;
    if (loadMore && lastDoc) {
      q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(LOAD_MORE_SIZE));
    } else {
      q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(INITIAL_PAGE_SIZE));
    }
    const snap = await getDocs(q);
    let newTemplates = snap.docs.map(doc => {
      const data = doc.data();
      if (data && typeof data === 'object') {
        return Object.assign({ id: doc.id }, data);
      }
      return null;
    }).filter(Boolean);
    // Duplicate for testing
    if (TEST_DUPLICATE_COUNT > 1) {
      newTemplates = newTemplates.flatMap(t => Array.from({ length: TEST_DUPLICATE_COUNT }, (_, i) => ({ ...t, id: t.id + '_dup' + i })));
    }
    if (loadMore) {
      setTemplates(prev => [...prev, ...newTemplates]);
    } else {
      setTemplates(newTemplates);
    }
    setLastDoc(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length === (loadMore ? LOAD_MORE_SIZE : INITIAL_PAGE_SIZE));
    setLoading(false);
  }, [lastDoc]);

  // Debounced server-side search with client-side substring filter
  useEffect(() => {
    if (search.trim() === '') {
      setSearchResults([]);
      setSearchLastDoc(null);
      setSearchNoResults(false);
      setSearching(false);
      fetchTemplates();
      return;
    }
    setSearching(true);
    setSearchNoResults(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const db = getFirestore();
      let q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(SEARCH_BATCH_SIZE));
      if (searchLastDoc) {
        q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), startAfter(searchLastDoc), limit(SEARCH_BATCH_SIZE));
      }
      const snap = await getDocs(q);
      const batch = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setSearchLastDoc(snap.docs[snap.docs.length - 1]);
      // Substring filter
      const filtered = batch.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) {
        setSearchResults(prev => searchLastDoc ? [...prev, ...filtered] : filtered);
        setSearchNoResults(false);
      } else {
        setSearchResults(prev => prev);
        setSearchNoResults(true);
      }
      setHasMore(false); // Disable infinite scroll for search
      setSearching(false);
    }, 200);
    // eslint-disable-next-line
  }, [search]);

  // Handler for 'Search Again' button
  const handleSearchAgain = () => {
    setSearchTimeoutActive(true);
    setTimeout(() => {
      setSearchTimeoutActive(false);
      setSearchNoResults(false);
      // Trigger next batch search
      setSearching(true);
      searchTimeout.current = setTimeout(async () => {
        const db = getFirestore();
        let q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), startAfter(searchLastDoc), limit(SEARCH_BATCH_SIZE));
        const snap = await getDocs(q);
        const batch = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setSearchLastDoc(snap.docs[snap.docs.length - 1]);
        const filtered = batch.filter(t =>
          t.name?.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase())
        );
        if (filtered.length > 0) {
          setSearchResults(prev => [...prev, ...filtered]);
          setSearchNoResults(false);
        } else {
          setSearchResults(prev => prev);
          setSearchNoResults(true);
        }
        setHasMore(false);
        setSearching(false);
      }, 0);
    }, 10000);
  };

  // Infinite scroll handler
  useEffect(() => {
    if (!hasMore || loading) return;
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
        !loading && hasMore
      ) {
        fetchTemplates(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchTemplates, loading, hasMore]);

  const handleFavorite = (id: string) => {
    setFavorites(favs => favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]);
  };

  const handleBuy = (websiteId: string) => {
    navigate(`/marketplace/product/${websiteId}`);
  };

  const handleViewDetail = (id: string, websiteId: string) => {
    navigate(`/marketplace/product/${websiteId}`);
  };

  // Filter templates by search
  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="py-8 text-center bg-blue-200 shadow relative">
        <h1 className="text-4xl font-bold text-blue-700">Webnest Marketplace</h1>
        <p className="text-blue-600 mt-2">Discover and buy community templates</p>
        <button
          className="absolute right-8 top-8 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition"
          onClick={() => window.location.href = '/'}
        >
          Back to Dashboard
        </button>
        <button
          className="absolute right-8 top-20 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition"
          onClick={() => window.location.href = '/marketplace/upload'}
        >
          Upload Template
        </button>
      </header>
      <main className="container mx-auto py-10 px-4">
        <div className="flex justify-center mb-8">
          <input
            type="text"
            className="w-full max-w-md border border-blue-200 rounded px-4 py-2 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {searching && (
          <div className="flex justify-center items-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        )}
        {search && !searching && searchResults.length === 0 && searchNoResults && !searchTimeoutActive && (
          <div className="flex flex-col items-center py-4 gap-2">
            <div className="text-gray-500">No results found.</div>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition"
              onClick={handleSearchAgain}
            >
              Search Again
            </button>
          </div>
        )}
        {searchTimeoutActive && (
          <div className="flex flex-col items-center py-4 gap-2">
            <div className="text-gray-500">Searching next 100 websites in 10 seconds...</div>
            <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(search ? searchResults : filteredTemplates).map(template => (
            <div key={template.id} onClick={() => handleViewDetail(template.id, template.websiteId)} style={{ cursor: 'pointer' }}>
              <CommunityMarketplaceCard
                template={template}
                onBuy={() => handleBuy(template.id)}
                onFavorite={() => handleFavorite(template.id)}
                onViewDetail={() => handleViewDetail(template.id, template.websiteId)}
                isFavorited={favorites.includes(template.id)}
                hideStock={true}
              />
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        )}
      </main>
    </div>
  );
};

export default Marketplace; 