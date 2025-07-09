import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { websiteService } from '@/services/websiteService';
import { AlertCircle, Globe, Zap, Star, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { WebsiteBuilder } from './WebsiteBuilder';

const ADMIN_EMAILS = ['luap.palu@gmail.com', 'letsmanuel.service@gmail.com'];

export const WebsiteViewer = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [notFound, setNotFound] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [websiteObj, setWebsiteObj] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish
    loadWebsite();
    // eslint-disable-next-line
  }, [id, user, authLoading]);

  const loadWebsite = async () => {
    console.log('WebsiteViewer: loadWebsite called with id:', id);
    
    // Reset states at the beginning of each load
    setLoading(true);
    setError('');
    setNotFound(false);
    setHtmlContent('');
    
    if (!id) {
      setError('Keine Website-ID angegeben');
      setLoading(false);
      return;
    }

    try {
      let website = null;
      
      // Always try custom path lookup first (DNS resolution)
      console.log('WebsiteViewer: Trying custom path lookup for:', id);
      website = await websiteService.getWebsiteByCustomPath(id);
      console.log('WebsiteViewer: Custom path lookup result:', website ? 'found' : 'not found');
      
      // If not found via DNS, try direct ID lookup
      if (!website) {
        console.log('WebsiteViewer: Trying direct ID lookup for:', id);
        website = await websiteService.getWebsite(id);
        console.log('WebsiteViewer: Direct ID lookup result:', website ? 'found' : 'not found');
      }
      
      if (!website) {
        console.log('WebsiteViewer: No website found, showing not found page');
        setNotFound(true);
        setLoading(false);
        return;
      }

      console.log('WebsiteViewer: Website found:', {
        id: website.id,
        name: website.name,
        isPublished: website.isPublished,
        hasHtmlContent: !!website.htmlContent
      });

      if (!website.isPublished) {
        if (user && ADMIN_EMAILS.includes(user.email || '')) {
          // Admin: allow access, show modal
          if (website.htmlContent) {
            let decodedHtml = '';
            try {
              decodedHtml = decodeURIComponent(escape(atob(website.htmlContent)));
            } catch (e) {
              decodedHtml = atob(website.htmlContent);
            }
            setHtmlContent(decodedHtml);
          } else {
            setError('Kein Inhalt verfügbar');
          }
          setShowAdminModal(true);
        } else {
          setError('Website ist nicht veröffentlicht');
        }
        setLoading(false);
        return;
      }

      if (website.htmlContent) {
        let decodedHtml = '';
        try {
          decodedHtml = decodeURIComponent(escape(atob(website.htmlContent)));
        } catch (e) {
          decodedHtml = atob(website.htmlContent);
        }
        setHtmlContent(decodedHtml);
      } else {
        setError('Kein Inhalt verfügbar');
      }
      setWebsiteObj(website);
    } catch (error) {
      console.error('Error loading website:', error);
      setError('Fehler beim Laden der Website');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Website wird geladen...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Website nicht gefunden
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Die Website <span className="font-mono bg-gray-100 px-2 py-1 rounded">{id}</span> existiert nicht.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Hero Section */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Erstelle deine eigene Website!
              </h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Mit Webnest kannst du schnell und einfach professionelle Websites erstellen. 
                Keine Programmierkenntnisse erforderlich - nur deine Kreativität!
              </p>
              <Link to="/">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="mr-2 h-5 w-5" />
                  Jetzt Website erstellen
                </Button>
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Einfach zu bedienen</h3>
                <p className="text-gray-600 text-sm">
                  Drag & Drop Editor mit intuitiver Benutzeroberfläche
                </p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Professionelle Templates</h3>
                <p className="text-gray-600 text-sm">
                  Vorgefertigte Designs für verschiedene Branchen
                </p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sofort online</h3>
                <p className="text-gray-600 text-sm">
                  Veröffentliche deine Website mit einem Klick
                </p>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Preise</h3>
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="bg-white/10 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-2">Classic Publish</h4>
                  <p className="text-3xl font-bold mb-2">Gratis</p>
                  <p className="text-blue-100 text-sm">Website mit automatischer URL</p>
                </div>
                <div className="bg-white/10 rounded-lg p-6">
                  <h4 className="font-semibold text-lg mb-2">Custom Domain</h4>
                  <p className="text-3xl font-bold mb-2">8 Tokens</p>
                  <p className="text-blue-100 text-sm">Eigene URL wie "meine-website"</p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <Badge variant="outline" className="mb-4">
                🎉 Über 1000+ Websites bereits erstellt
              </Badge>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Bereit, deine eigene Website zu erstellen?
                </p>
                <Link to="/">
                  <Button size="lg" variant="outline" className="border-2">
                    <Globe className="mr-2 h-5 w-5" />
                    Los geht's!
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Use htmlContent for published/final output, fallback to elementsJson only if htmlContent is missing
  if (htmlContent) {
    return (
      <>
        {showAdminModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
              <h2 className="text-xl font-bold mb-2">Admin-Zugriff</h2>
              <p className="mb-4">Du siehst diese unveröffentlichte Website, weil du Admin-Rechte hast.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowAdminModal(false)}>Verstanden</button>
            </div>
          </div>
        )}
        <div
          className="min-h-screen"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </>
    );
  }

  // Fallback: try elementsJson if htmlContent is missing
  if (websiteObj && websiteObj.elementsJson) {
    let elements = [];
    try {
      elements = JSON.parse(websiteObj.elementsJson);
    } catch (e) {
      // fallback to nothing
    }
    if (elements && elements.length > 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center text-gray-500 py-20">No published HTML found. (Preview mode)</div>
        </div>
      );
    }
  }

  return (
    <>
      {showAdminModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <h2 className="text-xl font-bold mb-2">Admin-Zugriff</h2>
            <p className="mb-4">Du siehst diese unveröffentlichte Website, weil du Admin-Rechte hast.</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowAdminModal(false)}>Verstanden</button>
          </div>
        </div>
      )}
      <div
        className="min-h-screen"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </>
  );
};
