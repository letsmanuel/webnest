import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Minus } from 'lucide-react';

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

interface ElementPropertiesProps {
  element: Element;
  onUpdate: (updates: Partial<Element>) => void;
  onDelete: () => void;
}

export const ElementProperties = ({ element, onUpdate, onDelete }: ElementPropertiesProps) => {
  const addTopbarButton = () => {
    const currentButtons = element.buttons || [];
    if (currentButtons.length < 5) {
      onUpdate({
        buttons: [...currentButtons, { text: 'Button', backgroundColor: '#667eea' }]
      });
    }
  };

  const removeTopbarButton = (index: number) => {
    const currentButtons = element.buttons || [];
    onUpdate({
      buttons: currentButtons.filter((_, i) => i !== index)
    });
  };

  const updateTopbarButton = (index: number, updates: Partial<{text: string, backgroundColor: string, customJS?: string}>) => {
    const currentButtons = element.buttons || [];
    const newButtons = [...currentButtons];
    newButtons[index] = { ...newButtons[index], ...updates };
    onUpdate({ buttons: newButtons });
  };

  const renderProperties = () => {
    switch (element.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Text Inhalt</Label>
              <Textarea
                id="content"
                value={element.content || ''}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Text eingeben..."
              />
            </div>
            <div>
              <Label htmlFor="color">Textfarbe</Label>
              <Input
                id="color"
                type="color"
                value={element.color || '#333333'}
                onChange={(e) => onUpdate({ color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fontSize">Schriftgröße (px)</Label>
              <Input
                id="fontSize"
                type="number"
                value={element.fontSize || 16}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                min="8"
                max="72"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Button Text</Label>
              <Input
                id="text"
                value={element.text || ''}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Button Text..."
              />
            </div>
            <div>
              <Label htmlFor="backgroundColor">Hintergrundfarbe</Label>
              <Input
                id="backgroundColor"
                type="color"
                value={element.backgroundColor || '#667eea'}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customJS">Custom JavaScript</Label>
              <Textarea
                id="customJS"
                value={element.customJS || ''}
                onChange={(e) => onUpdate({ customJS: e.target.value })}
                placeholder="alert('Hello World!');"
              />
            </div>
          </div>
        );

      case 'link-text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Link Text</Label>
              <Input
                id="text"
                value={element.text || ''}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Link Text..."
              />
            </div>
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={element.url || ''}
                onChange={(e) => onUpdate({ url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="color">Textfarbe</Label>
              <Input
                id="color"
                type="color"
                value={element.color || '#667eea'}
                onChange={(e) => onUpdate({ color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fontSize">Schriftgröße (px)</Label>
              <Input
                id="fontSize"
                type="number"
                value={element.fontSize || 16}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                min="8"
                max="72"
              />
            </div>
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                id="url"
                value={element.url || ''}
                onChange={(e) => onUpdate({ url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>
        );

      case 'topbar':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Label Text</Label>
              <Input
                id="label"
                value={element.label || ''}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Navigation"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Buttons ({(element.buttons || []).length}/5)</Label>
                <Button
                  onClick={addTopbarButton}
                  size="sm"
                  disabled={(element.buttons || []).length >= 5}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              {(element.buttons || []).map((button, index) => (
                <div key={index} className="border p-3 rounded mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Button {index + 1}</span>
                    <Button
                      onClick={() => removeTopbarButton(index)}
                      size="sm"
                      variant="destructive"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      value={button.text || ''}
                      onChange={(e) => updateTopbarButton(index, { text: e.target.value })}
                      placeholder="Button Text"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={button.backgroundColor || '#667eea'}
                        onChange={(e) => updateTopbarButton(index, { backgroundColor: e.target.value })}
                        className="w-16"
                      />
                      <Textarea
                        value={button.customJS || ''}
                        onChange={(e) => updateTopbarButton(index, { customJS: e.target.value })}
                        placeholder="JavaScript Code..."
                        className="text-xs"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dark-toggle':
        return (
          <div className="text-center py-4">
            <p className="text-gray-500">Dark Mode Toggle - Keine Einstellungen erforderlich</p>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="src">Bild URL</Label>
              <Input
                id="src"
                value={element.src || ''}
                onChange={(e) => onUpdate({ src: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="alt">Alt Text</Label>
              <Input
                id="alt"
                value={element.alt || ''}
                onChange={(e) => onUpdate({ alt: e.target.value })}
                placeholder="Bildbeschreibung..."
              />
            </div>
          </div>
        );

      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="placeholder">Platzhalter Text</Label>
              <Input
                id="placeholder"
                value={element.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Eingabe..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium capitalize">{element.type} Eigenschaften</h4>
        <Button onClick={onDelete} size="sm" variant="destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {renderProperties()}
    </div>
  );
};
