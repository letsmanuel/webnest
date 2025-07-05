import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { websiteService, Website } from '@/services/websiteService';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Eye, Globe, Type, Image, Square, MousePointer, Link, Youtube, Moon, Menu } from 'lucide-react';
import { ElementProperties } from './ElementProperties';

interface Element {
  id: string;
  type: 'text' | 'button' | 'image' | 'input' | 'link-text' | 'youtube' | 'dark-toggle' | 'topbar';
  content?: string;
  text?: string;
  src?: string;
  alt?: string;
  placeholder?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  url?: string;
  customJS?: string;
  label?: string;
  buttons?: Array<{text: string, backgroundColor: string, customJS?: string}>;
}

interface WebsiteBuilderProps {
  website: Website;
  onSave: () => void;
  onBack: () => void;
}

const availableElements = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'button', icon: MousePointer, label: 'Button' },
  { type: 'image', icon: Image, label: 'Bild' },
  { type: 'input', icon: Square, label: 'Eingabefeld' },
  { type: 'link-text', icon: Link, label: 'Link Text' },
  { type: 'youtube', icon: Youtube, label: 'YouTube' },
  { type: 'dark-toggle', icon: Moon, label: 'Dark Toggle' },
  { type: 'topbar', icon: Menu, label: 'Topbar' }
];

