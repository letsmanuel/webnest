import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

const MarketplaceProduct: React.FC = () => {
  const { websiteid } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      setError(null);
      try {
        const db = getFirestore();
        const q = query(collection(db, 'marketplace'), where('websiteId', '==', websiteid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setTemplate({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setError('Template not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch template');
      } finally {
        setLoading(false);
      }
    };
    if (websiteid) fetchTemplate();
  }, [websiteid]);

  const handleDownload = async () => {
    if (!user || !template) return;
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      const db = getFirestore();
      const newWebsite: any = {
        name: template.name,
        userId: user.uid,
        htmlContent: template.source,
        isPublished: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        allowedUserIds: [user.uid],
      };
      if (template.editorHeight !== undefined) newWebsite.editorHeight = template.editorHeight;
      if (template.elementsJson !== undefined) newWebsite.elementsJson = template.elementsJson;
      await addDoc(collection(db, 'websites'), newWebsite);
      setSuccess('Template downloaded to your websites!');
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">{error}</div>;
  }
  if (!template) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">No template found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="py-8 text-center bg-blue-200 shadow">
        <h1 className="text-3xl font-bold text-blue-700">{template.name}</h1>
        <p className="text-blue-600 mt-2">By {template.authorName || 'Unknown'}</p>
      </header>
      <main className="container mx-auto py-10 px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-md p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex items-center justify-center">
              {template.preview ? (
                <img src={template.preview} alt="Preview" className="object-contain max-h-64 max-w-full rounded" />
              ) : (
                <span className="text-gray-400">No Preview</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div><span className="font-semibold">Description:</span> {template.description}</div>
              <div><span className="font-semibold">Tags:</span> {template.tags?.join(', ') || 'None'}</div>
              <div><span className="font-semibold">Price:</span> {template.price === 0 ? 'Free' : `${template.price} Tokens`}</div>
              <div><span className="font-semibold">Sold:</span> {template.soldCount || 0}</div>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-6">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition"
              onClick={handleDownload}
              disabled={downloading || !!success}
            >
              {downloading ? 'Downloading...' : success ? 'Downloaded!' : 'Download to My Websites'}
            </button>
            {success && <div className="text-green-600 font-semibold">{success}</div>}
            {error && <div className="text-red-600 font-semibold">{error}</div>}
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded shadow transition"
              onClick={() => navigate('/marketplace')}
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketplaceProduct; 