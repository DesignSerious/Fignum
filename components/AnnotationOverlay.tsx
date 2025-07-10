import React, { useState } from 'react';
import { Annotation, PendingAnnotation } from '../types/annotation';
import { renderAnnotation } from '../utils/sharedRenderer';

interface AnnotationOverlayProps {
  annotations: Annotation[];
  pendingAnnotation: PendingAnnotation | null;
  selectedAnnotationId: string | null;
  scale: number;
  currentPage: number;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
  tool: 'select' | 'annotate-straight' | 'annotate-curved' | 'annotate-s-curved';
  pageRef: React.RefObject<HTMLDivElement>;
  numberSize: number;
  endingSize: number;
  lineGap?: number; // NEW: Line gap prop
}

interface DragState {
  isDragging: boolean;
  dragId: string | null;
  dragType: 'start' | 'end' | 'whole';
  startX: number;
  startY: number;
}

interface MoveState {
  isMoving: boolean;
  moveId: string | null;
  moveType: 'start' | 'end' | null;
  originalX: number;
  originalY: number;
}

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  annotations,
  pendingAnnotation,
  selectedAnnotationId,
  scale,
  currentPage,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  tool,
  pageRef,
  numberSize,
  endingSize,
  lineGap = 8 // NEW: Default line gap
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragId: null,
    dragType: 'whole',
    startX: 0,
    startY: 0
  });

  const [moveState, setMoveState] = useState<MoveState>({
    isMoving: false,
    moveId: null,
    moveType: null,
    originalX: 0,
    originalY: 0
  });

  const pageAnnotations = annotations.filter(ann => ann.page === currentPage);

  // Global mouse move handler for move mode - tracks mouse ANYWHERE on screen
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (moveState.isMoving && moveState.moveId && pageRef.current) {
        const pageRect = pageRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - pageRect.left) / scale;
        const mouseY = (e.clientY - pageRect.top) / scale;
        
        if (moveState.moveType === 'start') {
          onUpdateAnnotation(moveState.moveId, {
            startX: Math.max(0, mouseX),
            startY: Math.max(0, mouseY)
          });
        } else if (moveState.moveType === 'end') {
          onUpdateAnnotation(moveState.moveId, {
            endX: Math.max(0, mouseX),
            endY: Math.max(0, mouseY)
          });
        }
      }
    };

    // Only add global listener when in move mode
    if (moveState.isMoving) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
    }
  }, [moveState, scale, pageRef, onUpdateAnnotation]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // This is now just a fallback - the global handler above does the real work
    // Keep this for compatibility but the global handler will take precedence
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      dragId: null,
      dragType: 'whole',
      startX: 0,
      startY: 0
    });
  };

  const handleAnnotationClick = (e: React.MouseEvent, annotation: Annotation) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle selection in select mode
    if (tool === 'select') {
      onSelectAnnotation(annotation.id);
    }
  };

  const handleRightClick = (e: React.MouseEvent, annotation: Annotation, pointType: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    
    // If in move mode, save the position and exit move mode
    if (moveState.isMoving && moveState.moveId === annotation.id) {
      setMoveState({
        isMoving: false,
        moveId: null,
        moveType: null,
        originalX: 0,
        originalY: 0
      });
      return;
    }
    
    // Start move mode immediately - no context menu
    const originalX = pointType === 'start' ? annotation.startX : annotation.endX;
    const originalY = pointType === 'start' ? annotation.startY : annotation.endY;
    
    setMoveState({
      isMoving: true,
      moveId: annotation.id,
      moveType: pointType,
      originalX,
      originalY
    });
  };

  // Handle escape key to cancel move mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && moveState.isMoving) {
        // Cancel move mode and restore original position
        if (moveState.moveId && moveState.moveType) {
          if (moveState.moveType === 'start') {
            onUpdateAnnotation(moveState.moveId, {
              startX: moveState.originalX,
              startY: moveState.originalY
            });
          } else if (moveState.moveType === 'end') {
            onUpdateAnnotation(moveState.moveId, {
              endX: moveState.originalX,
              endY: moveState.originalY
            });
          }
        }
        setMoveState({
          isMoving: false,
          moveId: null,
          moveType: null,
          originalX: 0,
          originalY: 0
        });
      }
    };

    if (moveState.isMoving) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [moveState, onUpdateAnnotation]);

  // Global right-click handler to save position when in move mode
  React.useEffect(() => {
    const handleGlobalRightClick = (e: MouseEvent) => {
      if (moveState.isMoving) {
        e.preventDefault();
        e.stopPropagation();
        
        // Save position and exit move mode
        setMoveState({
          isMoving: false,
          moveId: null,
          moveType: null,
          originalX: 0,
          originalY: 0
        });
      }
    };

    if (moveState.isMoving) {
      document.addEventListener('contextmenu', handleGlobalRightClick, { capture: true });
      return () => document.removeEventListener('contextmenu', handleGlobalRightClick, { capture: true });
    }
  }, [moveState]);

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Render completed annotations using SHARED RENDERER */}
        {pageAnnotations.map((annotation) => {
          // Ensure we have valid coordinates before rendering
          const hasValidCoords = annotation.startX !== undefined && 
                                annotation.startY !== undefined && 
                                annotation.endX !== undefined && 
                                annotation.endY !== undefined &&
                                !isNaN(annotation.startX) && 
                                !isNaN(annotation.startY) && 
                                !isNaN(annotation.endX) && 
                                !isNaN(annotation.endY);
          
          if (!hasValidCoords) return null;
          
          const isSelected = selectedAnnotationId === annotation.id;
          
          // Use SHARED RENDERER - EDITOR coordinate system with line gap
          const rendered = renderAnnotation(
            annotation.startX,
            annotation.startY,
            annotation.endX,
            annotation.endY,
            annotation.lineType,
            annotation.endType,
            annotation.number,
            annotation.curvature || 50,
            annotation.curveFlipped || false,
            numberSize,
            endingSize,
            'editor', // EDITOR coordinate system
            undefined, // No page height needed for editor
            lineGap // NEW: Pass line gap to renderer
          );
          
          return (
            <g key={annotation.id}>
              {/* Selection highlight - render behind the annotation */}
              {isSelected && (
                <>
                  {/* Line path highlight */}
                  <path
                    d={`M ${rendered.path.segments.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')}`}
                    stroke="#3b82f6"
                    strokeWidth={(rendered.path.strokeWidth + 4) * scale}
                    fill="none"
                    opacity="0.3"
                  />
                  
                  {/* White path highlight if present */}
                  {rendered.whitePath && (
                    <path
                      d={`M ${rendered.whitePath.segments.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')}`}
                      stroke="#3b82f6"
                      strokeWidth={(rendered.whitePath.strokeWidth + 4) * scale}
                      fill="none"
                      opacity="0.3"
                    />
                  )}
                  
                  {/* Arrow highlight */}
                  {rendered.arrow && (
                    <path
                      d={`M ${rendered.arrow.points.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')} Z`}
                      stroke="#3b82f6"
                      strokeWidth={(rendered.arrow.strokeWidth + 4) * scale}
                      fill="#3b82f6"
                      opacity="0.3"
                    />
                  )}
                  
                  {/* Circle highlight */}
                  {rendered.circle && (
                    <circle
                      cx={rendered.circle.center.x * scale}
                      cy={rendered.circle.center.y * scale}
                      r={(rendered.circle.radius + 4) * scale}
                      fill="#3b82f6"
                      opacity="0.3"
                    />
                  )}

                  {/* Text background highlight */}
                  <rect
                    x={(rendered.text.backgroundColor[0].x - 4) * scale}
                    y={(rendered.text.backgroundColor[0].y - 4) * scale}
                    width={(rendered.text.backgroundColor[1].x - rendered.text.backgroundColor[0].x + 8) * scale}
                    height={(rendered.text.backgroundColor[2].y - rendered.text.backgroundColor[1].y + 8) * scale}
                    fill="#3b82f6"
                    opacity="0.2"
                    rx="4"
                  />
                </>
              )}
              
              {/* White path (initial straight segment) - render first so it appears behind */}
              {rendered.whitePath && (
                <path
                  d={`M ${rendered.whitePath.segments.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')}`}
                  stroke="#ffffff"
                  strokeWidth={rendered.whitePath.strokeWidth * scale}
                  fill="none"
                />
              )}
              
              {/* Main line path (curved portion) */}
              <path
                d={`M ${rendered.path.segments.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')}`}
                stroke="#000000"
                strokeWidth={rendered.path.strokeWidth * scale}
                fill="none"
              />
              
              {/* Arrow */}
              {rendered.arrow && (
                <path
                  d={`M ${rendered.arrow.points.map(p => `${p.x * scale} ${p.y * scale}`).join(' L ')} Z`}
                  stroke="#000000"
                  strokeWidth={rendered.arrow.strokeWidth * scale}
                  fill="#000000"
                />
              )}
              
              {/* Circle */}
              {rendered.circle && (
                <circle
                  cx={rendered.circle.center.x * scale}
                  cy={rendered.circle.center.y * scale}
                  r={rendered.circle.radius * scale}
                  fill="#000000"
                />
              )}

              {/* Text background - CLEAN WHITE BACKGROUND WITH NO STYLING */}
              <rect
                x={rendered.text.backgroundColor[0].x * scale}
                y={rendered.text.backgroundColor[0].y * scale}
                width={(rendered.text.backgroundColor[1].x - rendered.text.backgroundColor[0].x) * scale}
                height={(rendered.text.backgroundColor[2].y - rendered.text.backgroundColor[1].y) * scale}
                fill="white"
                stroke="none"
              />

              {/* Text number */}
              <text
                x={rendered.text.position.x * scale}
                y={rendered.text.position.y * scale + (rendered.text.fontSize * scale * 0.35)}
                fontSize={rendered.text.fontSize * scale}
                fontWeight="bold"
                fill="black"
                textAnchor="middle"
                className="select-none"
              >
                {rendered.text.text}
              </text>
            </g>
          );
        })}
        
        {/* Render pending annotation - MINIMAL BLACK DOT ONLY */}
        {pendingAnnotation && (
          <g>
            <circle
              cx={pendingAnnotation.startX * scale}
              cy={pendingAnnotation.startY * scale}
              r="3"
              fill="#000000"
            />
          </g>
        )}
      </svg>

      {/* Render interactive elements */}
      {pageAnnotations.map((annotation) => {
        // Ensure we have valid coordinates before rendering interactive elements
        const hasValidCoords = annotation.startX !== undefined && 
                              annotation.startY !== undefined && 
                              annotation.endX !== undefined && 
                              annotation.endY !== undefined &&
                              !isNaN(annotation.startX) && 
                              !isNaN(annotation.startY) && 
                              !isNaN(annotation.endX) && 
                              !isNaN(annotation.endY);
        
        if (!hasValidCoords) return null;
        
        const isSelected = selectedAnnotationId === annotation.id;
        
        return (
          <div key={`interactive-${annotation.id}`}>
            {/* Main annotation clickable area for selection */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: Math.min(annotation.startX, annotation.endX) * scale,
                top: Math.min(annotation.startY, annotation.endY) * scale,
                width: Math.abs(annotation.endX - annotation.startX) * scale + 40,
                height: Math.abs(annotation.endY - annotation.startY) * scale + 40,
                zIndex: 5
              }}
              onClick={(e) => handleAnnotationClick(e, annotation)}
              title={tool === 'select' ? `Click to select annotation #${annotation.number}` : ''}
            />

            {/* Start point handle - INVISIBLE CLICKABLE AREA ONLY */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: annotation.startX * scale,
                top: annotation.startY * scale,
                transform: 'translate(-50%, -50%)',
                width: '40px', // Larger clickable area
                height: '40px', // Larger clickable area
                zIndex: 10
              }}
              onContextMenu={(e) => handleRightClick(e, annotation, 'start')}
              title={moveState.isMoving && moveState.moveId === annotation.id && moveState.moveType === 'start'
                ? "Right-click anywhere to save • Escape to cancel" 
                : "Right-click to move start point with mouse"}
            />

            {/* LARGER invisible clickable area for end point - ALWAYS show for right-click functionality */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: annotation.endX * scale,
                top: annotation.endY * scale,
                transform: 'translate(-50%, -50%)',
                width: '32px', // LARGER clickable area
                height: '32px', // LARGER clickable area
                zIndex: 10
              }}
              onContextMenu={(e) => handleRightClick(e, annotation, 'end')}
              title={moveState.isMoving && moveState.moveId === annotation.id && moveState.moveType === 'end' 
                ? "Right-click anywhere to save • Escape to cancel" 
                : "Right-click to move end point with mouse"}
            />

            {/* Status text for move mode - positioned near the points */}
            {moveState.isMoving && moveState.moveId === annotation.id && moveState.moveType === 'start' && (
              <div 
                className="absolute pointer-events-none bg-blue-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-20"
                style={{
                  left: annotation.startX * scale,
                  top: annotation.startY * scale - 30,
                  transform: 'translateX(-50%)'
                }}
              >
                Right-click anywhere to save • Escape to cancel
              </div>
            )}

            {/* Status text for move mode - positioned near the end point */}
            {moveState.isMoving && moveState.moveId === annotation.id && moveState.moveType === 'end' && (
              <div 
                className="absolute pointer-events-none bg-blue-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-20"
                style={{
                  left: annotation.endX * scale,
                  top: annotation.endY * scale + 20,
                  transform: 'translateX(-50%)'
                }}
              >
                Right-click anywhere to save • Escape to cancel
              </div>
            )}
          </div>
        );
      })}

      {/* Move mode status indicator */}
      {moveState.isMoving && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg z-50">
          Moving {moveState.moveType === 'start' ? 'start point' : 'end point'} of annotation #{pageAnnotations.find(a => a.id === moveState.moveId)?.number} - Right-click anywhere to save • Press Escape to cancel
        </div>
      )}
    </div>
  );
};