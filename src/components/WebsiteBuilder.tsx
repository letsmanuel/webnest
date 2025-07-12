import { useState, useEffect, useCallback, useRef, useLayoutEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { websiteService, Website } from '@/services/websiteService';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Eye, Globe, Type, Image, Square, MousePointer, Link, Youtube, Moon, Menu, GripVertical, Code, X, Play, ExternalLink, MessageSquare, AlertCircle, CheckCircle, Users, UploadCloud, Settings as SettingsIcon, Zap, Clock } from 'lucide-react';
import { ElementProperties } from './ElementProperties';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toICO from '2ico';
import { Timestamp } from 'firebase/firestore';
import ReactDOM from 'react-dom';

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
  // Animation properties
  animation?: string;
  animationSpeed?: string;
  animationDirection?: string;
  // Position properties
  x?: number;
  y?: number;
  xPx?: number;
  yPx?: number;
  fontFamily?: string;
  // Scaling properties
  widthPx?: number;
  heightPx?: number;
  zIndex?: number;
  // Video options
  videoUrl?: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
}

interface WebsiteBuilderProps {
  website: Website;
  onSave: () => void;
  onBack: () => void;
  // Collaborative editing props
  customAddElement?: (type: Element['type']) => void;
  customUpdateElement?: (id: string, updates: Partial<Element>) => void;
  customDeleteElement?: (id: string) => void;
  customReorderElements?: (elements: Element[]) => void;
  elements?: Element[];
  isCollaborative?: boolean;
}

// Code Builder Interfaces
interface CodeBlock {
  id: string;
  type: 'redirect' | 'alert' | 'console' | 'custom' | 'read-input' | 'set-variable' | 'use-variable';
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
  params: Array<{
    name: string;
    type: 'text' | 'select' | 'variable';
    placeholder?: string;
    options?: Array<{value: string, label: string}>;
  }>;
}

interface CodeBlockInstance {
  id: string;
  blockType: string;
  params: Record<string, string>;
  markedVariables?: Record<string, string[]>; // Track which parts are marked as variables
}

interface TextSegment {
  text: string;
  type: 'string' | 'number' | 'variable';
  start: number;
  end: number;
}

interface CodeBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (code: string) => void;
  initialCode?: string;
  availableInputs?: Array<{id: string, type: string}>;
}

const availableElements = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'button', icon: MousePointer, label: 'Button' },
  { type: 'image', icon: Image, label: 'Bild' },
  { type: 'video', icon: Play, label: 'Video' },
  { type: 'input', icon: Square, label: 'Eingabefeld' },
  { type: 'link-text', icon: Link, label: 'Link Text' },
  { type: 'youtube', icon: Youtube, label: 'YouTube' },
  { type: 'topbar', icon: Menu, label: 'Topbar' }
];

// Simplified Code Blocks
const codeBlocks: CodeBlock[] = [
  {
    id: 'redirect',
    type: 'redirect',
    label: 'Redirect To URL',
    icon: ExternalLink,
    color: 'bg-blue-500',
    description: 'Navigate to a different webpage',
    params: [
      {
        name: 'url',
        type: 'text',
        placeholder: 'https://example.com'
      }
    ]
  },
  {
    id: 'alert',
    type: 'alert',
    label: 'Show Alert',
    icon: AlertCircle,
    color: 'bg-yellow-500',
    description: 'Display a popup message',
    params: [
      {
        name: 'message',
        type: 'text',
        placeholder: 'Enter your message'
      }
    ]
  },
  {
    id: 'console',
    type: 'console',
    label: 'Log to Console',
    icon: MessageSquare,
    color: 'bg-green-500',
    description: 'Print message to browser console',
    params: [
      {
        name: 'message',
        type: 'text',
        placeholder: 'Message to log'
      }
    ]
  },
  {
    id: 'read-input',
    type: 'read-input',
    label: 'Read Input Value',
    icon: Square,
    color: 'bg-orange-500',
    description: 'Get value from an input field',
    params: [
      {
        name: 'inputId',
        type: 'select',
        placeholder: 'Select input field'
      },
      {
        name: 'variableName',
        type: 'text',
        placeholder: 'Variable name to store value'
      }
    ]
  },
  {
    id: 'set-variable',
    type: 'set-variable',
    label: 'Set Variable',
    icon: CheckCircle,
    color: 'bg-purple-500',
    description: 'Create or update a variable',
    params: [
      {
        name: 'variableName',
        type: 'text',
        placeholder: 'Variable name'
      },
      {
        name: 'value',
        type: 'text',
        placeholder: 'Variable value'
      }
    ]
  },
  {
    id: 'use-variable',
    type: 'use-variable',
    label: 'Use Variable',
    icon: MessageSquare,
    color: 'bg-indigo-500',
    description: 'Reference a previously set variable',
    params: [
      {
        name: 'variableName',
        type: 'select',
        placeholder: 'Select variable to use'
      }
    ]
  },
  {
    id: 'custom',
    type: 'custom',
    label: 'Custom JavaScript',
    icon: Code,
    color: 'bg-gray-500',
    description: 'Write your own JavaScript code',
    params: [
      {
        name: 'code',
        type: 'text',
        placeholder: '// Your custom code here'
      }
    ]
  }
];

