
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Palette, Briefcase, ShoppingCart, Users, FileText, Sparkles, LayoutGrid } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { websiteService } from '@/services/websiteService';
// Removed dotenv import and config

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  preview: string;
}

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string, projectName: string, htmlContent?: string, elementsJson?: string) => void;
  onBack: () => void;
}

const templates: Template[] = [
  {
    id: 'blank',
    name: 'Leere Website',
    description: 'Starte komplett von vorne',
    icon: FileText,
    preview: 'Eine leere weiße Seite zum freien Gestalten'
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Perfekt für Produktvorstellungen und Marketing',
    icon: Palette,
    preview: 'Hero-Section mit Call-to-Action, Produktbild und modernem Design'
  },
  {
    id: 'business',
    name: 'Business Website',
    description: 'Professionelle Unternehmenswebsite',
    icon: Briefcase,
    preview: 'Klassisches Business-Layout mit Services und Kontaktmöglichkeiten'
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Zeige deine Arbeiten und Projekte',
    icon: Users,
    preview: 'Kreatives Portfolio-Design für Designer und Entwickler mit Projektbeispielen'
  },
  {
    id: 'shop',
    name: 'Online Shop',
    description: 'E-Commerce Website für Produkte',
    icon: ShoppingCart,
    preview: 'Shop-Layout mit Produktgalerie, Preisen und Newsletter-Anmeldung'
  }
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function extractHtmlFromGeminiResponse(text: string): string {
  // Remove markdown code fences
  let html = text.replace(/```html|```/gi, '').trim();

  // Try to extract from the first <html> to the last </html>
  const htmlMatch = html.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return htmlMatch[0];

  // Fallback: extract from first <body> to last </body>
  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);
  if (bodyMatch) return bodyMatch[0];

  // Fallback: extract from first <div> to last </div>
  const divMatch = html.match(/<div[\s\S]*<\/div>/i);
  if (divMatch) return divMatch[0];

  // If nothing matches, return the cleaned text
  return html;
}

async function fetchGeminiHTML(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const systemPrompt = `Generate a single HTML string for a website based on the following user prompt. The HTML must be valid and follow the structure required by our no-code editor. Do NOT include <script> tags, external resources, or markdown. Only return the HTML, nothing else.\n\nIMPORTANT: For EVERY element, add ALL relevant style properties as inline style attributes, including: left, top, font-family, font-size, color, background-color, width, and height. Do NOT use CSS classes or <style> tags. All positioning and styling must be inline. The HTML must be compatible with our editor: use only supported tags, inline styles, and no custom JS.`;
  const fullPrompt = `${systemPrompt}\n\nUser prompt: ${prompt}`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
  });
  // Extract the text from the correct Gemini response structure
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';
  return extractHtmlFromGeminiResponse(text);
}

