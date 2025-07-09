import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Minus, Code } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Element {
  id: string;
  type: 'text' | 'button' | 'image' | 'input' | 'link-text' | 'youtube' | 'video' | 'topbar';
  content?: string;
  text?: string;
  src?: string;
  alt?: string;
  placeholder?: string;
  inputId?: string;
  inputType?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  url?: string;
  customJS?: string;
  label?: string;
  buttons?: Array<{text: string, backgroundColor: string, customJS?: string}>;
  animation?: string;
  animationSpeed?: string;
  animationDirection?: string;
  x?: number;
  y?: number;
  xPx?: number;
  yPx?: number;
  fontFamily?: string;
  zIndex?: number;
  // Video options
  videoUrl?: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
}

interface ElementPropertiesProps {
  element: Element;
  onUpdate: (updates: Partial<Element>) => void;
  onDelete: () => void;
  onOpenCodeBuilder?: (initialCode?: string, onSave?: (code: string) => void) => void;
}

export const ElementProperties = ({ element, onUpdate, onDelete, onOpenCodeBuilder }: ElementPropertiesProps) => {
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

  const animationOptions = [
    { value: '', label: 'None' },
    { value: 'fade-in', label: 'Fade In' },
    { value: 'fly-in', label: 'Fly In' },
    { value: 'zoom-in', label: 'Zoom In' },
    { value: 'slide-in', label: 'Slide In' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'flip', label: 'Flip' },
  ];
  const speedOptions = [
    { value: 'slow', label: 'Slow' },
    { value: 'normal', label: 'Normal' },
    { value: 'fast', label: 'Fast' },
  ];
  const directionOptions = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'up', label: 'Up' },
    { value: 'down', label: 'Down' },
  ];

  const fontOptions = [
    { value: '', label: 'Standard (Inherit)' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma' },
    { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
    { value: 'Comic Sans MS, Comic Sans, cursive', label: 'Comic Sans' },
    { value: 'Impact, Charcoal, sans-serif', label: 'Impact' },
    { value: 'Lucida Console, Monaco, monospace', label: 'Lucida Console' },
    { value: 'Palatino Linotype, Book Antiqua, Palatino, serif', label: 'Palatino' },
    { value: 'Garamond, serif', label: 'Garamond' },
    { value: 'Brush Script MT, cursive', label: 'Brush Script' },
    { value: 'Franklin Gothic Medium, Arial Narrow, Arial, sans-serif', label: 'Franklin Gothic' },
    { value: 'Gill Sans, Gill Sans MT, Calibri, sans-serif', label: 'Gill Sans' },
    { value: 'Futura, Trebuchet MS, Arial, sans-serif', label: 'Futura' },
    { value: 'Copperplate, Papyrus, fantasy', label: 'Copperplate' },
    { value: 'Monaco, monospace', label: 'Monaco' },
  ];

  const renderAnimationProperties = () => {
    if (element.type === 'video') return null;
    return (
      <div className="space-y-2 mt-4">
        <Label htmlFor="animation">Animation</Label>
        <select
          id="animation"
          value={element.animation || ''}
          onChange={e => onUpdate({ animation: e.target.value, animationSpeed: undefined, animationDirection: undefined })}
          className="w-full p-2 border border-gray-300 rounded"
        >
          {animationOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {element.animation && element.animation !== '' && (
          <>
            <Label htmlFor="animationSpeed">Speed</Label>
            <select
              id="animationSpeed"
              value={element.animationSpeed || 'normal'}
              onChange={e => onUpdate({ animationSpeed: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded"
            >
              {speedOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {['fly-in', 'slide-in', 'bounce'].includes(element.animation) && (
              <>
                <Label htmlFor="animationDirection">Direction</Label>
                <select
                  id="animationDirection"
                  value={element.animationDirection || 'left'}
                  onChange={e => onUpdate({ animationDirection: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {directionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPositionControls = () => (
    <div className="flex gap-2 mt-2">
      <div>
        <Label htmlFor="xPx">X (px)</Label>
        <Input
          id="xPx"
          type="number"
          value={element.xPx ?? ''}
          onChange={e => {
            let xVal = parseInt(e.target.value, 10);
            if (!Number.isFinite(xVal)) xVal = 0;
            xVal = Math.max(0, Math.min(1200, xVal)); // Clamp to editor width
            onUpdate({ xPx: xVal });
          }}
          min="0"
          max="1200"
          step="1"
        />
        <div className="text-xs text-gray-500">{element.x !== undefined ? `${element.x.toFixed(1)}%` : ''}</div>
      </div>
      <div>
        <Label htmlFor="yPx">Y (px)</Label>
        <Input
          id="yPx"
          type="number"
          value={element.yPx ?? ''}
          onChange={e => {
            let yVal = parseInt(e.target.value, 10);
            if (!Number.isFinite(yVal)) yVal = 0;
            yVal = Math.max(0, Math.min(800, yVal)); // Clamp to editor height (default 800, should be dynamic)
            onUpdate({ yPx: yVal });
          }}
          min="0"
          max="800"
          step="1"
        />
        <div className="text-xs text-gray-500">{element.y !== undefined ? `${element.y.toFixed(1)}%` : ''}</div>
      </div>
    </div>
  );

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
            <div>
              <Label htmlFor="fontFamily">Schriftart</Label>
              <select
                id="fontFamily"
                value={element.fontFamily || ''}
                onChange={e => onUpdate({ fontFamily: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {fontOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value || 'inherit' }}>{opt.label}</option>
                ))}
              </select>
            </div>
            {renderAnimationProperties()}
            {renderPositionControls()}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="customJS">Custom JavaScript</Label>
                {onOpenCodeBuilder && (
                  <Button
                    onClick={() => onOpenCodeBuilder(element.customJS)}
                    size="sm"
                    variant="outline"
                    className="h-7"
                  >
                    <Code className="h-3 w-3 mr-1" />
                    Visual Builder
                  </Button>
                )}
              </div>
              <Textarea
                id="customJS"
                value={element.customJS || ''}
                onChange={(e) => onUpdate({ customJS: e.target.value })}
                placeholder="alert('Hello World!');"
              />
            </div>
            <div>
              <Label htmlFor="fontFamily">Schriftart</Label>
              <select
                id="fontFamily"
                value={element.fontFamily || ''}
                onChange={e => onUpdate({ fontFamily: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {fontOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value || 'inherit' }}>{opt.label}</option>
                ))}
              </select>
            </div>
            {renderAnimationProperties()}
            {renderPositionControls()}
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
            <div>
              <Label htmlFor="fontFamily">Schriftart</Label>
              <select
                id="fontFamily"
                value={element.fontFamily || ''}
                onChange={e => onUpdate({ fontFamily: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {fontOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value || 'inherit' }}>{opt.label}</option>
                ))}
              </select>
            </div>
            {renderAnimationProperties()}
            {renderPositionControls()}
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
            {renderAnimationProperties()}
            {renderPositionControls()}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={element.videoUrl || ''}
                onChange={(e) => onUpdate({ videoUrl: e.target.value })}
                placeholder="https://example.com/video.mp4"
              />
            </div>
            <div>
              <Label htmlFor="videoAutoplay">Autoplay</Label>
              <input
                id="videoAutoplay"
                type="checkbox"
                checked={element.videoAutoplay || false}
                onChange={e => {
                  if (e.target.checked) {
                    onUpdate({ videoAutoplay: true, videoMuted: true });
                  } else {
                    onUpdate({ videoAutoplay: false });
                  }
                }}
                className="ml-2"
              />
            </div>
            <div>
              <Label htmlFor="videoControls">Controls</Label>
              <input
                id="videoControls"
                type="checkbox"
                checked={element.videoControls || false}
                onChange={e => onUpdate({ videoControls: e.target.checked })}
                className="ml-2"
              />
            </div>
            <div>
              <Label htmlFor="videoLoop">Loop</Label>
              <input
                id="videoLoop"
                type="checkbox"
                checked={element.videoLoop || false}
                onChange={e => onUpdate({ videoLoop: e.target.checked })}
                className="ml-2"
              />
            </div>
            <div>
              <Label htmlFor="videoMuted">Muted</Label>
              <input
                id="videoMuted"
                type="checkbox"
                checked={element.videoAutoplay ? true : (element.videoMuted || false)}
                onChange={e => onUpdate({ videoMuted: e.target.checked })}
                className="ml-2"
                disabled={element.videoAutoplay}
              />
              {element.videoAutoplay && (
                <span className="text-xs text-gray-500 ml-2">(Autoplay erfordert Stummschaltung)</span>
              )}
            </div>
            {renderPositionControls()}
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">JavaScript:</span>
                        {onOpenCodeBuilder && (
                          <Button
                            onClick={() => onOpenCodeBuilder(
                              button.customJS,
                              (code: string) => updateTopbarButton(index, { customJS: code })
                            )}
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                          >
                            <Code className="h-3 w-3 mr-1" />
                            Visual
                          </Button>
                        )}
                      </div>
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
            {renderAnimationProperties()}
            {renderPositionControls()}
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
            {renderAnimationProperties()}
            {renderPositionControls()}
          </div>
        );

      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inputId">Input ID</Label>
              <Input
                id="inputId"
                value={element.inputId || ''}
                onChange={(e) => onUpdate({ inputId: e.target.value })}
                placeholder="myInput"
              />
            </div>
            <div>
              <Label htmlFor="inputType">Input Type</Label>
              <select
                id="inputType"
                value={element.inputType || 'text'}
                onChange={(e) => onUpdate({ inputType: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="password">Password</option>
                <option value="number">Number</option>
                <option value="tel">Phone</option>
                <option value="url">URL</option>
              </select>
            </div>
            <div>
              <Label htmlFor="placeholder">Platzhalter Text</Label>
              <Input
                id="placeholder"
                value={element.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Eingabe..."
              />
            </div>
            {renderAnimationProperties()}
            {renderPositionControls()}
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
        <div className="flex items-center gap-2">
          {/* Z-Index Controls */}
          <Button size="sm" variant="outline" onClick={() => onUpdate({ zIndex: (element.zIndex || 0) + 1 })} title="Move Forward">
            <ArrowUp className="h-3 w-3" />
          </Button>
          <span className="text-xs w-6 text-center">{element.zIndex ?? 0}</span>
          <Button size="sm" variant="outline" onClick={() => onUpdate({ zIndex: (element.zIndex || 0) - 1 })} title="Move Back">
            <ArrowDown className="h-3 w-3" />
          </Button>
          {/* Delete Button */}
          <Button onClick={onDelete} size="sm" variant="destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {renderProperties()}
    </div>
  );
};