// Custom Text Input Component with Syntax Highlighting
const SyntaxTextInput = ({ 
  value, 
  onChange, 
  placeholder, 
  availableVariables = [],
  onMarkVariable,
  markedVariables = [],
  autoFocus,
  onBlur,
  onFocus
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
  availableVariables?: Array<{value: string, label: string}>;
  onMarkVariable?: (text: string) => void;
  markedVariables?: string[];
  autoFocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}) => {
  const [selection, setSelection] = useState<{start: number, end: number} | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    onChange(currentValue);
    
    // Ensure focus is maintained after each keystroke
    requestAnimationFrame(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
        // Restore cursor position
        const newPosition = Math.min(cursorPosition, currentValue.length);
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    });
  }, [onChange]);

  const handleFocus = useCallback(() => {
    // Don't auto-select - let user type normally
    // Auto-select only happens on double-click or when user explicitly wants it
  }, []);

  const handleMouseUp = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start !== end) {
      setSelection({ start, end });
      // Position menu near the input field
      const rect = input.getBoundingClientRect();
      setContextMenuPosition({ 
        x: rect.left + (rect.width / 2), 
        y: rect.bottom + 5 
      });
      setShowContextMenu(true);
    } else {
      setSelection(null);
      setShowContextMenu(false);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start !== end) {
      setSelection({ start, end });
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setSelection(null);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Clean up empty strings and unnecessary quotes
  useEffect(() => {
    if (!value) return;
    
    // Clean up patterns like: " + " or ' + ' or " + variable + "
    let cleanedValue = value;
    
    // Remove empty string concatenations
    cleanedValue = cleanedValue.replace(/\s*\+\s*""\s*\+\s*/g, ' + ');
    cleanedValue = cleanedValue.replace(/\s*\+\s*''\s*\+\s*/g, ' + ');
    
    // Clean up leading/trailing empty strings
    cleanedValue = cleanedValue.replace(/^\s*\+\s*""\s*/, '');
    cleanedValue = cleanedValue.replace(/\s*\+\s*""\s*$/, '');
    cleanedValue = cleanedValue.replace(/^\s*\+\s*''\s*/, '');
    cleanedValue = cleanedValue.replace(/\s*\+\s*''\s*$/, '');
    
    // Clean up double concatenations
    cleanedValue = cleanedValue.replace(/\s*\+\s*\+\s*/g, ' + ');
    
    // If the cleaned value is different, update it
    if (cleanedValue !== value) {
      onChange(cleanedValue);
    }
  }, [value, onChange]);



  const convertSelection = useCallback((type: 'number' | 'variable') => {
    if (!selection || !inputRef.current) return;

    const selectedText = value.substring(selection.start, selection.end);
    let newValue = value;
    let needsConcatenation = false;
    let cleanText = '';

    if (type === 'number') {
      // Remove quotes if present and ensure it's a number
      cleanText = selectedText.replace(/^"|"$/g, '');
      if (!isNaN(Number(cleanText))) {
        // Check if we need to add quotes around the selection
        const beforeSelection = value.substring(0, selection.start);
        const afterSelection = value.substring(selection.end);
        
        // If there are quotes before or after, we need to handle string concatenation
        needsConcatenation = (beforeSelection.trim().endsWith('"') && afterSelection.trim().startsWith('"')) ||
                            (beforeSelection.trim().endsWith("'") && afterSelection.trim().startsWith("'"));
        
        if (needsConcatenation) {
          // Remove the quotes and add concatenation
          const beforeQuotes = beforeSelection.replace(/["']$/, '');
          const afterQuotes = afterSelection.replace(/^["']/, '');
          newValue = beforeQuotes + ' + ' + cleanText + ' + "' + afterQuotes + '"';
        } else {
          newValue = value.substring(0, selection.start) + cleanText + value.substring(selection.end);
        }
      }
    } else if (type === 'variable') {
      // Remove quotes if present
      cleanText = selectedText.replace(/^"|"$/g, '');
      
      // Check if we need to add quotes around the selection
      const beforeSelection = value.substring(0, selection.start);
      const afterSelection = value.substring(selection.end);
      
      // If there are quotes before or after, we need to handle string concatenation
      needsConcatenation = (beforeSelection.trim().endsWith('"') && afterSelection.trim().startsWith('"')) ||
                          (beforeSelection.trim().endsWith("'") && afterSelection.trim().startsWith("'"));
      
      if (needsConcatenation) {
        // Remove the quotes and add concatenation
        const beforeQuotes = beforeSelection.replace(/["']$/, '');
        const afterQuotes = afterSelection.replace(/^["']/, '');
        newValue = beforeQuotes + ' + ' + cleanText + ' + "' + afterQuotes + '"';
      } else {
        newValue = value.substring(0, selection.start) + cleanText + value.substring(selection.end);
      }
      
      // Notify parent about marked variable
      if (onMarkVariable) {
        onMarkVariable(cleanText);
      }
    }

    onChange(newValue);
    setShowContextMenu(false);
    setSelection(null);
    
    // Restore focus and cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        
        // Calculate new cursor position based on the conversion
        let newCursorPosition = selection.start;
        
        if (needsConcatenation) {
          // Position after the converted text in the concatenation
          newCursorPosition = selection.start + cleanText.length + 3; // +3 for " + "
        } else {
          newCursorPosition = selection.start + cleanText.length;
        }
        
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [selection, value, onChange, onMarkVariable]);

  // Helper function to get syntax preview
  const getSyntaxPreview = useCallback(() => {
    if (!value) return null;
    
    // Parse the expression more intelligently
    const parts = value.split(/(\s*\+\s*)/);
    return (
      <div className="mt-1 text-xs font-mono">
        {parts.map((part, index) => {
          const trimmedPart = part.trim();
          
          if (!trimmedPart || trimmedPart === '+') {
            return <span key={index}>{part}</span>;
          }
          
          // Check if it's a number
          if (!isNaN(Number(trimmedPart)) && trimmedPart !== '') {
            return <span key={index} className="text-blue-600">{trimmedPart}</span>;
          }
          
          // Check if it's a marked variable
          if (markedVariables.includes(trimmedPart)) {
            return <span key={index} className="text-green-600">{trimmedPart}</span>;
          }
          
          // Check if it's a known variable
          const isKnownVariable = availableVariables.some(v => v.value === trimmedPart);
          
          if (isKnownVariable) {
            return <span key={index} className="text-green-600">{trimmedPart}</span>;
          }
          
          // Check if it's already quoted
          if ((trimmedPart.startsWith('"') && trimmedPart.endsWith('"')) ||
              (trimmedPart.startsWith("'") && trimmedPart.endsWith("'"))) {
            return <span key={index} className="text-gray-600">{trimmedPart}</span>;
          }
          
          // Everything else is a string that needs quotes
          return <span key={index} className="text-gray-600">"{trimmedPart}"</span>;
        })}
      </div>
    );
  }, [value, markedVariables, availableVariables]);

  // Context menu button handlers
  const handleMakeNumber = useCallback(() => {
    convertSelection('number');
  }, [convertSelection]);

  const handleMarkAsVariable = useCallback(() => {
    convertSelection('variable');
  }, [convertSelection]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={e => { handleFocus(); if (typeof onFocus === 'function') onFocus(); }}
        onBlur={e => { if (typeof onBlur === 'function') onBlur(); }}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        className="h-9"
        autoFocus={autoFocus}
      />

      {/* Syntax preview */}
      {getSyntaxPreview()}

      {/* Context menu */}
      {showContextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-lg py-1 min-w-32"
          style={{ 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y,
            transform: 'translate(-50%, 0)'
          }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            onClick={handleMakeNumber}
          >
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            Make Number
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            onClick={handleMarkAsVariable}
          >
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            Mark as Variable
          </button>
        </div>
      )}
    </div>
  );
};

// Code Builder Component
const CodeBuilder = ({ isOpen, onClose, onSave, initialCode, availableInputs = [] }: CodeBuilderProps) => {
  const [blocks, setBlocks] = useState<CodeBlockInstance[]>([]);
  const [draggedBlock, setDraggedBlock] = useState<CodeBlock | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  // In CodeBuilder, for each block's text input param, make the input autoFocus if it is the most recently added or currently being edited.
  // Add a state to track the currently focused param for each block
  const [focusedParam, setFocusedParam] = useState<{ blockId: string, paramName: string } | null>(null);

  // Parse initial code when component mounts
  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      const parsedBlocks = parseCodeToBlocks(initialCode);
      setBlocks(parsedBlocks);
    } else {
      setBlocks([]);
    }
  }, [initialCode]);

  const parseCodeToBlocks = (code: string): CodeBlockInstance[] => {
    const blocks: CodeBlockInstance[] = [];
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let blockId = Date.now().toString() + i;
      
      // Parse redirect
      const redirectMatch = line.match(/window\.location\.href\s*=\s*(.+);?$/);
      if (redirectMatch) {
        const urlValue = redirectMatch[1].trim();
        const { processedValue, markedVariables } = parseExpression(urlValue);
        blocks.push({
          id: blockId,
          blockType: 'redirect',
          params: { url: processedValue },
          markedVariables: { url: markedVariables }
        });
        continue;
      }
      
      // Parse alert
      const alertMatch = line.match(/alert\s*\(\s*(.+)\s*\);?$/);
      if (alertMatch) {
        const messageValue = alertMatch[1].trim();
        const { processedValue, markedVariables } = parseExpression(messageValue);
        blocks.push({
          id: blockId,
          blockType: 'alert',
          params: { message: processedValue },
          markedVariables: { message: markedVariables }
        });
        continue;
      }
      
      // Parse console.log
      const consoleMatch = line.match(/console\.log\s*\(\s*(.+)\s*\);?$/);
      if (consoleMatch) {
        const messageValue = consoleMatch[1].trim();
        const { processedValue, markedVariables } = parseExpression(messageValue);
        blocks.push({
          id: blockId,
          blockType: 'console',
          params: { message: processedValue },
          markedVariables: { message: markedVariables }
        });
        continue;
      }
      
      // Parse read-input (document.getElementById)
      const readInputMatch = line.match(/const\s+(\w+)\s*=\s*document\.getElementById\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\.value;?$/);
      if (readInputMatch) {
        blocks.push({
          id: blockId,
          blockType: 'read-input',
          params: { 
            variableName: readInputMatch[1],
            inputId: readInputMatch[2]
          }
        });
        continue;
      }
      
      // Parse set-variable
      const setVarMatch = line.match(/(?:let|var|const)\s+(\w+)\s*=\s*(.+);?$/);
      if (setVarMatch) {
        const variableName = setVarMatch[1];
        const valueExpression = setVarMatch[2].trim();
        const { processedValue, markedVariables } = parseExpression(valueExpression);
        blocks.push({
          id: blockId,
          blockType: 'set-variable',
          params: { 
            variableName: variableName,
            value: processedValue
          },
          markedVariables: { value: markedVariables }
        });
        continue;
      }
      
      // Parse use-variable (standalone variable)
      const useVarMatch = line.match(/^(\w+);?$/);
      if (useVarMatch) {
        const variableName = useVarMatch[1];
        // Check if this variable exists in any set-variable blocks
        const isKnownVariable = blocks.some(block => 
          block.blockType === 'set-variable' && block.params.variableName === variableName
        );
        if (isKnownVariable) {
          blocks.push({
            id: blockId,
            blockType: 'use-variable',
            params: { variableName: variableName }
          });
          continue;
        }
      }
      
      // If no pattern matches, add as custom JavaScript
      blocks.push({
        id: blockId,
        blockType: 'custom',
        params: { code: line }
      });
    }
    
    return blocks;
  };

  // Helper function to parse expressions and extract marked variables
  const parseExpression = (expression: string): { processedValue: string, markedVariables: string[] } => {
    const markedVariables: string[] = [];
    let processedValue = expression;
    
    // Remove outer quotes if present
    if ((processedValue.startsWith('"') && processedValue.endsWith('"')) ||
        (processedValue.startsWith("'") && processedValue.endsWith("'"))) {
      processedValue = processedValue.slice(1, -1);
    }
    
    // Split by + and process each part
    const parts = processedValue.split(/\s*\+\s*/);
    const processedParts = parts.map(part => {
      const trimmedPart = part.trim();
      
      // Check if it's a number
      if (!isNaN(Number(trimmedPart)) && trimmedPart !== '') {
        return trimmedPart;
      }
      
      // Check if it's a variable (no quotes, valid identifier)
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedPart)) {
        markedVariables.push(trimmedPart);
        return trimmedPart;
      }
      
      // Everything else is a string
      return `"${trimmedPart}"`;
    });
    
    return {
      processedValue: processedParts.join(' + '),
      markedVariables
    };
  };

  const generateCodeFromBlocks = (): string => {
    return blocks.map(block => {
      const blockDef = codeBlocks.find(b => b.id === block.blockType);
      if (!blockDef) return '';
      
      switch (block.blockType) {
        case 'redirect':
          return `window.location.href = "${block.params.url || 'https://example.com'}";`;
        case 'alert':
          return `alert(${processVariableReferences(block.params.message || 'Hello World!', block.markedVariables?.message || [])});`;
        case 'console':
          return `console.log(${processVariableReferences(block.params.message || 'Button clicked!', block.markedVariables?.message || [])});`;
        case 'read-input':
          return `const ${block.params.variableName || 'inputValue'} = document.getElementById("${block.params.inputId || 'myInput'}").value;`;
        case 'set-variable':
          return `let ${block.params.variableName || 'myVar'} = ${processVariableReferences(block.params.value || '', block.markedVariables?.value || [])};`;
        case 'use-variable':
          return `${block.params.variableName || 'myVar'}`;
        case 'custom':
          return block.params.code || '// Your custom code here';
        default:
          return '';
      }
    }).join('\n');
  };

  // Helper function to process variable references in strings
  const processVariableReferences = (text: string, markedVariables: string[] = []): string => {
    if (!text) return '""';
    
    // Simple approach: split by spaces and + signs, then process each part
    const parts = text.split(/(\s+|\+)/);
    const processedParts = parts.map(part => {
      const trimmedPart = part.trim();
      
      // Skip empty parts and operators
      if (!trimmedPart || trimmedPart === '+' || trimmedPart === '') {
        return part;
      }
      
      // Check if it's a number
      if (!isNaN(Number(trimmedPart)) && trimmedPart !== '') {
        return trimmedPart; // Numbers don't need quotes
      }
      
      // Check if it's a marked variable
      if (markedVariables.includes(trimmedPart)) {
        return trimmedPart; // Marked variables don't need quotes
      }
      
      // Check if it's a known variable
      const isKnownVariable = blocks.some(block => 
        block.blockType === 'set-variable' && block.params.variableName === trimmedPart
      );
      
      if (isKnownVariable) {
        return trimmedPart; // Variables don't need quotes
      }
      
      // Everything else is a string
      return `"${trimmedPart}"`;
    });
    
    return processedParts.join('');
  };



  const addBlock = (blockType: string) => {
    const blockDef = codeBlocks.find(b => b.id === blockType);
    if (!blockDef) return;
    
    const newBlock: CodeBlockInstance = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      blockType,
      params: {}
    };
    
    // Initialize params with empty values
    blockDef.params.forEach(param => {
      newBlock.params[param.name] = '';
    });
    
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlockParam = (blockId: string, paramName: string, value: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId 
          ? { ...block, params: { ...block.params, [paramName]: value } }
          : block
      )
    );
  };

  const removeBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(block => block.id !== blockId));
    setEditingBlock(null);
  };

  // Get available variables from set-variable blocks
  const getAvailableVariables = useCallback(() => {
    return blocks
      .filter(block => block.blockType === 'set-variable' && block.params.variableName)
      .map(block => ({
        value: block.params.variableName,
        label: `${block.params.variableName} (${block.params.value || 'empty'})`
      }));
  }, [blocks]);

  const handleSave = () => {
    const generatedCode = generateCodeFromBlocks();
    onSave(generatedCode);
    onClose();
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, block: CodeBlock) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlock) {
      addBlock(draggedBlock.id);
      setDraggedBlock(null);
    }
  };

  // Block Component
  const BlockComponent = ({ block, index }: { block: CodeBlockInstance; index: number }) => {
    const blockDef = codeBlocks.find(b => b.id === block.blockType);
    if (!blockDef) return null;

    const isEditing = editingBlock === block.id;

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${blockDef.color} text-white`}>
              <blockDef.icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{blockDef.label}</h4>
              <p className="text-sm text-gray-500">{blockDef.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingBlock(isEditing ? null : block.id)}
              className="h-8 w-8 p-0"
            >
              {isEditing ? <X className="h-4 w-4" /> : <Code className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeBlock(block.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {blockDef.params.map((param) => (
              <div key={param.name}>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">
                  {param.name}:
                </Label>
                                 {param.type === 'select' ? (
                   <Select
                     value={block.params[param.name] || ''}
                     onValueChange={(value) => updateBlockParam(block.id, param.name, value)}
                   >
                     <SelectTrigger className="h-9">
                       <SelectValue placeholder={param.placeholder} />
                     </SelectTrigger>
                     <SelectContent>
                       {blockDef.type === 'read-input' && param.name === 'inputId' ? (
                         // Show available inputs
                         availableInputs.map((input) => (
                           <SelectItem key={input.id} value={input.id}>
                             {input.id} ({input.type})
                           </SelectItem>
                         ))
                       ) : blockDef.type === 'use-variable' && param.name === 'variableName' ? (
                         // Show available variables
                         getAvailableVariables().map((variable) => (
                           <SelectItem key={variable.value} value={variable.value}>
                             {variable.label}
                           </SelectItem>
                         ))
                       ) : null}
                     </SelectContent>
                   </Select>
                                  ) : (
                   <div className="space-y-2">
                     <SyntaxTextInput
                       value={block.params[param.name] || ''}
                       onChange={useCallback((value) => updateBlockParam(block.id, param.name, value), [block.id, param.name])}
                       placeholder={param.placeholder}
                       availableVariables={getAvailableVariables()}
                       markedVariables={block.markedVariables?.[param.name] || []}
                       onMarkVariable={useCallback((variableName) => {
                         // Track marked variables for this block
                         // Only update if the variable isn't already marked
                         const currentMarked = block.markedVariables?.[param.name] || [];
                         if (!currentMarked.includes(variableName)) {
                           const updatedMarked = [...currentMarked, variableName];
                           setBlocks(prevBlocks => 
                             prevBlocks.map(b => 
                               b.id === block.id 
                                 ? { 
                                     ...b, 
                                     markedVariables: { 
                                       ...b.markedVariables, 
                                       [param.name]: updatedMarked 
                                     } 
                                   }
                                 : b
                             )
                           );
                         }
                       }, [block.id, block.markedVariables, param.name])}
                       autoFocus={focusedParam && focusedParam.blockId === block.id && focusedParam.paramName === param.name}
                       onBlur={() => setFocusedParam(null)}
                       onFocus={() => {
                         if (!focusedParam || focusedParam.blockId !== block.id || focusedParam.paramName !== param.name) {
                           setFocusedParam({ blockId: block.id, paramName: param.name });
                         }
                       }}
                     />
                     {/* Show variable buttons for quick insertion */}
                     {(blockDef.type === 'alert' || blockDef.type === 'console' || blockDef.type === 'set-variable' || blockDef.type === 'custom') && (
                       <div className="flex flex-wrap gap-1">
                         {getAvailableVariables().map((variable) => (
                           <button
                             key={variable.value}
                             type="button"
                             className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                             onClick={useCallback(() => {
                               const currentValue = block.params[param.name] || '';
                               const newValue = currentValue + (currentValue ? ' + ' : '') + variable.value;
                               updateBlockParam(block.id, param.name, newValue);
                             }, [block.id, block.params, param.name, variable.value])}
                           >
                             {variable.value}
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}
           </div>
         )}
       </div>
     );
   };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-11/12 max-w-7xl h-5/6 flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white dark:bg-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Visual Code Builder</h2>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setBlocks([])}>
              Clear All
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Code
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Blocks Palette */}
          <div className="w-80 border-r border-gray-200 bg-gray-50 dark:bg-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Available Blocks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Drag blocks to the workspace or click to add</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {codeBlocks.map((block) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block)}
                    className={`p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-all duration-200 ${block.color} text-white shadow-sm hover:shadow-md hover:scale-[1.02]`}
                    onClick={() => addBlock(block.id)}
                  >
                    <div className="flex items-center gap-3">
                      <block.icon className="h-5 w-5" />
                      <div>
                        <div className="font-semibold text-sm">{block.label}</div>
                        <div className="text-xs opacity-90">{block.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Your Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Build your JavaScript code by adding and configuring blocks</p>
            </div>
            
            <div 
              className="flex-1 overflow-y-auto p-6"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="min-h-64">
                {blocks.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <Code className="mx-auto h-16 w-16 mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No blocks yet</p>
                    <p className="text-sm text-gray-400 mt-2">Drag blocks from the left or click to add them</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blocks.map((block, index) => (
                      <BlockComponent key={block.id} block={block} index={index} />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Generated Code Preview */}
              {blocks.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Generated JavaScript:</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          const code = generateCodeFromBlocks();
                          const safeEval = new Function(code);
                          safeEval();
                        } catch (error) {
                          console.error('Code execution error:', error);
                        }
                      }}
                      className="hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Test Code
                    </Button>
                  </div>
                  <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    <pre className="text-green-400 p-4 text-sm overflow-x-auto font-mono max-h-64 overflow-y-auto">
                      <code>{generateCodeFromBlocks()}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sortable Element Component
interface SortableElementProps {
  element: Element;
  isSelected: boolean;
  onSelect: (element: Element) => void;
  children: React.ReactNode;
}

const SortableElement = ({ element, isSelected, onSelect, children }: SortableElementProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'} border-2 transition-all`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      
      {/* Element Content */}
      <div onClick={() => onSelect(element)}>
        {children}
      </div>
    </div>
  );
};

