import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { websiteService, Website } from '@/services/websiteService';
import html2canvas from 'html2canvas';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const TEST_DUPLICATE_COUNT = 1; // Set to 15 for testing to upload each template 15x

const MarketplaceUpload: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingWebsite, setPendingWebsite] = useState<Website | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('0');
  const [preview, setPreview] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const renderRef = useRef<HTMLIFrameElement | null>(null);
  const [step, setStep] = useState(1); // 1 = select, 2 = edit, 3 = confirm, 4 = done

  useEffect(() => {
    if (user) {
      setLoading(true);
      websiteService.getUserWebsites(user.uid).then(setWebsites).finally(() => setLoading(false));
    }
  }, [user]);

  // When a website is confirmed, set defaults and start preview rendering
  useEffect(() => {
    if (selectedWebsite && user) {
      setName(selectedWebsite.name);
      setDescription(`Check out ${selectedWebsite.name} one of ${user.displayName || 'this user'}'s wonderful creations on webnest`);
      setTags('');
      setPrice('0');
      setPreview(null);
      setRendering(true);
    }
  }, [selectedWebsite, user]);

  // Render preview image when selectedWebsite changes or when retake is triggered
  const takeSnapshot = () => {
    if (selectedWebsite && selectedWebsite.htmlContent) {
      let decodedHtml = '';
      try {
        decodedHtml = decodeURIComponent(escape(window.atob(selectedWebsite.htmlContent)));
      } catch (e) {
        decodedHtml = atob(selectedWebsite.htmlContent);
      }
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          html2canvas(iframe.contentDocument!.body, { backgroundColor: null }).then(canvas => {
            setPreview(canvas.toDataURL('image/png'));
            setRendering(false);
            document.body.removeChild(iframe);
          }).catch(() => {
            setRendering(false);
            document.body.removeChild(iframe);
          });
        }, 10000); // Wait 10 seconds before snapshot
      };
      iframe.srcdoc = decodedHtml;
    }
  };

  useEffect(() => {
    if (selectedWebsite && selectedWebsite.htmlContent && rendering) {
      takeSnapshot();
    }
    // eslint-disable-next-line
  }, [selectedWebsite, rendering]);

  const handleWebsiteClick = (site: Website) => {
    setPendingWebsite(site);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setSelectedWebsite(pendingWebsite);
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setPendingWebsite(null);
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadSuccess(null);
    setUploadError(null);
    try {
      if (!selectedWebsite || !user) throw new Error('No website or user selected');
      // Prepare data for Firestore
      const db = getFirestore();
      const docData = {
        websiteId: selectedWebsite.id,
        authorId: user.uid,
        name,
        price: Number(price),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        description,
        preview,
        source: selectedWebsite.htmlContent, // base64 source code
        elementsJson: selectedWebsite.elementsJson || null, // preserve editor data
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        authorName: user.displayName || '',
        authorAvatar: user.photoURL || '',
        allowedUserIds: [user.uid],
      };
      await addDoc(collection(db, 'marketplace'), docData);
      setUploadSuccess('Template uploaded successfully!');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="py-8 text-center bg-blue-200 shadow">
        <div className="flex items-center justify-center gap-4">
          {step === 1 && (
            <span className="bg-blue-500 text-white rounded-full px-4 py-1 font-semibold text-sm">Step 1 of 3</span>
          )}
          {step === 2 && (
            <span className="bg-blue-500 text-white rounded-full px-4 py-1 font-semibold text-sm">Step 2 of 3</span>
          )}
          {step === 3 && (
            <span className="bg-blue-500 text-white rounded-full px-4 py-1 font-semibold text-sm">Step 3 of 3</span>
          )}
          <h1 className="text-3xl font-bold text-blue-700">Upload a Template</h1>
        </div>
        <p className="text-blue-600 mt-2">Share your creation with the Webnest community</p>
      </header>
      <main className="container mx-auto py-10 px-4 max-w-lg">
        {authLoading ? (
          <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : !user ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-blue-700 font-semibold">Please log in to upload a template and view your websites.</div>
        ) : (
          <>
            {/* Website Select (Step 1) */}
            {!selectedWebsite && step === 1 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-blue-700 mb-2">Your Websites</h2>
                {loading ? (
                  <div className="flex justify-center items-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
                ) : websites.length === 0 ? (
                  <div className="text-gray-500">You have no websites yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {websites.map(site => (
                      <li key={site.id} className="bg-blue-100 rounded p-3 flex flex-col cursor-pointer hover:bg-blue-200 transition" onClick={() => { handleWebsiteClick(site); setStep(2); }}>
                        <span className="font-semibold text-blue-800">{site.name}</span>
                        <span className="text-xs text-blue-600">Created: {site.createdAt.toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {/* Confirmation Popup */}
            {showConfirm && pendingWebsite && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-xs w-full text-center">
                  <h3 className="text-lg font-bold mb-4 text-blue-700">Are you sure?</h3>
                  <p className="mb-6">You selected <span className="font-semibold text-blue-800">{pendingWebsite.name}</span> as the website to upload as a template.</p>
                  <div className="flex gap-4 justify-center">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded transition" onClick={handleConfirm}>Yes, continue</button>
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded transition" onClick={handleCancel}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {/* Upload Form (Step 2) */}
            {selectedWebsite && !showConfirm && step === 2 && !uploading && (
              <form onSubmit={e => { e.preventDefault(); setStep(3); }} className="bg-white rounded-xl shadow-md p-8 flex flex-col gap-6">
                <div>
                  <label className="block font-semibold mb-1 text-blue-700">Template Name</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-blue-700">Description</label>
                  <textarea className="w-full border rounded px-3 py-2" value={description} onChange={e => setDescription(e.target.value)} required />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-blue-700">Tags (comma separated)</label>
                  <input type="text" className="w-full border rounded px-3 py-2" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. portfolio, modern" />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-blue-700">Price (tokens)</label>
                  <input type="number" min="0" className="w-full border rounded px-3 py-2" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-blue-700">Preview Image</label>
                  <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center relative overflow-hidden">
                    {rendering && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {preview ? (
                      <img src={preview} alt="Website Preview" className="object-contain max-h-44 max-w-full" />
                    ) : (
                      <span className="text-gray-400">No Preview</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded shadow transition"
                    onClick={() => { setRendering(true); }}
                    disabled={rendering}
                  >
                    Retake Snapshot
                  </button>
                </div>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition" disabled={rendering}>Continue</button>
              </form>
            )}
            {/* Step 3: Confirmation */}
            {step === 3 && !uploading && (
              <div className="bg-white rounded-xl shadow-md p-8 flex flex-col gap-6">
                <h2 className="text-xl font-bold text-blue-700 mb-2">Are you sure?</h2>
                <div>
                  <div className="mb-2"><span className="font-semibold">Template Name:</span> {name}</div>
                  <div className="mb-2"><span className="font-semibold">Description:</span> {description}</div>
                  <div className="mb-2"><span className="font-semibold">Tags:</span> {tags || 'None'}</div>
                  <div className="mb-2"><span className="font-semibold">Price:</span> {price} Tokens</div>
                  <div className="mb-2"><span className="font-semibold">Website:</span> {selectedWebsite?.name}</div>
                  <div className="mb-2"><span className="font-semibold">Preview:</span></div>
                  <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center relative overflow-hidden mb-4">
                    {rendering && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {preview ? (
                      <img src={preview} alt="Website Preview" className="object-contain max-h-44 max-w-full" />
                    ) : (
                      <span className="text-gray-400">No Preview</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded transition flex-1" onClick={() => setStep(2)}>No, back to edit</button>
                  <button type="button" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded shadow transition flex-1" onClick={async () => { setUploading(true); setUploadSuccess(null); setUploadError(null); try { if (!selectedWebsite || !user) throw new Error('No website or user selected'); const db = getFirestore(); const docData = { websiteId: selectedWebsite.id, authorId: user.uid, name, price: Number(price), tags: tags.split(',').map(t => t.trim()).filter(Boolean), description, preview, source: selectedWebsite.htmlContent, elementsJson: selectedWebsite.elementsJson || null, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), authorName: user.displayName || '', authorAvatar: user.photoURL || '', allowedUserIds: [user.uid], }; for (let i = 0; i < TEST_DUPLICATE_COUNT; i++) { await addDoc(collection(db, 'marketplace'), { ...docData, name: TEST_DUPLICATE_COUNT > 1 ? `${name} #${i + 1}` : name }); } setUploadSuccess('Your Template is Live in the marketplace'); setStep(4); } catch (err: any) { setUploadError(err.message || 'Upload failed'); } finally { setUploading(false); } }}>Upload</button>
                </div>
                {uploadError && <div className="text-red-600 font-semibold mt-4">{uploadError}</div>}
              </div>
            )}
            {/* Uploading Spinner Overlay */}
            {uploading && step !== 4 && (
              <div className="bg-white rounded-xl shadow-md p-8 flex flex-col gap-6 items-center justify-center text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <div className="text-blue-700 font-semibold text-lg">Uploading...</div>
                </div>
              </div>
            )}
            {/* Step 4: Done */}
            {step === 4 && (
              <div className="bg-white rounded-xl shadow-md p-8 flex flex-col gap-6 items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-green-700 mb-4">Your Template is Live in the marketplace</h2>
                <button type="button" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow transition mt-4" onClick={() => window.location.href = '/marketplace'}>Back to Marketplace</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MarketplaceUpload; 