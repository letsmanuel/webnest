
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Palette, Briefcase, ShoppingCart, Users, FileText } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  preview: string;
}

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string, projectName: string) => void;
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

export const TemplateSelector = ({ onSelectTemplate, onBack }: TemplateSelectorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projectName, setProjectName] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setProjectName('');
    setShowDialog(true);
  };

  const handleCreate = () => {
    if (selectedTemplate && projectName.trim()) {
      onSelectTemplate(selectedTemplate.id, projectName.trim());
      setShowDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button onClick={onBack} variant="ghost" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Template auswählen
            </h1>
            <p className="text-gray-600 mt-2">Starte mit einem professionellen Design oder einer leeren Seite</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const IconComponent = template.icon;
            const isBlank = template.id === 'blank';
            
            return (
              <Card 
                key={template.id}
                className={`bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer hover:scale-105 ${
                  isBlank ? 'border-2 border-dashed border-gray-300' : ''
                }`}
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader className="text-center">
                  <div className={`mx-auto w-16 h-16 ${
                    isBlank 
                      ? 'bg-gray-100 border-2 border-dashed border-gray-300' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  } rounded-full flex items-center justify-center mb-4`}>
                    <IconComponent className={`h-8 w-8 ${isBlank ? 'text-gray-400' : 'text-white'}`} />
                  </div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className={`${
                    isBlank ? 'bg-white border-2 border-dashed border-gray-200' : 'bg-gray-100'
                  } rounded-lg p-4 h-32 flex items-center justify-center text-center text-sm text-gray-600`}>
                    {template.preview}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Projekt erstellen</DialogTitle>
              <DialogDescription>
                Gib deinem Projekt einen Namen um mit dem {selectedTemplate?.name} zu starten.
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