async function fetchGeminiElementsJson(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const systemPrompt = `You are a website generator for a no-code editor. Generate ONLY a JSON array (no markdown, no explanation, no HTML) describing the website as a list of elements. Each element is an object with properties like id (unique string), type (e.g. 'topbar', 'text', 'image', 'button'), x, y, xPx, yPx, zIndex, fontFamily, fontSize, color, backgroundColor, widthPx, heightPx, content, label, text, src, alt, buttons (array), customJS, etc. IMPORTANT: Every element (not just topbar) MUST have meaningful x, y, xPx, yPx values for absolute positioning, and these values should be visually distributed so elements are not stacked or overlapping. Example format:\n[\n  {\n    \"id\": \"1752046778568\",\n    \"type\": \"topbar\",\n    \"color\": \"#333333\",\n    \"backgroundColor\": \"#667eea\",\n    \"fontSize\": 16,\n    \"label\": \"My very first Blog\",\n    \"buttons\": [{\"text\": \"To my tiktok\",\"backgroundColor\": \"#2de18d\",\"customJS\": \"window.location.href = 'https://www.example.com'\"}],\n    \"x\": -33.0,\n    \"y\": 0,\n    \"zIndex\": 1,\n    \"xPx\": -269,\n    \"yPx\": 0\n  },\n  {\n    \"id\": \"1752046832520\",\n    \"type\": \"text\",\n    \"content\": \"Juli 5th 2025\",\n    \"color\": \"#333333\",\n    \"backgroundColor\": \"#667eea\",\n    \"fontSize\": 30,\n    \"x\": 0.7,\n    \"y\": 8.8,\n    \"zIndex\": 2,\n    \"xPx\": 5.8,\n    \"yPx\": 70.5\n  },\n  {\n    \"id\": \"1752046870870\",\n    \"type\": \"image\",\n    \"src\": \"https://images.pexels.com/photo.jpg\",\n    \"alt\": \"Bild\",\n    \"x\": 61.0,\n    \"y\": 51.6,\n    \"zIndex\": 3,\n    \"xPx\": 497,\n    \"yPx\": 413,\n    \"widthPx\": 317,\n    \"heightPx\": 266\n  },\n  {\n    \"id\": \"1752047385436\",\n    \"type\": \"button\",\n    \"text\": \"Check out my Insta\",\n    \"color\": \"#333333\",\n    \"backgroundColor\": \"#667eea\",\n    \"fontSize\": 16,\n    \"x\": 27.8,\n    \"y\": 89.9,\n    \"zIndex\": 4,\n    \"xPx\": 226,\n    \"yPx\": 719,\n    \"widthPx\": 353,\n    \"heightPx\": 67\n  }
]`;
  const fullPrompt = `${systemPrompt}\n\nUser prompt: ${prompt}`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
  });
  // Extract the text from the correct Gemini response structure
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';
  // Remove markdown code fences if present
  return text.replace(/```json|```/gi, '').trim();
}

