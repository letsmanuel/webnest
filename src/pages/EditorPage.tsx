import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { websiteService, Website } from '@/services/websiteService';
import { WebsiteBuilder } from '@/components/WebsiteBuilder';
import { Button } from '@/components/ui/button';

const EditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Keine Website-ID angegeben');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    websiteService.getWebsite(id)
      .then((w) => {
        if (!w) {
          setError('Website nicht gefunden');
        } else {
          setWebsite(w);
        }
      })
      .catch(() => setError('Fehler beim Laden der Website'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Lade Editor...</div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-screen text-red-600">{error}<Button className="mt-4" onClick={() => window.history.back()}>Zurück</Button></div>;
  if (!website) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <WebsiteBuilder website={website} onSave={() => {}} onBack={() => window.history.back()} />
    </div>
  );
};

export default EditorPage; 