// Helper to get animation class
const getAnimationClass = (element: Element) => {
  if (!element.animation || element.animation === '') return '';
  let base = 'webnest-animate-' + element.animation;
  if (element.animationSpeed) base += ` webnest-animate-speed-${element.animationSpeed}`;
  if (element.animationDirection) base += ` webnest-animate-direction-${element.animationDirection}`;
  return base;
};

// Helper to render the content of an element (for preview and for renderElement)
function renderElementContent(element: Element) {
  const scalableStyle = (el: Element) =>
    (el.widthPx || el.heightPx)
      ? { width: el.widthPx ? `${el.widthPx}px` : undefined, height: el.heightPx ? `${el.heightPx}px` : undefined }
      : undefined;
  switch (element.type) {
    case 'text':
      return (
        <div className={getAnimationClass(element)}>
          <p className="p-2 mb-4 cursor-pointer" style={{ fontSize: `${element.fontSize}px`, fontFamily: element.fontFamily || undefined, color: element.color }}>
            {(element.content || 'Text').split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < (element.content || 'Text').split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      );
    case 'button':
      return (
        <div className={getAnimationClass(element)}><button
          className="px-4 py-2 rounded mb-4 text-foreground font-medium cursor-pointer"
          style={{ backgroundColor: element.backgroundColor, fontFamily: element.fontFamily || undefined, ...scalableStyle(element) }}
        >
          {(element.text || 'Button').split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < (element.text || 'Button').split('\n').length - 1 && <br />}
            </span>
          ))}
        </button></div>
      );
    case 'image':
      return (
        <div className={getAnimationClass(element)}><img
          src={element.src || '/placeholder.svg'}
          alt={element.alt || 'Bild'}
          className="max-w-full h-auto mb-4 rounded cursor-pointer"
          style={scalableStyle(element)}
        /></div>
      );
    case 'input':
      return (
        <div className={getAnimationClass(element)}><input
          type={element.inputType || 'text'}
          id={element.inputId || `input-${element.id}`}
          placeholder={element.placeholder || 'Eingabe...'}
          className="w-full p-2 border border-gray-300 rounded mb-4 cursor-pointer"
          readOnly
        /></div>
      );
    case 'link-text':
      return (
        <div className={getAnimationClass(element)}><p className="p-2 mb-4 cursor-pointer">
          <span 
            style={{ fontSize: `${element.fontSize}px`, fontFamily: element.fontFamily || undefined }}
            className="underline cursor-pointer text-foreground"
          >
            {element.text || 'Link Text'}
          </span>
        </p></div>
      );
    case 'youtube':
      return (
        <div className={getAnimationClass(element)}>
          <iframe
            src={element.url ? `https://www.youtube.com/embed/${websiteService.extractYouTubeVideoId(element.url)}` : ''}
            frameBorder="0"
            allowFullScreen
            className="mb-4 cursor-pointer"
            style={scalableStyle(element)}
          />
        </div>
      );
    case 'video':
      return (
        <div className={getAnimationClass(element)}>
          <video
            src={element.videoUrl || ''}
            controls={element.videoControls}
            autoPlay={element.videoAutoplay}
            loop={element.videoLoop}
            muted={element.videoAutoplay ? true : element.videoMuted}
            style={{ maxWidth: '100%', ...scalableStyle(element) }}
          />
        </div>
      );
    case 'topbar':
      return (
        <div className={getAnimationClass(element)}><div className="mb-4 cursor-pointer">
          <div className="bg-white dark:bg-gray-900 border rounded p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">{element.label || 'Navigation'}</span>
              <div className="flex gap-2 flex-wrap overflow-x-auto min-w-0">
                {(element.buttons || []).map((btn, i) => (
                  <button
                    key={i}
                    className="px-3 py-1 rounded text-sm text-foreground"
                    style={{ backgroundColor: btn.backgroundColor }}
                  >
                    {btn.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div></div>
      );
    default:
      return null;
  }
}

export const WebsiteBuilder = ({ 
  website, 
  onSave, 
  onBack,
  customAddElement,
  customUpdateElement,
  customDeleteElement,
  customReorderElements,
  elements: externalElements,
  isCollaborative = false
}: WebsiteBuilderProps) => {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishType, setPublishType] = useState<'classic' | 'custom'>('classic');
  const [customPath, setCustomPath] = useState('');
  const [checkingPath, setCheckingPath] = useState(false);
  const [existingCustomPath, setExistingCustomPath] = useState<string | null>(null);
  const [showCodeBuilder, setShowCodeBuilder] = useState(false);
  const [codeBuilderInitialCode, setCodeBuilderInitialCode] = useState<string>('');
  const [customCodeSaveHandler, setCustomCodeSaveHandler] = useState<((code: string) => void) | null>(null);
  const { toast } = useToast();
  const [editorHeight, setEditorHeight] = useState(1200);
  // At the top level of WebsiteBuilder (with other useState hooks):
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{id: string, startX: number, startY: number, startWidth: number, startHeight: number} | null>(null);
  const [editorLoading, setEditorLoading] = useState(true);
  // Add at the top level of WebsiteBuilder (with other useState hooks):
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const [faviconUsedFree, setFaviconUsedFree] = useState(!!website.favicon); // If favicon exists, free upload is used
  const [faviconModalOpen, setFaviconModalOpen] = useState(false);
  const [faviconGridAnim, setFaviconGridAnim] = useState<number[]>([]);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(website.favicon ? `data:image/x-icon;base64,${website.favicon}` : null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokingInstant, setRevokingInstant] = useState(false);
  const [revokingDelayed, setRevokingDelayed] = useState(false);
  const [undoingUnpublish, setUndoingUnpublish] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{ totalVisits: number; lastVisit: Date | null }>({ totalVisits: 0, lastVisit: null });
  const [backgroundColor, setBackgroundColor] = useState<string>(website.backgroundColor || '#ffffff');
  const editorRef = useRef<HTMLDivElement>(null);
  // At the top level of WebsiteBuilder (with other useState hooks):
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const SNAP_THRESHOLD = 8; // px
  // Add at the top level of WebsiteBuilder (with other useState hooks):
  const [snappedGuides, setSnappedGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [snappedPosition, setSnappedPosition] = useState<{ x: number; y: number } | null>(null);
  // Add at the top level of WebsiteBuilder (with other useState hooks):
  const [advancedSnapping, setAdvancedSnapping] = useState(false);
  // Add at the top level of WebsiteBuilder (with other useState hooks):
  const [showSnappingGuides, setShowSnappingGuides] = useState(true);
  // Add at the top level of WebsiteBuilder (with other useState hooks):
  const dragHoldTimeout = useRef<NodeJS.Timeout | null>(null);
  const [readyToDrag, setReadyToDrag] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 5; // px
  // In WebsiteBuilder, add state for quick properties popup:
  const [showQuickProps, setShowQuickProps] = useState(false);
  // Add at the top level of WebsiteBuilder (with other useState hooks):
  const [inlineTextEdit, setInlineTextEdit] = useState<{ id: string; value: string; field: string } | null>(null);
  // Add this at the top level of the WebsiteBuilder component
  const isOwner = true; // TODO: Replace with real ownership logic if available

  // Animation for favicon conversion
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (faviconUploading) {
      interval = setInterval(() => {
        // Animate 1-3 random chunks out of 16
        const count = Math.floor(Math.random() * 3) + 1;
        const indices = Array.from({ length: 16 }, (_, i) => i);
        const shuffled = indices.sort(() => 0.5 - Math.random());
        setFaviconGridAnim(shuffled.slice(0, count));
      }, 350);
    } else {
      setFaviconGridAnim([]);
    }
    return () => clearInterval(interval);
  }, [faviconUploading]);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Code Builder handlers
  const openCodeBuilder = (initialCode?: string, customSaveHandler?: (code: string) => void) => {
    setCodeBuilderInitialCode(initialCode || '');
    setCustomCodeSaveHandler(customSaveHandler || null);
    setShowCodeBuilder(true);
  };

  const closeCodeBuilder = () => {
    setShowCodeBuilder(false);
    setCodeBuilderInitialCode('');
  };

  const handleCodeBuilderSave = (code: string) => {
    if (customCodeSaveHandler) {
      customCodeSaveHandler(code);
      setCustomCodeSaveHandler(null);
    } else if (selectedElement) {
      updateElement(selectedElement.id, { customJS: code });
    }
    
    toast({
      title: "Code Updated",
      description: "JavaScript code has been updated",
    });
  };

  // Load existing elements from website HTML content or use external elements
  useEffect(() => {
    const width = editorRef.current?.offsetWidth || 1200;
    let height = editorHeight;
    if (Array.isArray(externalElements) && externalElements.length > 0) {
      setElements(externalElements.map(el => ({
        ...el,
        xPx: Math.round((el.x ?? 10) * width / 100),
        yPx: Math.round((el.y ?? 10) * height / 100),
      })));
    } else if (website.elementsJson) {
      try {
        const loaded = JSON.parse(website.elementsJson);
        setElements(loaded);
      } catch (error) {
        console.error('Error parsing elementsJson:', error);
        toast({
          title: "Warnung",
          description: "Konnte gespeicherte Website nicht laden. Starte mit leerer Website.",
          variant: "destructive"
        });
      }
    } else if (website.htmlContent) {
      try {
        const parsed = websiteService.parseHTML(website.htmlContent);
        if (parsed.editorHeight && parsed.editorHeight > 0) {
          setEditorHeight(parsed.editorHeight);
          height = parsed.editorHeight;
        }
        const parsedElements = (parsed.elements || []).map(el => {
          const xPx = Math.round((el.x ?? 10) * width / 100);
          const yPx = Math.round((el.y ?? 10) * height / 100);
          return {
            ...el,
            xPx,
            yPx,
            x: ((xPx / width) * 100),
            y: ((yPx / height) * 100),
          };
        });
        setElements(parsedElements);
      } catch (error) {
        console.error('Error parsing website HTML:', error);
        toast({
          title: "Warnung",
          description: "Konnte gespeicherte Website nicht laden. Starte mit leerer Website.",
          variant: "destructive"
        });
      }
    }
    // eslint-disable-next-line
  }, [website.htmlContent, externalElements, toast, editorHeight]);

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
    if (customAddElement) {
      customAddElement(type);
      return;
    }
    const maxZ = elements.length > 0 ? Math.max(...elements.map(el => el.zIndex ?? 0)) : 0;
    const newElement: Element = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Neuer Text' : undefined,
      text: type === 'button' || type === 'link-text' ? 'Button Text' : undefined,
      src: type === 'image' ? '/placeholder.svg' : undefined,
      alt: type === 'image' ? 'Bild' : undefined,
      placeholder: type === 'input' ? 'Eingabe...' : undefined,
      inputId: type === 'input' ? `input-${Date.now()}` : undefined,
      inputType: type === 'input' ? 'text' : undefined,
      url: type === 'link-text' || type === 'youtube' ? 'https://example.com' : undefined,
      color: '#333333',
      backgroundColor: '#667eea',
      fontSize: 16,
      label: type === 'topbar' ? 'Navigation' : undefined,
      buttons: type === 'topbar' ? [] : undefined,
      animation: undefined,
      animationSpeed: undefined,
      animationDirection: undefined,
      x: 10,
      y: 10,
      zIndex: maxZ + 1,
      // Video defaults
      videoUrl: type === 'video' ? '' : undefined,
      videoAutoplay: type === 'video' ? false : undefined,
      videoControls: type === 'video' ? true : undefined,
      videoLoop: type === 'video' ? false : undefined,
      videoMuted: type === 'video' ? false : undefined,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement);
  };

  const updateElement = (id: string, updates: Partial<Element>) => {
    const width = editorRef.current?.offsetWidth || 1200;
    const height = editorHeight;
    let newUpdates = { ...updates };
    if (updates.xPx !== undefined) {
      newUpdates.x = (updates.xPx / width) * 100;
    }
    if (updates.yPx !== undefined) {
      newUpdates.y = (updates.yPx / height) * 100;
    }
    if (updates.x !== undefined) {
      newUpdates.xPx = Math.round((updates.x / 100) * width);
    }
    if (updates.y !== undefined) {
      newUpdates.yPx = Math.round((updates.y / 100) * height);
    }
    if (customUpdateElement) {
      customUpdateElement(id, newUpdates);
      return;
    }
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...newUpdates } : el
    ));
    if (selectedElement?.id === id) {
      setSelectedElement({ ...selectedElement, ...newUpdates });
    }
  };

  const deleteElement = (id: string) => {
    if (customDeleteElement) {
      customDeleteElement(id);
      return;
    }

    setElements(elements.filter(el => el.id !== id));
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const width = editorRef.current?.offsetWidth || 1200;
      const height = editorHeight;
      // Always set editorHeight on the first element for correct publish scaling
      const elementsWithHeight = elements.length > 0 ? [
        { ...elements[0], editorHeight: height },
        ...elements.slice(1)
      ] : [];
      const htmlContent = websiteService.generateHTML(
        elementsWithHeight.map(el => ({
          ...el,
          x: ((el.xPx ?? 0) / width) * 100,
          y: ((el.yPx ?? 0) / height) * 100,
        })),
        backgroundColor
      );
      
      // If website was already published, auto-publish after save
      if (website.isPublished) {
        await websiteService.updateWebsite(website.id!, {
          htmlContent,
          isPublished: true,
          editorHeight: height,
          elementsJson: JSON.stringify(elements)
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
          isPublished: false,
          editorHeight: height,
          elementsJson: JSON.stringify(elements)
        });
        
        toast({ title: "Gespeichert!", description: "Website wurde erfolgreich gespeichert" });
      }
      
      // Call onSave to refresh the parent component (only in non-collaborative mode)
      if (!isCollaborative) {
        onSave();
      }
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
      const width = editorRef.current?.offsetWidth || 1200;
      const height = editorHeight;
      // Always set editorHeight on the first element for correct publish scaling
      const elementsWithHeight = elements.length > 0 ? [
        { ...elements[0], editorHeight: height },
        ...elements.slice(1)
      ] : [];
      const htmlContent = websiteService.generateHTML(
        elementsWithHeight.map(el => ({
          ...el,
          x: ((el.xPx ?? 0) / width) * 100,
          y: ((el.yPx ?? 0) / height) * 100,
        })),
        backgroundColor
      );
      
      if (publishType === 'custom' && (customPath.trim() || existingCustomPath)) {
        const pathToUse = customPath.trim() || existingCustomPath!;
        
        // Set custom path first if it's new
        if (customPath.trim() && !existingCustomPath) {
          await websiteService.setCustomPath(website.id!, customPath.trim());
        }
        
        await websiteService.updateWebsite(website.id!, {
          htmlContent,
          isPublished: true,
          editorHeight: height,
          elementsJson: JSON.stringify(elements)
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
          isPublished: true,
          editorHeight: height,
          elementsJson: JSON.stringify(elements)
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
      
      // Refresh the parent component to update the website status (only in non-collaborative mode)
      if (!isCollaborative) {
        onSave();
      }
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
      // First validate the path format and content
      const validation = userService.validateCustomPath(path.trim());
      if (!validation.valid) {
        toast({
          title: "Ungültiger Custom Path",
          description: validation.reason || "Der Custom Path entspricht nicht den Anforderungen",
          variant: "destructive"
        });
        return;
      }
      
      // Then check if it's already taken
      const existingWebsite = await websiteService.getWebsiteByCustomPath(path.trim());
      if (existingWebsite) {
        toast({
          title: "Pfad bereits vergeben",
          description: "Dieser Custom Path ist bereits in Verwendung",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Custom Path verfügbar",
          description: "Dieser Custom Path kann verwendet werden",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error checking custom path:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Überprüfen des Custom Paths",
        variant: "destructive"
      });
    } finally {
      setCheckingPath(false);
    }
  };

  // Add at the top level of WebsiteBuilder (inside the component, before renderElement):
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [tempDragPosition, setTempDragPosition] = useState<{ id: string, x: number, y: number } | null>(null);

  // Mouse drag events
  useEffect(() => {
    if (!draggingElementId && !readyToDrag) return;
    const handleMouseMove = (e: MouseEvent) => {
      // If not readyToDrag, check threshold
      if (!readyToDrag && dragStartPos.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          if (dragHoldTimeout.current) {
            clearTimeout(dragHoldTimeout.current);
            dragHoldTimeout.current = null;
          }
          setDraggingElementId(selectedElement?.id || null);
          setDragOffset({ x: 0, y: 0 });
          setReadyToDrag(true);
          document.body.style.userSelect = 'none';
        } else {
          return;
        }
      }
      if (!draggingElementId) return;
      const element = elements.find(el => el.id === draggingElementId);
      if (!element || !editorRef.current) return;
      const rect = editorRef.current.getBoundingClientRect();
      // Calculate new center position
      let centerX = e.clientX - rect.left;
      let centerY = e.clientY - rect.top;
      // --- Snapping logic ---
      const elNode = document.querySelector(`[data-element-id='${element.id}']`) as HTMLElement | null;
      const elWidth = elNode?.offsetWidth || 100;
      const elHeight = elNode?.offsetHeight || 40;
      const dragBox = {
        left: centerX - elWidth / 2,
        right: centerX + elWidth / 2,
        top: centerY - elHeight / 2,
        bottom: centerY + elHeight / 2,
        centerX: centerX,
        centerY: centerY,
        width: elWidth,
        height: elHeight,
      };
      const editorWidth = editorRef.current.offsetWidth;
      const editorCenterX = editorWidth / 2;
      const editorCenterY = editorHeight / 2;
      const xLines: number[] = [editorCenterX];
      const yLines: number[] = [editorCenterY];
      // For advanced spacing snap
      let spacingXSnapLines: number[] = [];
      let spacingYSnapLines: number[] = [];
      let spacingXSnaps: Array<{line: number, spacing: number}> = [];
      let spacingYSnaps: Array<{line: number, spacing: number}> = [];
      // Collect all element edges
      const elementEdges = elements.filter(el => el.id !== element.id).map(el => {
        const node = document.querySelector(`[data-element-id='${el.id}']`) as HTMLElement | null;
        const w = node?.offsetWidth || 100;
        const h = node?.offsetHeight || 40;
        const x = el.xPx ?? 0;
        const y = el.yPx ?? 0;
        return {
          id: el.id,
          left: x,
          right: x + w,
          top: y,
          bottom: y + h,
          centerX: x + w / 2,
          centerY: y + h / 2,
          width: w,
          height: h,
        };
      });
      // Standard edge/center lines
      elementEdges.forEach(edge => {
        xLines.push(edge.left, edge.right, edge.centerX);
        yLines.push(edge.top, edge.bottom, edge.centerY);
      });
      // Advanced spacing snap logic
      if (advancedSnapping) {
        // For each pair of elements, record their horizontal and vertical spacing
        let xSpacings: number[] = [];
        let ySpacings: number[] = [];
        for (let i = 0; i < elementEdges.length; i++) {
          for (let j = i + 1; j < elementEdges.length; j++) {
            // Horizontal spacing (between right of one and left of another)
            const spacingRtoL = Math.abs(elementEdges[i].right - elementEdges[j].left);
            const spacingLtoR = Math.abs(elementEdges[i].left - elementEdges[j].right);
            if (spacingRtoL > 0) xSpacings.push(spacingRtoL);
            if (spacingLtoR > 0) xSpacings.push(spacingLtoR);
            // Vertical spacing (between bottom of one and top of another)
            const spacingBtoT = Math.abs(elementEdges[i].bottom - elementEdges[j].top);
            const spacingTtoB = Math.abs(elementEdges[i].top - elementEdges[j].bottom);
            if (spacingBtoT > 0) ySpacings.push(spacingBtoT);
            if (spacingTtoB > 0) ySpacings.push(spacingTtoB);
          }
        }
        // Remove duplicates and keep only reasonable spacings
        xSpacings = Array.from(new Set(xSpacings.filter(s => s > 0 && s < 500)));
        ySpacings = Array.from(new Set(ySpacings.filter(s => s > 0 && s < 500)));
        // For each other element, add snap lines at those spacings
        elementEdges.forEach(edge => {
          xSpacings.forEach(spacing => {
            // Snap left edge to right edge + spacing
            spacingXSnapLines.push(edge.right + spacing);
            // Snap right edge to left edge - spacing
            spacingXSnapLines.push(edge.left - spacing);
          });
          ySpacings.forEach(spacing => {
            // Snap top edge to bottom edge + spacing
            spacingYSnapLines.push(edge.bottom + spacing);
            // Snap bottom edge to top edge - spacing
            spacingYSnapLines.push(edge.top - spacing);
          });
        });
      }
      // Snap X
      let snappedX: number[] = [];
      let snapX = centerX;
      [...xLines, ...spacingXSnapLines].forEach(line => {
        if (Math.abs(dragBox.left - line) < SNAP_THRESHOLD) {
          snapX = line + elWidth / 2;
          snappedX.push(line);
        }
        if (Math.abs(dragBox.right - line) < SNAP_THRESHOLD) {
          snapX = line - elWidth / 2;
          snappedX.push(line);
        }
        if (Math.abs(dragBox.centerX - line) < SNAP_THRESHOLD) {
          snapX = line;
          snappedX.push(line);
        }
      });
      // Snap Y
      let snappedY: number[] = [];
      let snapY = centerY;
      [...yLines, ...spacingYSnapLines].forEach(line => {
        if (Math.abs(dragBox.top - line) < SNAP_THRESHOLD) {
          snapY = line + elHeight / 2;
          snappedY.push(line);
        }
        if (Math.abs(dragBox.bottom - line) < SNAP_THRESHOLD) {
          snapY = line - elHeight / 2;
          snappedY.push(line);
        }
        if (Math.abs(dragBox.centerY - line) < SNAP_THRESHOLD) {
          snapY = line;
          snappedY.push(line);
        }
      });
      setTempDragPosition({ id: element.id, x: snapX, y: snapY });
      setSnappedGuides({ x: snappedX, y: snappedY });
      setSnappedPosition({ x: snapX, y: snapY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [draggingElementId, elements, editorHeight, advancedSnapping, readyToDrag, selectedElement]);

  // On mouse up, update the element's position so its center is at the last snapped position
  useEffect(() => {
    if (!draggingElementId) return;
    const handleMouseUp = (e: MouseEvent) => {
      const element = elements.find(el => el.id === draggingElementId);
      if (!element || !editorRef.current) return;
      const elNode = document.querySelector(`[data-element-id='${element.id}']`) as HTMLElement | null;
      const elWidth = elNode?.offsetWidth || 100;
      const elHeight = elNode?.offsetHeight || 40;
      let newX, newY;
      if (snappedPosition) {
        newX = snappedPosition.x - elWidth / 2;
        newY = snappedPosition.y - elHeight / 2;
      } else {
        const rect = editorRef.current.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        newX = centerX - elWidth / 2;
        newY = centerY - elHeight / 2;
      }
      if (element.type === 'topbar') {
        updateElement(element.id, { xPx: newX, yPx: 0 });
      } else {
        updateElement(element.id, { xPx: newX, yPx: newY });
      }
      setDraggingElementId(null);
      setTempDragPosition(null);
      setSnappedGuides({ x: [], y: [] });
      setSnappedPosition(null);
      document.body.style.userSelect = '';
      if (dragHoldTimeout.current) {
        clearTimeout(dragHoldTimeout.current);
        dragHoldTimeout.current = null;
      }
      setReadyToDrag(false);
      dragStartPos.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [draggingElementId, elements, snappedPosition, updateElement]);

  // Add this useEffect to handle resizing
  useEffect(() => {
    if (!resizing || !resizeStart) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.startX;
      const dy = e.clientY - resizeStart.startY;
      const newWidth = Math.max(24, resizeStart.startWidth + dx);
      const newHeight = Math.max(24, resizeStart.startHeight + dy);
      updateElement(resizeStart.id, { widthPx: newWidth, heightPx: newHeight });
    };
    const handleMouseUp = () => {
      setResizing(null);
      setResizeStart(null);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, resizeStart]);

  // Set loading to false after elements are loaded
  useEffect(() => {
    if (elements.length > 0) setEditorLoading(false);
  }, [elements]);

  const renderElement = (element: Element) => {
    // Only declare isScalable once, with video included
    const isScalable = element.type === 'button' || element.type === 'image' || element.type === 'youtube' || element.type === 'video';
    const isSelected = selectedElement?.id === element.id;
    const isDragging = draggingElementId === element.id;

    // Mouse/touch drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editorRef.current) return;
      if (selectedElement?.id !== element.id) {
        setSelectedElement(element);
        // Show snap lines at the element's current position
        const x = element.xPx ?? 0;
        const y = element.yPx ?? 0;
        const elNode = document.querySelector(`[data-element-id='${element.id}']`) as HTMLElement | null;
        const w = elNode?.offsetWidth || 100;
        const h = elNode?.offsetHeight || 40;
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        setAlignmentGuides({ x: [x, x + w, centerX], y: [y, y + h, centerY] });
        setSnappedGuides({ x: [centerX], y: [centerY] });
        setReadyToDrag(false);
        dragStartPos.current = null;
        return;
      }
      // If already selected, start drag after hold or threshold
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragHoldTimeout.current = setTimeout(() => {
        startDrag(element.id);
      }, 120);
    };
    const handleMouseUp = () => {
      if (dragHoldTimeout.current) {
        clearTimeout(dragHoldTimeout.current);
        dragHoldTimeout.current = null;
      }
      setReadyToDrag(false);
      dragStartPos.current = null;
    };
    const handleMouseLeave = () => {
      if (dragHoldTimeout.current) {
        clearTimeout(dragHoldTimeout.current);
        dragHoldTimeout.current = null;
      }
      setReadyToDrag(false);
      dragStartPos.current = null;
    };
    const handleTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      if (!editorRef.current) return;
      const touch = e.touches[0];
      const rect = editorRef.current.getBoundingClientRect();
      setDraggingElementId(element.id);
      setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
      document.body.style.userSelect = 'none';
    };

    // Style for absolute positioning
    const style = {
      position: 'absolute' as const,
      left: element.type === 'topbar' ? 0 : `${((element.xPx ?? 0) / (editorRef.current?.offsetWidth || 1200)) * 100}%`,
      top: element.type === 'topbar' ? 0 : `${((element.yPx ?? 0) / editorHeight) * 100}%`,
      zIndex: isSelected ? 10 : 1,
      cursor: isDragging ? 'grabbing' : 'grab',
      width: isScalable ? (element.widthPx ? `${element.widthPx}px` : undefined) : (element.type === 'topbar' ? '100%' : 'fit-content'),
      height: isScalable ? (element.heightPx ? `${element.heightPx}px` : undefined) : undefined,
      maxWidth: element.type === 'topbar' ? '100%' : '90%',
    };

    return (
      <div
        key={element.id}
        style={style}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onClick={e => {
          setSelectedElement(element);
          // Show snap lines at the element's current position
          const x = element.xPx ?? 0;
          const y = element.yPx ?? 0;
          const elNode = document.querySelector(`[data-element-id='${element.id}']`) as HTMLElement | null;
          const w = elNode?.offsetWidth || 100;
          const h = elNode?.offsetHeight || 40;
          const centerX = x + w / 2;
          const centerY = y + h / 2;
          setAlignmentGuides({ x: [x, x + w, centerX], y: [y, y + h, centerY] });
          setSnappedGuides({ x: [centerX], y: [centerY] });
          setShowQuickProps(true);
        }}
        onDoubleClick={e => {
          if (element.type === 'text') {
            setInlineTextEdit({ id: element.id, value: element.content || '', field: 'content' });
            setShowQuickProps(false);
          } else if (element.type === 'button') {
            setInlineTextEdit({ id: element.id, value: element.text || '', field: 'text' });
            setShowQuickProps(false);
          }
        }}
        className={`webnest-draggable ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        data-element-id={element.id}
      >
        {renderElementContent(element)}
        {/* Inline text edit for double click (text and button) */}
        {inlineTextEdit && inlineTextEdit.id === element.id && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 20001,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              padding: 12,
              minWidth: 180,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <label htmlFor={`inline-text-edit-${element.id}`} style={{ fontSize: 12, marginRight: 8 }}>{inlineTextEdit.field === 'content' ? 'Text:' : 'Button Text:'}</label>
            <textarea
              id={`inline-text-edit-${element.id}`}
              value={inlineTextEdit.value}
              autoFocus
              style={{ flex: 1, fontSize: 14, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, minHeight: 40, resize: 'vertical' }}
              onChange={e => setInlineTextEdit({ ...inlineTextEdit, value: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  updateElement(element.id, { [inlineTextEdit.field]: inlineTextEdit.value });
                  setInlineTextEdit(null);
                  e.preventDefault();
                } else if (e.key === 'Escape') {
                  setInlineTextEdit(null);
                }
              }}
            />
            <button
              type="button"
              style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4, border: '1px solid #bbb', background: '#f3f4f6', cursor: 'pointer' }}
              onClick={() => {
                updateElement(element.id, { [inlineTextEdit.field]: inlineTextEdit.value });
                setInlineTextEdit(null);
              }}
            >
              Done
            </button>
          </div>
        )}
        {/* Resize handle for scalable elements */}
        {isScalable && isSelected && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 16,
              height: 16,
              background: '#fff',
              border: '1px solid #888',
              borderRadius: 4,
              cursor: 'nwse-resize',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}
            onMouseDown={e => {
              e.stopPropagation();
              setResizing(element.id);
              setResizeStart({
                id: element.id,
                startX: e.clientX,
                startY: e.clientY,
                startWidth: element.widthPx || (e.currentTarget.parentElement?.offsetWidth ?? 100),
                startHeight: element.heightPx || (e.currentTarget.parentElement?.offsetHeight ?? 40)
              });
              document.body.style.userSelect = 'none'; // Prevent text selection
            }}
          >
            <svg width="12" height="12"><polyline points="0,12 12,0" stroke="#888" strokeWidth="2" fill="none" /></svg>
          </div>
        )}
      </div>
    );
  };

  // Sync selectedElement with latest version from elements array
  useEffect(() => {
    if (!selectedElement) return;
    const latest = elements.find(el => el.id === selectedElement.id);
    if (latest && latest !== selectedElement) {
      setSelectedElement(latest);
    }
    // If the element was deleted, clear selection
    if (!latest) {
      setSelectedElement(null);
    }
  }, [elements]);

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFaviconError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFaviconError('Nur Bilddateien sind erlaubt.');
      return;
    }
    // Validate image size and squareness
    const img = new window.Image();
    img.onload = async () => {
      if (img.width !== img.height) {
        setFaviconError('Das Bild muss quadratisch sein.');
        return;
      }
      if (img.width > 128 || img.height > 128) {
        setFaviconError('Maximale Größe: 128x128 Pixel.');
        return;
      }
      setFaviconUploading(true);
      setFaviconModalOpen(true);
      try {
        // Draw to canvas 32x32
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas nicht unterstützt');
        ctx.drawImage(img, 0, 0, 32, 32);
        // Convert to .ico using 2ico
        const icoDataUrl = toICO(canvas, [32]);
        // Extract base64
        const base64 = icoDataUrl.split(',')[1];
        // Fix: fallback for FAVICON_UPLOAD token cost and avoid redeclaration
        const tokenCost = (userService.TOKEN_COSTS as any).FAVICON_UPLOAD ?? 1;
        if (!faviconUsedFree) {
          const tokenSuccess = await userService.deductTokens(website.userId, tokenCost, 'Favicon upload', website.id);
          if (!tokenSuccess) {
            setFaviconError('Nicht genügend Tokens für Favicon-Upload.');
            setFaviconUploading(false);
            setFaviconModalOpen(false);
            return;
          }
        }
        // Save favicon to website
        await websiteService.updateWebsite(website.id!, { favicon: base64 });
        setFaviconUsedFree(true);
        setFaviconPreview(`data:image/x-icon;base64,${base64}`);
        toast({ title: 'Favicon aktualisiert!', description: 'Das Favicon wurde erfolgreich gespeichert.' });
      } catch (err: any) {
        setFaviconError('Fehler beim Konvertieren oder Speichern des Favicons.');
      } finally {
        setFaviconUploading(false);
        setTimeout(() => setFaviconModalOpen(false), 900); // Let animation finish
      }
    };
    img.onerror = () => setFaviconError('Fehler beim Laden des Bildes.');
    img.src = URL.createObjectURL(file);
  };

  const handleUndoUnpublish = async () => {
    setUndoingUnpublish(true);
    try {
      await websiteService.undoUnpublish(website.id!, website.userId);
      toast({ title: 'Unpublish rückgängig gemacht!', description: 'Die Veröffentlichung wurde erfolgreich rückgängig gemacht.' });
      setShowRevokeDialog(false);
    } catch (error) {
      toast({ title: 'Fehler beim Rückgängig machen', description: error instanceof Error ? error.message : 'Es gab einen Fehler beim Rückgängig machen.' });
    } finally {
      setUndoingUnpublish(false);
    }
  };

  const handleInstantUnpublish = async () => {
    setRevokingInstant(true);
    try {
      await websiteService.unpublishWebsite(website.id!, true);
      toast({ title: 'Veröffentlichung aufgehoben!', description: 'Die Veröffentlichung wurde erfolgreich aufgehoben.' });
      setShowRevokeDialog(false);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast({ title: 'Fehler beim Aufheben', description: error instanceof Error ? error.message : 'Es gab einen Fehler beim Aufheben.' });
    } finally {
      setRevokingInstant(false);
    }
  };

  const handleDelayedUnpublish = async () => {
    setRevokingDelayed(true);
    try {
      await websiteService.scheduleUnpublish(website.id!, 2 * 60 * 60 * 1000); // 2 hours in milliseconds
      toast({ title: 'Unpublish geplant!', description: 'Die Veröffentlichung wird in 2 Stunden aufgehoben.' });
      setShowRevokeDialog(false);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast({ title: 'Fehler beim Planen', description: error instanceof Error ? error.message : 'Es gab einen Fehler beim Planen.' });
    } finally {
      setRevokingDelayed(false);
    }
  };

  const handleRename = async () => {
    setRenaming(true);
    try {
      await websiteService.renameWebsite(website.id!, renameValue, website.userId);
      toast({ title: 'Website umbenannt!', description: 'Die Website wurde erfolgreich umbenannt.' });
      setRenameValue('');
      setRenaming(false);
      setRenameError(null);
    } catch (error) {
      toast({ title: 'Fehler beim Umbenennen', description: error instanceof Error ? error.message : 'Es gab einen Fehler beim Umbenennen.' });
      setRenameError(error instanceof Error ? error.message : 'Es gab einen unbekannten Fehler.');
      setRenaming(false);
    }
  };

  // Fetch analytics when settings dialog opens
  useEffect(() => {
    if (settingsOpen) {
      let totalVisits = 0;
      if (typeof website.totalVisits === 'number') {
        totalVisits = website.totalVisits;
      } else if (typeof website.totalVisits === 'string') {
        const parsed = parseInt(website.totalVisits, 10);
        totalVisits = Number.isNaN(parsed) ? 0 : parsed;
      } else {
        totalVisits = 0;
      }
      let lastVisit: Date | null = null;
      if (website.lastVisit) {
        if (website.lastVisit instanceof Date) {
          lastVisit = website.lastVisit;
        } else if (typeof website.lastVisit === 'string' || typeof website.lastVisit === 'number') {
          const d = new Date(website.lastVisit);
          lastVisit = isNaN(d.getTime()) ? null : d;
        }
      }
      setAnalytics({ totalVisits, lastVisit });
      setRenameValue(website.name || '');
    }
  }, [settingsOpen, website]);

  // Update backgroundColor in Firestore and local state
  const handleBackgroundColorChange = async (color: string) => {
    setBackgroundColor(color);
    if (website.id) {
      await websiteService.updateWebsite(website.id, { backgroundColor: color });
    }
  };

  // Alignment guides useEffect: only set guides
  useEffect(() => {
    if (!draggingElementId || !tempDragPosition || !editorRef.current) {
      setAlignmentGuides({ x: [], y: [] });
      return;
    }
    const dragged = elements.find(el => el.id === draggingElementId);
    if (!dragged) {
      setAlignmentGuides({ x: [], y: [] });
      return;
    }
    const rect = editorRef.current.getBoundingClientRect();
    const elNode = document.querySelector(`[data-element-id='${dragged.id}']`) as HTMLElement | null;
    const elWidth = elNode?.offsetWidth || 100;
    const elHeight = elNode?.offsetHeight || 40;
    const dragBox = {
      left: tempDragPosition.x - elWidth / 2,
      right: tempDragPosition.x + elWidth / 2,
      top: tempDragPosition.y - elHeight / 2,
      bottom: tempDragPosition.y + elHeight / 2,
      centerX: tempDragPosition.x,
      centerY: tempDragPosition.y,
      width: elWidth,
      height: elHeight,
    };
    // Editor center lines
    const editorWidth = editorRef.current.offsetWidth;
    const editorCenterX = editorWidth / 2;
    const editorCenterY = editorHeight / 2;
    // Collect all possible snap lines from other elements
    const xLines: number[] = [editorCenterX];
    const yLines: number[] = [editorCenterY];
    elements.forEach(el => {
      if (el.id === dragged.id) return;
      const node = document.querySelector(`[data-element-id='${el.id}']`) as HTMLElement | null;
      const w = node?.offsetWidth || 100;
      const h = node?.offsetHeight || 40;
      const x = el.xPx ?? 0;
      const y = el.yPx ?? 0;
      xLines.push(x); // left
      xLines.push(x + w); // right
      xLines.push(x + w / 2); // center
      yLines.push(y); // top
      yLines.push(y + h); // bottom
      yLines.push(y + h / 2); // center
    });
    // Also add dragged element's own lines for self-snapping to center
    xLines.push(dragBox.left); xLines.push(dragBox.right); xLines.push(dragBox.centerX);
    yLines.push(dragBox.top); yLines.push(dragBox.bottom); yLines.push(dragBox.centerY);
    // Find closest snap lines
    let showXGuides: number[] = [];
    let showYGuides: number[] = [];
    // For X (vertical guides)
    for (const line of xLines) {
      if (Math.abs(dragBox.left - line) < SNAP_THRESHOLD) {
        showXGuides.push(line);
      }
      if (Math.abs(dragBox.right - line) < SNAP_THRESHOLD) {
        showXGuides.push(line);
      }
      if (Math.abs(dragBox.centerX - line) < SNAP_THRESHOLD) {
        showXGuides.push(line);
      }
    }
    // For Y (horizontal guides)
    for (const line of yLines) {
      if (Math.abs(dragBox.top - line) < SNAP_THRESHOLD) {
        showYGuides.push(line);
      }
      if (Math.abs(dragBox.bottom - line) < SNAP_THRESHOLD) {
        showYGuides.push(line);
      }
      if (Math.abs(dragBox.centerY - line) < SNAP_THRESHOLD) {
        showYGuides.push(line);
      }
    }
    setAlignmentGuides({ x: Array.from(new Set(showXGuides)), y: Array.from(new Set(showYGuides)) });
  }, [draggingElementId, tempDragPosition, elements, editorHeight]);

  // Centralized drag start function
  const startDrag = (elementId: string) => {
    setDraggingElementId(elementId);
    setDragOffset({ x: 0, y: 0 });
    setReadyToDrag(true);
    document.body.style.userSelect = 'none';
    if (dragHoldTimeout.current) {
      clearTimeout(dragHoldTimeout.current);
      dragHoldTimeout.current = null;
    }
  };

  // QuickPropertiesPopup component (memoized, DOM-anchored, no rerender on every input)
  const QuickPropertiesPopup = memo(({ element, onUpdate, onClose, editorRef }: { element: Element, onUpdate: (updates: Partial<Element>) => void, onClose: () => void, editorRef: React.RefObject<HTMLDivElement> }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [popupInlineEdit, setPopupInlineEdit] = useState<{ field: string, value: string } | null>(null);

    useLayoutEffect(() => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const elNode = document.querySelector(`[data-element-id='${element.id}']`) as HTMLElement | null;
      if (!elNode) return;
      // Calculate position relative to editor container using getBoundingClientRect
      const editorRect = editor.getBoundingClientRect();
      const elRect = elNode.getBoundingClientRect();
      let left = elRect.right - editorRect.left + 12;
      let top = elRect.top - editorRect.top;
      // If not enough space to the right, show below
      if (left + 260 > editor.offsetWidth) {
        left = elRect.left - editorRect.left;
        top = elRect.bottom - editorRect.top + 12;
      }
      setPopupPos({ top, left });
    }, [element.id, element.xPx, element.yPx, editorRef]);

    // Helper for rendering inline edit field
    const renderInlineEditField = (field: string, value: string, placeholder: string = '', label: string = '', forceInput: boolean = false) => (
      (forceInput || (popupInlineEdit && popupInlineEdit.field === field)) ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={forceInput ? value : (popupInlineEdit ? popupInlineEdit.value : '')}
            autoFocus
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder={placeholder}
            onChange={e => forceInput ? onUpdate({ [field]: e.target.value }) : setPopupInlineEdit({ field, value: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                forceInput ? onUpdate({ [field]: (e.target as HTMLInputElement).value }) : onUpdate({ [field]: popupInlineEdit ? popupInlineEdit.value : '' });
                if (!forceInput) setPopupInlineEdit(null);
              } else if (e.key === 'Escape') {
                if (!forceInput) setPopupInlineEdit(null);
              }
            }}
            style={{ flex: 1 }}
          />
          {!forceInput && (
            <button
              type="button"
              className="text-xs px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => {
                onUpdate({ [field]: popupInlineEdit ? popupInlineEdit.value : '' });
                setPopupInlineEdit(null);
              }}
            >
              Done
            </button>
          )}
        </div>
      ) : (
        <div
          className="w-full border rounded px-2 py-1 text-sm cursor-pointer bg-white"
          tabIndex={0}
          onClick={() => setPopupInlineEdit({ field, value: value || '' })}
          onKeyDown={e => { if (e.key === 'Enter') setPopupInlineEdit({ field, value: value || '' }); }}
          style={{ minHeight: 28, display: 'flex', alignItems: 'center' }}
        >
          {value || <span className="text-gray-400">{placeholder || '(empty)'}</span>}
        </div>
      )
    );

    // Render property fields based on type
    let fields: React.ReactNode[] = [];
    if (element.type === 'text') {
      fields = [
        <div key="text-content" className="mb-2">
          <label className="block text-xs font-medium mb-1">Text Content</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            value={element.content || ''}
            onChange={e => onUpdate({ content: e.target.value })}
            rows={3}
            style={{ resize: 'vertical' }}
            placeholder="Text"
          />
        </div>,
        <div key="font" className="mb-2">
          <label className="block text-xs font-medium mb-1">Font</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={element.fontFamily || ''}
            onChange={e => onUpdate({ fontFamily: e.target.value })}
          >
            {fontOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>,
        <div key="color" className="mb-2">
          <label className="block text-xs font-medium mb-1">Text Color</label>
          <input
            type="color"
            className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
            value={element.color || '#333333'}
            onChange={e => onUpdate({ color: e.target.value })}
          />
        </div>,
      ];
    } else if (element.type === 'button') {
      fields = [
        <div key="button-text" className="mb-2">
          <label className="block text-xs font-medium mb-1">Button Text</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            value={element.text || ''}
            onChange={e => onUpdate({ text: e.target.value })}
            rows={2}
            style={{ resize: 'vertical' }}
            placeholder="Button Text"
          />
        </div>,
        <div key="font" className="mb-2">
          <label className="block text-xs font-medium mb-1">Font</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={element.fontFamily || ''}
            onChange={e => onUpdate({ fontFamily: e.target.value })}
          >
            {fontOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>,
        <div key="code" className="mb-2">
          <label className="block text-xs font-medium mb-1">Code</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="w-full border rounded px-2 py-1 text-sm font-mono"
              value={element.customJS || ''}
              onChange={e => onUpdate({ customJS: e.target.value })}
              placeholder="// JS code"
            />
            <button
              type="button"
              className="text-xs px-2 py-1 border rounded bg-blue-100 hover:bg-blue-200"
              onClick={() => {
                if (typeof setShowCodeBuilder === 'function') {
                  setShowCodeBuilder(true);
                  setCodeBuilderInitialCode(element.customJS || '');
                  setCustomCodeSaveHandler((code: string) => onUpdate({ customJS: code }));
                }
              }}
            >
              Visual Editor
            </button>
          </div>
        </div>,
      ];
    } else if (element.type === 'input') {
      fields = [
        <div key="placeholder" className="mb-2">
          <label className="block text-xs font-medium mb-1">Placeholder</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={element.placeholder || ''}
            onChange={e => onUpdate({ placeholder: e.target.value })}
          />
        </div>,
        <div key="input-type" className="mb-2">
          <label className="block text-xs font-medium mb-1">Input Type</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={element.inputType || ''}
            onChange={e => onUpdate({ inputType: e.target.value })}
          />
        </div>,
        <div key="input-id" className="mb-2">
          <label className="block text-xs font-medium mb-1">Input ID</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm font-mono"
            value={element.inputId || ''}
            onChange={e => onUpdate({ inputId: e.target.value })}
          />
        </div>,
      ];
    }

    return (
      <div
        ref={popupRef}
        style={{
          position: 'absolute',
          left: popupPos.left,
          top: popupPos.top,
          zIndex: 20000,
          minWidth: 220,
          maxWidth: 320,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          padding: 16,
          transition: 'opacity 0.15s',
        }}
        className="quick-props-popup"
      >
        <div className="font-semibold text-sm mb-2">Quick Properties</div>
        {fields}
        <button
          className="mt-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs border border-gray-200"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  });

  // In WebsiteBuilder, auto-hide quick properties popup during moving:
  useEffect(() => {
    if (draggingElementId) {
      setShowQuickProps(false);
      setInlineTextEdit(null);
    }
  }, [draggingElementId]);

  // Font options (copied from ElementProperties)
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

  // In WebsiteBuilder, auto-show quick properties popup after drag stop:
  useEffect(() => {
    // Show quick props after drag stop if an element was moved
    if (!draggingElementId && selectedElement && !showQuickProps && selectedElement.type !== 'text') {
      setShowQuickProps(true);
    }
  }, [draggingElementId]);

  // When a block is added or editing is started, set focusedParam to the first text param


  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex">
        {/* Toolbar */}
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              {(!isCollaborative) && (
                <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Badge variant="outline">{website.name}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} title="Einstellungen">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap overflow-x-auto min-w-0 mb-2">
              <Button onClick={handleSave} disabled={saving} size="sm" variant="outline">
                <Save className="mr-1 h-3 w-3" />
                {saving ? 'Speichert...' : (website.isPublished ? 'Speichern & Aktualisieren' : 'Speichern')}
              </Button>
              <Button onClick={handlePublish} disabled={publishing} size="sm">
                <Globe className="mr-1 h-3 w-3" />
                {publishing ? (website.isPublished ? 'Aktualisiert...' : 'Veröffentlicht...') : (website.isPublished ? 'Aktualisieren' : 'Veröffentlichen')}
              </Button>
              {!isCollaborative && (
                <Button 
                  onClick={() => window.location.href = `/collaborate/${website.id}`} 
                  size="sm" 
                  variant="outline"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Users className="mr-1 h-3 w-3" />
                  Kollaborieren
                </Button>
              )}
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
                onOpenCodeBuilder={openCodeBuilder}
              />
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 p-8">
          <Card className="w-full max-w-6xl mx-auto min-h-96">
            <CardHeader>
              <CardTitle className="text-center">Website Vorschau</CardTitle>
            </CardHeader>
            <CardContent className="p-8" style={{position:'relative', minHeight:600}}>
              {elements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="mx-auto h-12 w-12 mb-4" />
                  <p>Füge Elemente hinzu, um deine Website zu erstellen!</p>
                </div>
              ) : (
                <div style={{position:'relative'}}>
                  <div
                    ref={editorRef}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: `${editorHeight}px`,
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      padding: 0,
                      margin: 0,
                      transition: 'filter 0.2s',
                      background: backgroundColor,
                    }}
                  >
                    {elements.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map(renderElement)}
                    {/* Drag preview: grayed out, follows cursor center */}
                    {draggingElementId && tempDragPosition && (() => {
                      const element = elements.find(el => el.id === draggingElementId);
                      if (!element) return null;
                      // Get the actual DOM node for the element to get its size
                      const elNode = document.querySelector(`[data-element-id='${element.id}']`) as HTMLElement | null;
                      const elWidth = elNode?.offsetWidth || 100;
                      const elHeight = elNode?.offsetHeight || 40;
                      const previewStyle = {
                        position: 'absolute' as const,
                        left: tempDragPosition.x - elWidth / 2,
                        top: tempDragPosition.y - elHeight / 2,
                        width: elWidth,
                        height: elHeight,
                        pointerEvents: 'none' as const,
                        opacity: 0.5,
                        filter: 'grayscale(1) brightness(1.5)',
                        zIndex: 9999,
                      };
                      return (
                        <div style={previewStyle}>
                          {renderElementContent(element)}
                        </div>
                      );
                    })()}
                  </div>
                  {showSnappingGuides && alignmentGuides.x.map((x, i) => (
                    <div
                      key={`v-guide-${x}-${i}`}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: 0,
                        width: 2,
                        height: editorHeight,
                        background: 'rgba(59,130,246,0.7)', // blue-500
                        zIndex: 10000,
                        pointerEvents: 'none',
                        opacity: snappedGuides.x.includes(x) ? 1 : 0.5,
                        transition: 'opacity 0.1s',
                      }}
                    />
                  ))}
                  {showSnappingGuides && alignmentGuides.y.map((y, i) => (
                    <div
                      key={`h-guide-${y}-${i}`}
                      style={{
                        position: 'absolute',
                        top: y,
                        left: 0,
                        height: 2,
                        width: '100%',
                        background: 'rgba(59,130,246,0.7)',
                        zIndex: 10000,
                        pointerEvents: 'none',
                        opacity: snappedGuides.y.includes(y) ? 1 : 0.5,
                        transition: 'opacity 0.1s',
                      }}
                    />
                  ))}
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
                  Custom Project Name ({userService.TOKEN_COSTS.CUSTOM_PATH} Tokens)
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
                    <div className="relative">
                      <Input
                        placeholder="meine-awesome-website"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        onBlur={() => checkCustomPath(customPath)}
                        className={checkingPath ? 'pr-8' : ''}
                      />
                      {checkingPath && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Deine Website wird dann unter /view/{customPath || 'projektname'} erreichbar sein</div>
                      <div className="text-yellow-600">
                        ⚠️ Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt. Keine anstößigen Inhalte.
                      </div>
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

      {/* Code Builder */}
      <CodeBuilder
        isOpen={showCodeBuilder}
        onClose={closeCodeBuilder}
        onSave={handleCodeBuilderSave}
        initialCode={codeBuilderInitialCode}
        availableInputs={elements
          .filter(el => el.type === 'input')
          .map(el => ({ id: el.inputId || `input-${el.id}`, type: el.inputType || 'text' }))
        }
      />

      {/* Skeleton Loading Bar */}
      <div className="w-full h-2 mb-4">
        {editorLoading && (
          <div className="animate-pulse bg-gray-200 rounded h-2 w-full" style={{ minWidth: 100 }} />
        )}
      </div>

      {/* Favicon Conversion Modal */}
      <Dialog open={faviconModalOpen} onOpenChange={setFaviconModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Favicon wird konvertiert...</DialogTitle>
            <DialogDescription>Dein Icon wird vorbereitet. Bitte warte einen Moment.</DialogDescription>
          </DialogHeader>
          <div className="w-32 h-32 grid grid-cols-4 grid-rows-4 gap-1 mx-auto mt-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded bg-blue-200 border border-blue-400 transition-transform duration-200 ${faviconGridAnim.includes(i) ? 'scale-110 animate-bounce' : ''}`}
                style={{ animationDelay: `${(i % 4) * 0.05 + Math.floor(i / 4) * 0.07}s` }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Website Einstellungen</DialogTitle>
            <DialogDescription>Verwalte favicon und weitere Einstellungen.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <div className="mb-4">
              <div className="font-semibold text-xs text-gray-700 mb-2 flex items-center gap-2">
                <span>Favicon</span>
              </div>
              <div className="flex items-center gap-2">
                {faviconPreview && (
                  <img src={faviconPreview} alt="Favicon" className="w-6 h-6 rounded border border-gray-300 bg-white" />
                )}
                <label className="ml-1 cursor-pointer text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 hover:bg-gray-200 flex items-center gap-1">
                  <UploadCloud className="w-4 h-4 mr-1 text-blue-500" />
                  Favicon hochladen
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFaviconUpload} disabled={faviconUploading} />
                </label>
                {faviconError && <span className="ml-2 text-red-600">{faviconError}</span>}
                {website.favicon && <span className="ml-2">✅</span>}
              </div>
            </div>

            {/* Revoke Publish Section */}
            <div className="mb-4 border-t pt-4 mt-4">
              <div className="font-semibold text-xs text-gray-700 mb-2 flex items-center gap-2">
                <span>Veröffentlichung verwalten</span>
              </div>
              {website.isPublished ? (
                <>
                  {website.unpublishDelayActive && website.pendingUnpublishAt ? (
                    (() => {
                      let date: Date;
                      if (website.pendingUnpublishAt instanceof Timestamp) {
                        date = website.pendingUnpublishAt.toDate();
                      } else if (typeof website.pendingUnpublishAt === 'string') {
                        date = new Date(website.pendingUnpublishAt);
                      } else {
                        date = website.pendingUnpublishAt as Date;
                      }
                      const dateString = isNaN(date.getTime()) ? 'Ungültiges Datum' : date.toLocaleString();
                      return (
                        <div className="mb-2 text-sm text-yellow-700 flex flex-col gap-1">
                          <span>Unpublish geplant für: {dateString}</span>
                          <Button size="sm" variant="outline" onClick={handleUndoUnpublish} disabled={undoingUnpublish || (isCollaborative && !isOwner)}>
                            {undoingUnpublish ? 'Wird rückgängig gemacht...' : `Unpublish rückgängig machen (1 Token)`}
                          </Button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="destructive" onClick={() => setShowRevokeDialog(true)} disabled={isCollaborative && !isOwner}>
                        Veröffentlichung aufheben
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-green-700 text-xs">Diese Website ist nicht veröffentlicht.</div>
              )}
            </div>

            {/* Rename Website Section */}
            <div className="mb-4 border-t pt-4 mt-4">
              <div className="font-semibold text-xs text-gray-700 mb-2 flex items-center gap-2">
                <span>Website umbenennen</span>
              </div>
              <div className="flex gap-2 items-center">
                <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Neuer Name" disabled={isCollaborative} />
                <Button size="sm" onClick={handleRename} disabled={renaming || (isCollaborative)}>
                  {renaming ? 'Speichern...' : `Umbenennen (1 Token)`}
                </Button>
              </div>
              {renameError && <div className="text-xs text-red-600 mt-1">{renameError}</div>}
            </div>

            {/* Analytics Section */}
            <div className="mb-2 border-t pt-4 mt-4">
              <div className="font-semibold text-xs text-gray-700 mb-2 flex items-center gap-2">
                <span>Analytics</span>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span>Besuche insgesamt: {analytics.totalVisits}</span>
              </div>
            </div>
            {/* Background Color Picker */}
            <div className="mb-4">
              <div className="font-semibold text-xs text-gray-700 mb-2 flex items-center gap-2">
                <span>Hintergrundfarbe</span>
              </div>
              <input
                type="color"
                value={backgroundColor}
                onChange={e => handleBackgroundColorChange(e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent cursor-pointer"
                title="Hintergrundfarbe wählen"
                disabled={isCollaborative}
              />
              <span className="ml-2 text-xs">{backgroundColor}</span>
            </div>
            {/* Advanced Snapping Toggle */}
            <div className="mb-4">
              <div className="font-semibold text-xs text-gray-700 mb-2 flex items-center gap-2">
                <span>Advanced Snapping</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={advancedSnapping}
                  onChange={e => setAdvancedSnapping(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                  
                />
                <span className="text-xs">Enable snapping to consistent spacing between elements</span>
              </label>
            </div>
            {/* Snapping Settings Section */}
            <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800">
              <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span>Snapping Settings</span>
              </div>
              {/* Show Snapping Guides Toggle */}
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSnappingGuides}
                  onChange={e => setShowSnappingGuides(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                  
                />
                <span className="text-sm">Show Snapping Guides</span>
              </label>
              {/* Advanced Snapping Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={advancedSnapping}
                  onChange={e => setAdvancedSnapping(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-400"
                  
                />
                <span className="text-sm">Advanced Snapping (consistent spacing)</span>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Publish Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6 text-red-500" /> Veröffentlichung aufheben
            </DialogTitle>
            <DialogDescription className="text-gray-700 mt-2">
              Achtung: Das Aufheben der Veröffentlichung macht deine Website offline. Nutzen sie dieses vor Website Updates oder co.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 mt-4">
            <div className="border rounded-lg p-4 bg-red-50 flex flex-col gap-2">
              <div className="font-semibold text-red-700 flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-400" /> Sofort offline schalten
              </div>
              <div className="text-xs text-red-700 mb-2">
                Deine Website wird <b>sofort</b> offline genommen. Besucher können sie nicht mehr aufrufen.
              </div>
              <Button variant="destructive" onClick={handleInstantUnpublish} disabled={revokingInstant} className="w-full">
                {revokingInstant ? 'Wird aufgehoben...' : 'Sofort offline schalten'}
              </Button>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setShowRevokeDialog(false)} className="w-full mt-6">Abbrechen</Button>
        </DialogContent>
      </Dialog>
      {showQuickProps && selectedElement && (
        <QuickPropertiesPopup
          key={selectedElement.id + '-' + (selectedElement.xPx ?? 0) + '-' + (selectedElement.yPx ?? 0)}
          element={selectedElement}
          onUpdate={updates => updateElement(selectedElement.id, updates)}
          onClose={() => setShowQuickProps(false)}
          editorRef={editorRef}
        />
      )}
    </>
  );
};