export const TemplateSelector = ({ onSelectTemplate, onBack }: TemplateSelectorProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedOption, setSelectedOption] = useState<'scratch' | 'ai' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleOptionClick = (option: 'scratch' | 'templates' | 'ai') => {
    if (option === 'templates') {
      window.location.href = '/marketplace';
      return;
    }
    if (option === 'ai') {
      setShowAIPrompt(true);
      setSelectedOption('ai');
      setProjectName('');
      setAiPrompt('');
      return;
    }
    setSelectedOption(option);
    setProjectName('');
    setShowDialog(true);
  };

  const handleCreate = async () => {
    if (selectedOption === 'scratch' && projectName.trim()) {
      onSelectTemplate('blank', projectName.trim());
      setShowDialog(false);
    }
    if (selectedOption === 'ai' && projectName.trim() && aiPrompt.trim() && aiPrompt.length <= 1000) {
      setAiLoading(true);
      setAiError('');
      try {
        const elementsJson = await fetchGeminiElementsJson(aiPrompt.trim());
        if (!elementsJson || elementsJson.length < 10) throw new Error('No JSON returned');
        console.log('[Gemini elementsJson]', elementsJson); // Print raw Gemini JSON
        onSelectTemplate('ai', projectName.trim(), undefined, elementsJson); // Pass only elementsJson
        setShowAIPrompt(false);
      } catch (err) {
        setAiError('Fehler beim Generieren der Website. Bitte versuche es erneut.');
      } finally {
        setAiLoading(false);
      }
    }
  };

  // AI Prompt Screen
  if (showAIPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-pink-100 flex flex-col items-center justify-center">
        <div className="animate-fade-in-up-ai bg-white/95 rounded-3xl shadow-2xl border border-yellow-100 p-6 sm:p-8 max-w-lg w-full flex flex-col items-center relative overflow-hidden">
          {/* Animated Sparkles icon in gradient circle */}
          <div className="mb-3 flex flex-col items-center">
            <div className="bg-gradient-to-tr from-yellow-300 via-pink-200 to-yellow-100 rounded-full p-4 shadow-lg animate-pop-in">
              <Sparkles className="h-10 w-10 text-yellow-500 drop-shadow" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-yellow-700 mb-1 text-center">Starte mit KI</h2>
          <p className="text-gray-600 mb-4 text-center text-base sm:text-lg">Beschreibe deine App-Idee oder Anforderungen (max. 1000 Zeichen):</p>
          {/* Info box */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-2 text-sm text-yellow-700 mb-4 text-center flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Die KI generiert einen individuellen Website-Entwurf nach deinen Vorgaben.
          </div>
          <input
            className="w-full mb-3 px-4 py-2 rounded-lg border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-lg transition-all duration-200"
            placeholder="Projektname"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            maxLength={100}
            autoFocus
            disabled={aiLoading}
          />
          <textarea
            className="w-full h-32 mb-2 px-4 py-2 rounded-lg border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base resize-none transition-all duration-200"
            placeholder="Beschreibe deine App..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            maxLength={1000}
            disabled={aiLoading}
          />
          <div className="w-full flex justify-between text-xs text-gray-500 mb-3">
            <span>{aiPrompt.length}/1000 Zeichen</span>
            <span>Preis: 14 Tokens</span>
          </div>
          {aiError && <div className="text-red-500 text-sm mb-2">{aiError}</div>}
          <div className="flex gap-2 w-full mt-2">
            <Button onClick={() => setShowAIPrompt(false)} variant="outline" className="flex-1" disabled={aiLoading}>Abbrechen</Button>
            <Button
              onClick={handleCreate}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-pink-400 text-white font-bold relative overflow-hidden group disabled:opacity-60"
              disabled={!(projectName.trim() && aiPrompt.trim() && aiPrompt.length <= 1000) || aiLoading}
            >
              {aiLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loader-ai inline-block w-5 h-5 border-2 border-yellow-300 border-t-yellow-500 rounded-full animate-spin align-middle" />
                  Generiere...
                </span>
              ) : (
                <span className="relative z-10">Senden (14 Tokens)</span>
              )}
              {/* Shimmer effect on hover */}
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <span className="block w-full h-full bg-gradient-to-r from-yellow-200 via-pink-200 to-yellow-200 animate-shimmer-ai rounded-lg" />
              </span>
            </Button>
          </div>
          {/* Custom keyframes for fade-in-up, pop-in, shimmer, and loader */}
          <style>{`
            @keyframes fade-in-up-ai {
              0% { opacity: 0; transform: translateY(40px) scale(0.97); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up-ai {
              animation: fade-in-up-ai 0.7s cubic-bezier(.77,0,.18,1) both;
            }
            @keyframes pop-in {
              0% { opacity: 0; transform: scale(0.7); }
              80% { opacity: 1; transform: scale(1.1); }
              100% { opacity: 1; transform: scale(1); }
            }
            .animate-pop-in {
              animation: pop-in 0.6s cubic-bezier(.77,0,.18,1) both;
            }
            @keyframes shimmer-ai {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .animate-shimmer-ai {
              background-size: 400% 100%;
              animation: shimmer-ai 1.8s linear infinite;
            }
            .loader-ai {
              border-right-color: transparent;
              border-bottom-color: transparent;
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button onClick={onBack} variant="ghost" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Projekt starten
            </h1>
            <p className="text-gray-600 mt-2">Wähle, wie du dein Projekt beginnen möchtest</p>
          </div>
        </div>
        {/* Section heading for options */}
        <div className="max-w-4xl mx-auto text-center mb-6 px-2">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">Wähle eine Startoption</h2>
          <p className="text-gray-500 text-base md:text-lg">Wie möchtest du dein Projekt beginnen?</p>
          <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mt-4 mb-2 opacity-60" />
        </div>
        {/* Responsive, animated grid for creation methods */}
        <div className="relative max-w-5xl mx-auto px-2 py-4 md:py-8 lg:py-12 rounded-2xl shadow-lg bg-gradient-to-br from-white via-purple-50 to-pink-50 overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Start from scratch */}
            <button
              onClick={() => handleOptionClick('scratch')}
              className="group bg-white/90 border-2 border-dashed border-gray-200 rounded-2xl p-6 md:p-8 lg:p-10 flex flex-col items-center shadow transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none animate-fade-in-up-card delay-100 hover:ring-2 hover:ring-purple-300 focus:ring-2 focus:ring-purple-400 relative overflow-hidden"
              style={{ transitionProperty: 'box-shadow, transform' }}
            >
              <span className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-tr from-purple-100/0 via-purple-100/40 to-white/0 opacity-0 group-hover:opacity-100 animate-shimmer" />
              <FileText className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-purple-400 mb-3 md:mb-4 group-hover:text-purple-600 transition-colors duration-300 group-hover:animate-icon-pulse" />
              <div className="text-lg md:text-xl lg:text-2xl font-bold mb-1 md:mb-2 text-purple-700">Start from scratch</div>
              <div className="text-gray-500 text-center text-sm md:text-base">Beginne mit einer leeren Seite und baue alles selbst.</div>
            </button>
            {/* Templates (redirects to marketplace) */}
            <button
              onClick={() => handleOptionClick('templates')}
              className="group bg-white/90 border-2 border-gray-200 rounded-2xl p-6 md:p-8 lg:p-10 flex flex-col items-center shadow transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none animate-fade-in-up-card delay-200 hover:ring-2 hover:ring-pink-300 focus:ring-2 focus:ring-pink-400 relative overflow-hidden"
              style={{ transitionProperty: 'box-shadow, transform' }}
            >
              <span className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-tr from-pink-100/0 via-pink-100/40 to-white/0 opacity-0 group-hover:opacity-100 animate-shimmer" />
              <LayoutGrid className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-pink-400 mb-3 md:mb-4 group-hover:text-pink-600 transition-colors duration-300 group-hover:animate-icon-pulse" />
              <div className="text-lg md:text-xl lg:text-2xl font-bold mb-1 md:mb-2 text-pink-700">Templates</div>
              <div className="text-gray-500 text-center text-sm md:text-base">Wähle aus professionellen Vorlagen im Marktplatz.</div>
            </button>
            {/* Start with AI */}
            <button
              onClick={() => handleOptionClick('ai')}
              className="group bg-white/90 border-2 border-yellow-200 rounded-2xl p-6 md:p-8 lg:p-10 flex flex-col items-center shadow transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none animate-fade-in-up-card delay-300 hover:ring-2 hover:ring-yellow-200 focus:ring-2 focus:ring-yellow-400 relative overflow-hidden"
              style={{ transitionProperty: 'box-shadow, transform' }}
            >
              <span className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-tr from-yellow-100/0 via-yellow-100/40 to-white/0 opacity-0 group-hover:opacity-100 animate-shimmer" />
              <Sparkles className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-yellow-400 mb-3 md:mb-4 group-hover:text-yellow-600 transition-colors duration-300 group-hover:animate-icon-pulse" />
              <div className="text-lg md:text-xl lg:text-2xl font-bold mb-1 md:mb-2 text-yellow-700">Start with AI</div>
              <div className="text-gray-500 text-center text-sm md:text-base">Lass dir von KI eine Website vorschlagen und generieren.</div>
            </button>
          </div>
          {/* Custom keyframes for fade-in-up, shimmer, and icon pulse */}
          <style>{`
            @keyframes fade-in-up-card {
              0% { opacity: 0; transform: translateY(40px) scale(0.97); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up-card {
              animation: fade-in-up-card 0.7s cubic-bezier(.77,0,.18,1) both;
            }
            .delay-100 { animation-delay: 0.1s; }
            .delay-200 { animation-delay: 0.2s; }
            .delay-300 { animation-delay: 0.3s; }
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .animate-shimmer {
              background-size: 400% 100%;
              animation: shimmer 1.8s linear infinite;
            }
            @keyframes icon-pulse {
              0%, 100% { filter: brightness(1); }
              50% { filter: brightness(1.25) drop-shadow(0 0 6px rgba(0,0,0,0.08)); }
            }
            .animate-icon-pulse {
              animation: icon-pulse 1.2s cubic-bezier(.77,0,.18,1) infinite;
            }
          `}</style>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Projekt erstellen</DialogTitle>
              <DialogDescription>
                Gib deinem Projekt einen Namen um zu starten.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="z.B. Meine Awesome Website"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={() => setShowDialog(false)} variant="outline" className="flex-1">
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!projectName.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
                >
                  Projekt erstellen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
