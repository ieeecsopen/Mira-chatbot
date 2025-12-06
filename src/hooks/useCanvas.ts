import { useState, useCallback, useEffect } from 'react';
import {
  type CanvasItem,
  type CanvasState,
  generateCanvasId,
  detectContentType,
  generateCanvasTitle,
  saveCanvasItems,
  loadCanvasItems
} from '../lib/canvas';

export function useCanvas() {
  const [state, setState] = useState<CanvasState>({
    isOpen: false,
    activeItemId: null,
    items: [],
    viewMode: 'code',
  });

  // Load items from storage on mount
  useEffect(() => {
    const storedItems = loadCanvasItems();
    if (storedItems.length > 0) {
      setState(prev => ({ ...prev, items: storedItems }));
    }
  }, []);

  // Save items when they change
  useEffect(() => {
    saveCanvasItems(state.items);
  }, [state.items]);

  // Open canvas
  const openCanvas = useCallback((itemId?: string) => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      activeItemId: itemId || prev.items[prev.items.length - 1]?.id || null,
    }));
  }, []);

  // Close canvas
  const closeCanvas = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Toggle canvas
  const toggleCanvas = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // Add new item to canvas
  const addItem = useCallback((content: string, title?: string, type?: CanvasItem['type'], language?: string, initialViewMode?: CanvasState['viewMode']) => {
    const detected = detectContentType(content);
    const finalType = type || detected.type;
    const finalLanguage = language || detected.language;

    const newItem: CanvasItem = {
      id: generateCanvasId(),
      type: finalType,
      title: title || generateCanvasTitle(content, finalType),
      content,
      language: finalLanguage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      activeItemId: newItem.id,
      isOpen: true,
      viewMode: initialViewMode || 'code',
    }));

    return newItem.id;
  }, []);

  // Set view mode
  const setViewMode = useCallback((mode: CanvasState['viewMode']) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  // Update an item
  const updateItem = useCallback((id: string, content: string) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id
          ? { ...item, content, updatedAt: Date.now() }
          : item
      ),
    }));
  }, []);

  // Delete an item
  const deleteItem = useCallback((id: string) => {
    setState(prev => {
      const newItems = prev.items.filter(item => item.id !== id);
      let newActiveId = prev.activeItemId;

      if (prev.activeItemId === id) {
        // Select previous or next item
        const deletedIndex = prev.items.findIndex(item => item.id === id);
        if (newItems.length > 0) {
          newActiveId = newItems[Math.min(deletedIndex, newItems.length - 1)]?.id || null;
        } else {
          newActiveId = null;
        }
      }

      return {
        ...prev,
        items: newItems,
        activeItemId: newActiveId,
        isOpen: newItems.length > 0 ? prev.isOpen : false,
      };
    });
  }, []);

  // Select an item
  const selectItem = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeItemId: id }));
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    setState({
      isOpen: false,
      activeItemId: null,
      items: [],
      viewMode: 'code',
    });
  }, []);

  // Check if content should open in canvas
  const shouldOpenInCanvas = useCallback((content: string): boolean => {
    // Check for code blocks
    if (/```[\s\S]{50,}```/.test(content)) return true;

    // Check for substantial code patterns
    const codeLines = content.split('\n').filter(line =>
      /^\s*(import|export|function|class|const|let|var|def|public|private|interface|type)/.test(line)
    );
    if (codeLines.length >= 5) return true;

    // Check for tables
    if (/^\|.+\|$/m.test(content) && content.split('\n').filter(l => l.startsWith('|')).length >= 3) {
      return true;
    }

    // Check for HTML documents
    if (/<(!DOCTYPE|html|head|body)/i.test(content)) return true;

    return false;
  }, []);

  // Extract and add content to canvas from message
  const extractToCanvas = useCallback((content: string): string | null => {
    // Extract code blocks
    const codeBlockMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || 'plaintext';
      const code = codeBlockMatch[2].trim();
      return addItem(code, undefined, 'code', language);
    }

    // Extract HTML
    if (/<(!DOCTYPE|html)/i.test(content)) {
      return addItem(content, 'HTML Document', 'html');
    }

    // Extract tables
    if (/^\|.+\|$/m.test(content)) {
      const tableLines = content.split('\n').filter(l => l.trim().startsWith('|'));
      if (tableLines.length >= 2) {
        return addItem(tableLines.join('\n'), 'Data Table', 'table');
      }
    }

    return null;
  }, [addItem]);

  return {
    ...state,
    openCanvas,
    closeCanvas,
    toggleCanvas,
    addItem,
    updateItem,
    deleteItem,
    selectItem,
    clearAll,
    shouldOpenInCanvas,
    extractToCanvas,
    setViewMode,
  };
}

export type UseCanvasReturn = ReturnType<typeof useCanvas>;
