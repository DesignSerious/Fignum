import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Annotation, PendingAnnotation } from '../types/annotation';
import { AnnotationOverlay } from './AnnotationOverlay';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  file: File | null;
  annotations: Annotation[];
  pendingAnnotation: PendingAnnotation | null;
  selectedAnnotationId: string | null;
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
  onStartAnnotation: (x: number, y: number, page: number) => void;
  onCompleteAnnotation: (endX: number, endY: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  tool: 'select' | 'annotate-straight' | 'annotate-curved' | 'annotate-s-curved';
  numberSize: number;
  endingSize: number;
  pageNumberSize: number;
  onFileUpload: (file: File) => void;
  onPageChange?: (page: number) => void;
  onTotalPagesUpdate?: (total: number) => void;
  onCSVNumberDrop?: (number: string, x: number, y: number, page: number) => void;
  lineGap?: number; // NEW: Line gap prop
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  annotations,
  pendingAnnotation,
  selectedAnnotationId,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  onStartAnnotation,
  onCompleteAnnotation,
  zoom,
  setZoom,
  tool,
  numberSize,
  endingSize,
  pageNumberSize,
  onFileUpload,
  onPageChange,
  onTotalPagesUpdate,
  onCSVNumberDrop,
  lineGap = 8 // NEW: Default line gap
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // ULTRA-SIMPLIFIED: Just track if we've auto-fitted this specific file
  const [autoFittedFiles, setAutoFittedFiles] = useState<Set<string>>(new Set());
  
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [csvDragOver, setCSVDragOver] = useState(false);
  const [csvDragData, setCSVDragData] = useState<any>(null);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [middleMousePressed, setMiddleMousePressed] = useState(false);

  // Track CSV workflow state
  const [csvWorkflowActive, setCSVWorkflowActive] = useState(false);
  const [csvWorkflowData, setCSVWorkflowData] = useState<any>(null);

  // BULLETPROOF CLICK SYSTEM: Multiple layers of protection
  const [clickState, setClickState] = useState({
    lastClickTime: 0,
    processing: false,
    clickCount: 0
  });

  // Get unique file identifier
  const getFileKey = useCallback((file: File | null): string | null => {
    if (!file) return null;
    return `${file.name}_${file.size}_${file.lastModified}`;
  }, []);

  // ULTRA-SIMPLIFIED: Check if we should auto-fit
  const shouldAutoFit = useCallback((): boolean => {
    if (!file) return false;
    
    const fileKey = getFileKey(file);
    if (!fileKey) return false;
    
    // Only auto-fit if we haven't auto-fitted this file yet
    return !autoFittedFiles.has(fileKey);
  }, [file, getFileKey, autoFittedFiles]);

  // Reset auto-fit tracking when file changes
  useEffect(() => {
    if (!file) {
      // Clear all tracking when no file
      setAutoFittedFiles(new Set());
    }
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    
    // Reset pan state for new document
    setPanOffset({ x: 0, y: 0 });
    setLastPanOffset({ x: 0, y: 0 });
    
    // Notify parent about page change
    if (onPageChange) {
      onPageChange(1);
    }
    // Notify parent about total pages
    if (onTotalPagesUpdate) {
      onTotalPagesUpdate(numPages);
    }
  };

  // ULTRA-SIMPLIFIED: Auto-fit that only runs ONCE per file
  const performAutoFit = useCallback((page: any) => {
    if (!containerRef.current || !file || !shouldAutoFit()) {
      return;
    }

    const fileKey = getFileKey(file);
    if (!fileKey) return;

    console.log(`🎯 Auto-fitting file: ${fileKey}`);

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // More generous padding for better visual spacing
    const horizontalPadding = 100;
    const verticalPadding = 120;
    
    const availableWidth = Math.max(200, containerRect.width - horizontalPadding);
    const availableHeight = Math.max(200, containerRect.height - verticalPadding);
    
    const scaleX = availableWidth / page.width;
    const scaleY = availableHeight / page.height;
    
    // Use the smaller scale to ensure the ENTIRE page fits
    const optimalScale = Math.min(scaleX, scaleY);
    
    // Set reasonable bounds
    const minScale = 0.1;
    const maxScale = 2.5;
    const finalScale = Math.max(minScale, Math.min(optimalScale, maxScale));
    
    // Apply the zoom
    setZoom(finalScale);
    
    // Reset pan to center
    setPanOffset({ x: 0, y: 0 });
    setLastPanOffset({ x: 0, y: 0 });
    
    // CRITICAL: Mark this file as auto-fitted to prevent future auto-fits
    setAutoFittedFiles(prev => new Set(prev).add(fileKey));
    
    console.log(`✅ Auto-fitted to ${Math.round(finalScale * 100)}% zoom`);
    
  }, [file, shouldAutoFit, getFileKey, setZoom]);

  const onPageLoadSuccess = (page: any) => {
    setPageWidth(page.width);
    setPageHeight(page.height);
    
    // ULTRA-SIMPLIFIED: Only auto-fit if we should and haven't already
    if (shouldAutoFit()) {
      // Small delay to ensure container is ready
      setTimeout(() => {
        performAutoFit(page);
      }, 50);
    }
  };

  // Manual auto-fit function - FORCE auto-fit regardless of tracking
  const forceAutoFit = useCallback(() => {
    if (pageWidth > 0 && pageHeight > 0 && file) {
      const fileKey = getFileKey(file);
      if (fileKey) {
        // Remove from auto-fitted set to allow re-auto-fit
        setAutoFittedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileKey);
          return newSet;
        });
        
        // Trigger auto-fit
        const mockPage = { width: pageWidth, height: pageHeight };
        setTimeout(() => {
          performAutoFit(mockPage);
        }, 10);
      }
    }
  }, [pageWidth, pageHeight, file, getFileKey, performAutoFit]);

  // ENHANCED: Handle keyboard events for Delete key, spacebar panning, and ESCAPE to cancel pending annotations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedAnnotationId) {
        onDeleteAnnotation(selectedAnnotationId);
        onSelectAnnotation(null);
      } else if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+F or Cmd+F to force auto-fit
        e.preventDefault();
        forceAutoFit();
      } else if (e.key === 'Escape') {
        // CRITICAL NEW FEATURE: Cancel pending annotation with Escape key
        if (pendingAnnotation) {
          e.preventDefault();
          // Clear the pending annotation by calling onCompleteAnnotation with invalid coordinates
          // This will trigger the parent to clear the pending state
          onCompleteAnnotation(-1, -1); // Use invalid coordinates to signal cancellation
        } else if (selectedAnnotationId) {
          // If no pending annotation but something is selected, clear selection
          e.preventDefault();
          onSelectAnnotation(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        if (isPanning) {
          setIsPanning(false);
          setLastPanOffset(panOffset);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedAnnotationId, onDeleteAnnotation, onSelectAnnotation, spacePressed, isPanning, panOffset, forceAutoFit, pendingAnnotation, onCompleteAnnotation]);

  // Drag and drop handlers for PDF files and CSV data
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    
    // Check for CSV drag data first - MULTIPLE SOURCES
    let csvData = (window as any).csvDragData;
    
    // Also check dataTransfer
    if (!csvData) {
      try {
        const dragDataText = e.dataTransfer.getData('text/plain');
        if (dragDataText) {
          const dragData = JSON.parse(dragDataText);
          if (dragData.type === 'csv-reference') {
            csvData = dragData;
          }
        }
      } catch (e) {
        // Not JSON data, continue
      }
    }
    
    if (csvData) {
      setCSVDragData(csvData);
      setCSVDragOver(true);
      return;
    }
    
    // Check for file drag
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    
    if (dragCounter <= 1) {
      setIsDragOver(false);
      setCSVDragOver(false);
      setCSVDragData(null);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Keep checking for CSV data during drag over
    const csvData = (window as any).csvDragData;
    if (csvData && !csvDragOver) {
      setCSVDragData(csvData);
      setCSVDragOver(true);
    }
  }, [csvDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setCSVDragOver(false);
    setDragCounter(0);
    
    // Check for CSV data - MULTIPLE SOURCES
    let csvData = csvDragData || (window as any).csvDragData;
    
    // Also check drag data transfer
    if (!csvData) {
      try {
        const dragDataText = e.dataTransfer.getData('text/plain');
        if (dragDataText) {
          const dragData = JSON.parse(dragDataText);
          if (dragData.type === 'csv-reference') {
            csvData = dragData;
          }
        }
      } catch (err) {
        // Not JSON data
      }
    }
    
    if (csvData && onCSVNumberDrop && pageRef.current) {
      const pageRect = pageRef.current.getBoundingClientRect();
      const x = (e.clientX - pageRect.left) / zoom;
      const y = (e.clientY - pageRect.top) / zoom;
      
      // IMMEDIATELY start CSV workflow - no delays
      setCSVWorkflowActive(true);
      setCSVWorkflowData(csvData);
      
      // Call the CSV drop handler IMMEDIATELY
      onCSVNumberDrop(csvData.number, x, y, pageNumber);
      
      // Clean up drag state
      setCSVDragData(null);
      (window as any).csvDragData = null;
      
      // Clear CSV workflow after a short delay to prevent interference
      setTimeout(() => {
        setCSVWorkflowActive(false);
        setCSVWorkflowData(null);
      }, 200);
      
      return;
    }
    
    // Handle PDF file drop
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      onFileUpload(pdfFile);
    }
  }, [onFileUpload, onCSVNumberDrop, zoom, pageNumber, csvDragData]);

  // Handle global mouse events for middle mouse button
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        setMiddleMousePressed(false);
        if (isPanning) {
          setIsPanning(false);
          setLastPanOffset(panOffset);
        }
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning && middleMousePressed) {
        e.preventDefault();
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        setPanOffset({
          x: lastPanOffset.x + deltaX,
          y: lastPanOffset.y + deltaY
        });
      }
    };

    // Add global listeners for middle mouse button
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPanning, middleMousePressed, panStart, lastPanOffset]);

  // FIXED: Handle scroll wheel zoom - ONLY when hovering over the PDF content area
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // CRITICAL: Only zoom when hovering over the PDF content, not the entire viewer
    const target = e.target as Element;
    const isOverPDFContent = target.closest('.react-pdf__Page') || 
                            target.closest('.pdf-page-container') ||
                            target.closest('.annotation-overlay') ||
                            (pageRef.current && pageRef.current.contains(target));
    
    if (isOverPDFContent && file) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔍 PDF Zoom:', zoom, '→', zoom + (e.deltaY > 0 ? -0.1 : 0.1));
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(3.0, zoom + delta));
      setZoom(newZoom);
    }
  }, [zoom, setZoom, file]);

  // BULLETPROOF CLICK HANDLER: Multiple validation layers
  const processClick = useCallback((clientX: number, clientY: number) => {
    const currentTime = Date.now();
    
    // Layer 1: Time-based debouncing
    if (currentTime - clickState.lastClickTime < 150) {
      return false;
    }
    
    // Layer 2: Processing lock
    if (clickState.processing) {
      return false;
    }
    
    // Layer 3: State validation
    if (isPanning || spacePressed || middleMousePressed) {
      return false;
    }
    
    if (csvWorkflowActive) {
      return false;
    }
    
    // Layer 4: Element validation
    const pageElement = pageRef.current;
    if (!pageElement) {
      return false;
    }
    
    // Set processing lock
    setClickState(prev => ({
      ...prev,
      lastClickTime: currentTime,
      processing: true,
      clickCount: prev.clickCount + 1
    }));
    
    // Auto-clear processing lock
    setTimeout(() => {
      setClickState(prev => ({ ...prev, processing: false }));
    }, 200);
    
    try {
      const pageRect = pageElement.getBoundingClientRect();
      const x = (clientX - pageRect.left) / zoom;
      const y = (clientY - pageRect.top) / zoom;
      
      // Handle selection mode
      if (tool === 'select') {
        onSelectAnnotation(null);
        return true;
      }
      
      // Handle line drawing
      if (pendingAnnotation) {
        onCompleteAnnotation(x, y);
      } else {
        onStartAnnotation(x, y, pageNumber);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error processing click:', error);
      return false;
    }
  }, [
    clickState,
    isPanning,
    spacePressed,
    middleMousePressed,
    csvWorkflowActive,
    zoom,
    tool,
    pendingAnnotation,
    onSelectAnnotation,
    onCompleteAnnotation,
    onStartAnnotation,
    pageNumber
  ]);

  // MULTIPLE CLICK HANDLERS: Ensure we catch clicks from any source
  
  // Handler 1: Direct click on page container
  const handlePageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    processClick(e.clientX, e.clientY);
  }, [processClick]);

  // Handler 2: Click on PDF page itself
  const handlePDFPageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    processClick(e.clientX, e.clientY);
  }, [processClick]);

  // Handler 3: Global click handler as backup
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Only handle if click is within our PDF container
      if (pageRef.current && pageRef.current.contains(e.target as Node)) {
        processClick(e.clientX, e.clientY);
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [processClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      setMiddleMousePressed(true);
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (spacePressed && e.button === 0) { // Left mouse button with spacebar
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [spacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && (spacePressed || middleMousePressed)) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPanOffset({
        x: lastPanOffset.x + deltaX,
        y: lastPanOffset.y + deltaY
      });
    }
  }, [isPanning, panStart, lastPanOffset, spacePressed, middleMousePressed]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && isPanning && spacePressed) { // Left mouse button release during spacebar pan
      setIsPanning(false);
      setLastPanOffset(panOffset);
    }
  }, [isPanning, panOffset, spacePressed]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only prevent context menu on the page itself, not on annotation elements
    if (e.target === pageRef.current || (e.target as Element)?.closest('.react-pdf__Page')) {
      e.preventDefault();
    }
  }, []);

  // ULTRA-SIMPLIFIED: Page change with NO auto-fit logic
  const changePage = (offset: number) => {
    const newPageNumber = Math.max(1, Math.min(pageNumber + offset, numPages));
    setPageNumber(newPageNumber);
    
    // Notify parent about page change
    if (onPageChange) {
      onPageChange(newPageNumber);
    }
    
    // ALWAYS reset pan when changing pages
    setPanOffset({ x: 0, y: 0 });
    setLastPanOffset({ x: 0, y: 0 });
    
    // NO AUTO-FIT LOGIC HERE - only manual auto-fit allowed
  };

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (spacePressed || middleMousePressed) return 'grab';
    if (csvDragOver) return 'crosshair'; // Precise crosshair for CSV drops
    if (tool === 'select') return 'default';
    return pendingAnnotation ? 'crosshair' : 'crosshair';
  };

  const getToolName = () => {
    switch (tool) {
      case 'select': return 'selection';
      case 'annotate-straight': return 'straight reference line';
      case 'annotate-curved': return 'curved reference line';
      case 'annotate-s-curved': return 'S-curved reference line';
      default: return 'reference line';
    }
  };

  if (!file) {
    return (
      <div 
        className={`flex-1 flex items-center justify-center bg-gray-50 transition-all duration-300 ${
          isDragOver ? 'bg-blue-50 border-4 border-dashed border-blue-400' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center max-w-md mx-auto p-8">
          <div className={`w-32 h-32 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragOver 
              ? 'bg-blue-100 border-4 border-dashed border-blue-400 scale-110' 
              : 'bg-gray-200 border-2 border-dashed border-gray-300'
          }`}>
            <Upload 
              size={isDragOver ? 56 : 48} 
              className={`transition-all duration-300 ${
                isDragOver ? 'text-blue-600' : 'text-gray-400'
              }`} 
            />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
            isDragOver ? 'text-blue-700' : 'text-gray-700'
          }`}>
            {isDragOver ? 'Drop Patent Figure Here' : 'No Patent Figure Loaded'}
          </h3>
          
          <p className={`text-lg mb-6 transition-colors duration-300 ${
            isDragOver ? 'text-blue-600' : 'text-gray-500'
          }`}>
            {isDragOver 
              ? 'Release to load your patent figure PDF' 
              : 'Drag & drop a patent figure PDF here or use the Upload button'
            }
          </p>
          
          {!isDragOver && (
            <>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Supports PDF files up to 100MB</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Add numbered reference callouts with arrows</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Import CSV reference data for quick numbering</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Auto-zooms to show entire patent figure</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-4 p-4 bg-white border-b">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          
          {/* Manual auto-fit button */}
          <div className="ml-4 border-l border-gray-300 pl-4">
            <button
              onClick={forceAutoFit}
              className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
              title="Auto-fit to show entire page (Ctrl+F)"
            >
              Fit to View
            </button>
          </div>
        </div>
      )}
      
      {/* CRITICAL FIX: PDF Content Container with Scroll Wheel Zoom Detection */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-auto flex items-center justify-center bg-gray-50"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          minHeight: 0 // Allow flex shrinking
        }}
      >
        <div 
          className="relative pdf-content-area"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            cursor: getCursor(),
            margin: 0,
            padding: 0
          }}
        >
          <div className="relative inline-block shadow-lg pdf-page-container">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              className="border border-gray-300"
            >
              <div 
                ref={pageRef}
                className="relative annotation-overlay"
                onClick={handlePageClick}
                style={{ 
                  position: 'relative',
                  zIndex: 1,
                  display: 'block',
                  lineHeight: 0 // Remove line height that can create gaps
                }}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={zoom}
                  onLoadSuccess={onPageLoadSuccess}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onClick={handlePDFPageClick}
                />
                
                {/* CLICKABLE OVERLAY: Ensures clicks are always captured */}
                <div
                  className="absolute inset-0 w-full h-full"
                  onClick={handlePageClick}
                  style={{
                    zIndex: 2,
                    backgroundColor: 'transparent',
                    cursor: getCursor()
                  }}
                  title={
                    pendingAnnotation 
                      ? "Click to place end point • Press Escape to cancel" 
                      : tool === 'select' 
                        ? "Click to select reference callouts" 
                        : "Click to start drawing reference line"
                  }
                />
                
                <AnnotationOverlay
                  annotations={annotations}
                  pendingAnnotation={pendingAnnotation}
                  selectedAnnotationId={selectedAnnotationId}
                  scale={zoom}
                  currentPage={pageNumber}
                  onUpdateAnnotation={onUpdateAnnotation}
                  onDeleteAnnotation={onDeleteAnnotation}
                  onSelectAnnotation={onSelectAnnotation}
                  tool={tool}
                  pageRef={pageRef}
                  numberSize={numberSize}
                  endingSize={endingSize}
                  lineGap={lineGap}
                />
              </div>
            </Document>
          </div>
        </div>
      </div>

      {/* CSV Drop indicator */}
      {csvDragOver && csvDragData && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Drop to start reference #{csvDragData.number} - {csvDragData.description}
        </div>
      )}

      {/* CSV Workflow Active indicator */}
      {csvWorkflowActive && csvWorkflowData && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Starting reference #{csvWorkflowData.number} - Click to place end point
        </div>
      )}

      {/* ENHANCED: Status indicator with Escape key instruction */}
      {pendingAnnotation && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg">
          {pendingAnnotation.number > 0 
            ? `Click to place the end point for template reference #${pendingAnnotation.number} • Press Escape to cancel`
            : `Click to place the end point for ${getToolName()} • Press Escape to cancel`
          }
        </div>
      )}

      {/* Selection status */}
      {selectedAnnotationId && !pendingAnnotation && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          Reference callout selected • Press Delete to remove • Right-click points to move
        </div>
      )}

      {/* Pan instruction */}
      {!selectedAnnotationId && !csvWorkflowActive && !pendingAnnotation && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          Hold Space + drag or Middle-click + drag to pan • Scroll over PDF to zoom • Ctrl+F to auto-fit
        </div>
      )}
    </div>
  );
};