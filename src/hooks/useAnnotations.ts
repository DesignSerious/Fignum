import { useState, useCallback } from 'react';
import { Annotation, AnnotationHistory } from '../types/annotation';

export const useAnnotations = () => {
  const [history, setHistory] = useState<AnnotationHistory>({
    past: [],
    present: [],
    future: []
  });

  const addToHistory = useCallback((annotations: Annotation[]) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: annotations,
      future: []
    }));
  }, []);

  // NEW: Function to load annotations without creating history
  const loadAnnotations = useCallback((annotations: Annotation[]) => {
    setHistory({
      past: [],
      present: annotations,
      future: []
    });
  }, []);

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const newAnnotations = [...history.present, newAnnotation];
    addToHistory(newAnnotations);
  }, [history.present, addToHistory]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    const newAnnotations = history.present.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    );
    addToHistory(newAnnotations);
  }, [history.present, addToHistory]);

  const deleteAnnotation = useCallback((id: string) => {
    const newAnnotations = history.present.filter(ann => ann.id !== id);
    addToHistory(newAnnotations);
  }, [history.present, addToHistory]);

  const clearAllAnnotations = useCallback(() => {
    if (history.present.length > 0) {
      addToHistory([]);
    }
  }, [history.present, addToHistory]);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);
    
    setHistory({
      past: newPast,
      present: previous,
      future: [history.present, ...history.future]
    });
  }, [history]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: newFuture
    });
  }, [history]);

  return {
    annotations: history.present,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
    loadAnnotations, // NEW: Export the loadAnnotations function
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0
  };
};