export const WebsiteBuilder = ({ website, onSave, onBack }: WebsiteBuilderProps) => {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishType, setPublishType] = useState<'classic' | 'custom'>('classic');
  const [customPath, setCustomPath] = useState('');
  const [checkingPath, setCheckingPath] = useState(false);
  const [existingCustomPath, setExistingCustomPath] = useState<string | null>(null);
  const { toast } = useToast();

  // Debug: Log the website object when component mounts
  console.log('WebsiteBuilder: Component mounted with website:', {
    id: website.id,
    name: website.name,
    hasHtmlContent: !!website.htmlContent,
    htmlContentLength: website.htmlContent?.length || 0,
    htmlContentPreview: website.htmlContent?.substring(0, 100) || 'none'
  });

  // Test the parsing function
  console.log('WebsiteBuilder: Testing parseHTML function...');
  //websiteService.testParseHTML();

  // Load existing elements from website HTML content
  useEffect(() => {
    console.log('WebsiteBuilder: useEffect triggered');
    console.log('WebsiteBuilder: Loading website with htmlContent:', website.htmlContent ? 'exists' : 'empty');
    if (website.htmlContent) {
      try {
        console.log('WebsiteBuilder: Attempting to parse HTML content...');
        const parsedElements = websiteService.parseHTML(website.htmlContent);
        console.log('WebsiteBuilder: Parsed elements:', parsedElements);
        setElements(parsedElements);
        console.log('WebsiteBuilder: Elements state set to:', parsedElements);
      } catch (error) {
        console.error('Error parsing website HTML:', error);
        toast({
          title: "Warnung",
          description: "Konnte gespeicherte Website nicht laden. Starte mit leerer Website.",
          variant: "destructive"
        });
      }
    } else {
      console.log('WebsiteBuilder: No htmlContent found, starting with empty elements');
    }
  }, [website.htmlContent, toast]);

  // Load existing custom path if website has one
  useEffect(() => {
    const loadCustomPath = async () => {
      if (website.id) {
        const customPath = await websiteService.getCustomPathForWebsite(website.id);
        setExistingCustomPath(customPath);
        
        // If website has a custom path, automatically select custom publish type
        if (customPath) {
          setPublishType('custom');
        }
      }
    };
    
    loadCustomPath();
  }, [website.id]);

  const addElement = (type: Element['type']) => {
    const newElement: Element = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Neuer Text' : undefined,
      text: type === 'button' || type === 'link-text' ? 'Button Text' : undefined,
      src: type === 'image' ? '/placeholder.svg' : undefined,
      alt: type === 'image' ? 'Bild' : undefined,
      placeholder: type === 'input' ? 'Eingabe...' : undefined,
      url: type === 'link-text' || type === 'youtube' ? 'https://example.com' : undefined,
      color: '#333333',
      backgroundColor: '#667eea',
      fontSize: 16,
      label: type === 'topbar' ? 'Navigation' : undefined,
      buttons: type === 'topbar' ? [] : undefined
    };
    
    setElements([...elements, newElement]);
    setSelectedElement(newElement);
  };

  const updateElement = (id: string, updates: Partial<Element>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
    
    if (selectedElement?.id === id) {
      setSelectedElement({ ...selectedElement, ...updates });
    }
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const htmlContent = websiteService.generateHTML(elements);
      
      // If website was already published, auto-publish after save
      if (website.isPublished) {
        await websiteService.updateWebsite(website.id!, {
          htmlContent,
          isPublished: true
        });
        
        // Get the current custom path to show in the toast
        const currentCustomPath = await websiteService.getCustomPathForWebsite(website.id!);
        const publishUrl = currentCustomPath ? `/view/${currentCustomPath}` : `/view/${website.id}`;
        
        toast({ 
          title: "Gespeichert & Aktualisiert!", 
          description: `Website wurde gespeichert und automatisch aktualisiert unter ${publishUrl}` 
        });
      } else {
        await websiteService.updateWebsite(website.id!, {
          htmlContent,
          isPublished: false
        });
        
        toast({ title: "Gespeichert!", description: "Website wurde erfolgreich gespeichert" });
      }
      
      // Call onSave to refresh the parent component
      onSave();
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Website konnte nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // Refresh custom path before showing dialog
    if (website.id) {
      const customPath = await websiteService.getCustomPathForWebsite(website.id);
      setExistingCustomPath(customPath);
      
      // If website has a custom path, automatically select custom publish type
      if (customPath) {
        setPublishType('custom');
      }
    }
    
    setShowPublishDialog(true);
  };

  const handlePublishConfirm = async () => {
    setPublishing(true);
    try {
      const htmlContent = websiteService.generateHTML(elements);
      
      if (publishType === 'custom' && (customPath.trim() || existingCustomPath)) {
        const pathToUse = customPath.trim() || existingCustomPath!;
        
        // Set custom path first if it's new
        if (customPath.trim() && !existingCustomPath) {
          await websiteService.setCustomPath(website.id!, customPath.trim());
        }
        
        await websiteService.updateWebsite(website.id!, {
          htmlContent,
          isPublished: true
        });
        
        toast({ 
          title: website.isPublished ? "Aktualisiert!" : "Veröffentlicht!", 
          description: `Website ist jetzt unter /view/${pathToUse} erreichbar` 
        });
        
        // Open published website
        window.open(`/view/${pathToUse}`, '_blank');
      } else {
        // Classic publish
        await websiteService.updateWebsite(website.id!, {
          htmlContent,
          isPublished: true
        });
        
        toast({ 
          title: website.isPublished ? "Aktualisiert!" : "Veröffentlicht!", 
          description: website.isPublished 
            ? "Website wurde erfolgreich aktualisiert" 
            : `Website ist jetzt unter /view/${website.id} erreichbar` 
        });
        
        // Open published website
        window.open(`/view/${website.id}`, '_blank');
      }
      
      // Refresh the parent component to update the website status
      onSave();
      setShowPublishDialog(false);
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Website konnte nicht veröffentlicht werden",
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
    }
  };

  const checkCustomPath = async (path: string) => {
    if (!path.trim()) return;
    
    setCheckingPath(true);
    try {
      const existingWebsite = await websiteService.getWebsiteByCustomPath(path.trim());
      if (existingWebsite) {
        toast({
          title: "Pfad bereits vergeben",
          description: "Dieser Custom Path ist bereits in Verwendung",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking custom path:', error);
    } finally {
      setCheckingPath(false);
    }
  };

  const renderElement = (element: Element) => {
    const isSelected = selectedElement?.id === element.id;
    const className = `cursor-pointer border-2 transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'
    }`;

    const handleClick = () => setSelectedElement(element);

    switch (element.type) {
      case 'text':
        return (
          <p
            key={element.id}
            className={`p-2 mb-4 ${className}`}
            style={{ color: element.color, fontSize: `${element.fontSize}px` }}
            onClick={handleClick}
          >
            {element.content || 'Text'}
          </p>
        );
      case 'button':
        return (
          <button
            key={element.id}
            className={`px-4 py-2 rounded mb-4 text-white font-medium ${className}`}
            style={{ backgroundColor: element.backgroundColor }}
            onClick={handleClick}
          >
            {element.text || 'Button'}
          </button>
        );
      case 'image':
        return (
          <img
            key={element.id}
            src={element.src || '/placeholder.svg'}
            alt={element.alt || 'Bild'}
            className={`max-w-full h-auto mb-4 rounded ${className}`}
            onClick={handleClick}
          />
        );
      case 'input':
        return (
          <input
            key={element.id}
            type="text"
            placeholder={element.placeholder || 'Eingabe...'}
            className={`w-full p-2 border border-gray-300 rounded mb-4 ${className}`}
            onClick={handleClick}
            readOnly
          />
        );
      case 'link-text':
        return (
          <p
            key={element.id}
            className={`p-2 mb-4 ${className}`}
            onClick={handleClick}
          >
            <span 
              style={{ color: element.color, fontSize: `${element.fontSize}px` }}
              className="underline cursor-pointer"
            >
              {element.text || 'Link Text'}
            </span>
          </p>
        );
      case 'youtube':
        return (
          <div
            key={element.id}
            className={`mb-4 ${className}`}
            onClick={handleClick}
          >
            <div className="bg-gray-100 p-4 rounded text-center">
              <Youtube className="mx-auto h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-gray-600">YouTube Video</p>
              <p className="text-xs text-gray-400">{element.url || 'URL eingeben'}</p>
            </div>
          </div>
        );
      case 'dark-toggle':
        return (
          <button
            key={element.id}
            className={`px-4 py-2 bg-gray-800 text-white rounded mb-4 ${className}`}
            onClick={handleClick}
          >
            🌙 Dark Mode
          </button>
        );
      case 'topbar':
        return (
          <div
            key={element.id}
            className={`mb-4 ${className}`}
            onClick={handleClick}
          >
            <div className="bg-white border rounded p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">{element.label || 'Navigation'}</span>
                <div className="flex gap-2">
                  {(element.buttons || []).map((btn, i) => (
                    <button
                      key={i}
                      className="px-3 py-1 text-white rounded text-sm"
                      style={{ backgroundColor: btn.backgroundColor }}
                    >
                      {btn.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Toolbar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Badge variant="outline">{website.name}</Badge>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm" variant="outline">
                <Save className="mr-1 h-3 w-3" />
                {saving ? 'Speichert...' : (website.isPublished ? 'Speichern & Aktualisieren' : 'Speichern')}
              </Button>
              <Button onClick={handlePublish} disabled={publishing} size="sm">
                <Globe className="mr-1 h-3 w-3" />
                {publishing ? (website.isPublished ? 'Aktualisiert...' : 'Veröffentlicht...') : (website.isPublished ? 'Aktualisieren' : 'Veröffentlichen')}
              </Button>
            </div>
          </div>

          {/* Element Toolbox */}
          <div className="p-4">
            <h3 className="font-medium mb-3">Elemente</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableElements.map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  onClick={() => addElement(type as Element['type'])}
                  variant="outline"
                  size="sm"
                  className="h-12 flex-col"
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedElement && (
            <div className="flex-1 border-t">
              <ElementProperties
                element={selectedElement}
                onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                onDelete={() => deleteElement(selectedElement.id)}
              />
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 p-8">
          <Card className="w-full max-w-4xl mx-auto min-h-96">
            <CardHeader>
              <CardTitle className="text-center">Website Vorschau</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {elements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="mx-auto h-12 w-12 mb-4" />
                  <p>Füge Elemente hinzu, um deine Website zu erstellen!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {elements.map(renderElement)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{website.isPublished ? 'Website aktualisieren' : 'Website veröffentlichen'}</DialogTitle>
            <DialogDescription>
              Wähle aus, wie du deine Website {website.isPublished ? 'aktualisieren' : 'veröffentlichen'} möchtest.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Classic Publish Option */}
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="classic"
                name="publishType"
                value="classic"
                checked={publishType === 'classic'}
                onChange={(e) => setPublishType(e.target.value as 'classic' | 'custom')}
                className="h-4 w-4"
              />
              <Label htmlFor="classic" className="flex-1">
                <div className="font-medium">Classic Publish (Gratis)</div>
                <div className="text-sm text-gray-500">
                  Website wird unter /view/{website.id} veröffentlicht
                </div>
              </Label>
            </div>

            {/* Custom Path Option */}
            <div className="flex items-start space-x-2">
              <input
                type="radio"
                id="custom"
                name="publishType"
                value="custom"
                checked={publishType === 'custom'}
                onChange={(e) => setPublishType(e.target.value as 'classic' | 'custom')}
                className="h-4 w-4 mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="custom" className="font-medium">
                  Custom Project Name (5 Tokens)
                </Label>
                {existingCustomPath ? (
                  <div className="text-sm text-green-600 mb-2">
                    ✅ Bereits gesetzt: {existingCustomPath}
                    <br />
                    <span className="text-xs text-gray-500">
                      Website wird unter /view/{existingCustomPath} veröffentlicht
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-2">
                    Wähle deinen eigenen Projektnamen (z.B. "meine-awesome-website")
                  </div>
                )}
                {publishType === 'custom' && !existingCustomPath && (
                  <div className="space-y-2">
                    <Input
                      placeholder="meine-awesome-website"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      onBlur={() => checkCustomPath(customPath)}
                    />
                    <div className="text-xs text-gray-500">
                      Deine Website wird dann unter /view/{customPath || 'projektname'} erreichbar sein
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              disabled={publishing}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handlePublishConfirm}
              disabled={publishing || (publishType === 'custom' && !customPath.trim() && !existingCustomPath)}
            >
              {publishing ? (website.isPublished ? 'Aktualisiert...' : 'Veröffentlicht...') : (website.isPublished ? 'Aktualisieren' : 'Veröffentlichen')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
