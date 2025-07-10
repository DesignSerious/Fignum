import React, { useState } from 'react';
import { Annotation } from '../types/annotation';
import { Copy, Trash2, ChevronDown, ChevronRight, RotateCw, Sliders, Hash, Target, Circle, ArrowRight, Minus, Spline } from 'lucide-react';
import { DuplicateModal } from './DuplicateModal';

interface AnnotationPanelProps {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
  onDuplicateAnnotation: (annotation: Annotation, targetPage: number) => void;
  currentPage: number;
  totalPages: number;
  numberSize: number;
  endingSize: number;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  selectedAnnotationId,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  onDuplicateAnnotation,
  currentPage,
  totalPages,
  numberSize,
  endingSize
}) => {
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [annotationToDuplicate, setAnnotationToDuplicate] = useState<Annotation | null>(null);

  const pageAnnotations = annotations
    .filter(ann => ann.page === currentPage)
    .sort((a, b) => a.number - b.number);

  const toggleExpanded = (annotationId: string) => {
    const newExpanded = new Set(expandedAnnotations);
    if (newExpanded.has(annotationId)) {
      newExpanded.delete(annotationId);
    } else {
      newExpanded.add(annotationId);
    }
    setExpandedAnnotations(newExpanded);
  };

  const handleDuplicateClick = (annotation: Annotation) => {
    setAnnotationToDuplicate(annotation);
    setShowDuplicateModal(true);
  };

  const handleDuplicateConfirm = (targetPage: number) => {
    if (annotationToDuplicate) {
      onDuplicateAnnotation(annotationToDuplicate, targetPage);
    }
    setShowDuplicateModal(false);
    setAnnotationToDuplicate(null);
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false);
    setAnnotationToDuplicate(null);
  };

  const handleAnnotationClick = (annotationId: string) => {
    // Auto-expand when clicked
    const newExpanded = new Set(expandedAnnotations);
    newExpanded.add(annotationId);
    setExpandedAnnotations(newExpanded);
    
    // Also select the annotation
    onSelectAnnotation(annotationId);
  };

  // ROBUST curvature change handler - NO SNAPPING ALLOWED
  const handleCurvatureChange = (annotationId: string, rawValue: string) => {
    // Parse and clamp the value strictly
    const numericValue = parseInt(rawValue, 10);
    const clampedValue = isNaN(numericValue) ? 0 : Math.max(0, Math.min(100, numericValue));
    
    // IMMEDIATE update - no delays, no local state, no conflicts
    onUpdateAnnotation(annotationId, { curvature: clampedValue });
  };

  const getEndTypeIcon = (endType: Annotation['endType']) => {
    const iconProps = { size: 14 };
    switch (endType) {
      case 'dot': return <Circle {...iconProps} />;
      case 'arrow': return <ArrowRight {...iconProps} />;
      case 'none': return <Minus {...iconProps} />;
    }
  };

  const getLineTypeIcon = (lineType: Annotation['lineType']) => {
    const iconProps = { size: 14 };
    switch (lineType) {
      case 'straight': return <Minus {...iconProps} />;
      case 'curved': return <Spline {...iconProps} />;
      case 's-curved': return <span className="text-sm font-bold">S</span>;
    }
  };

  const getLineTypeName = (lineType: Annotation['lineType']) => {
    switch (lineType) {
      case 'straight': return 'Straight';
      case 'curved': return 'Curved';
      case 's-curved': return 'S-Curved';
    }
  };

  if (pageAnnotations.length === 0) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Reference Callouts</h3>
        <div className="text-center text-gray-500 mt-8">
          <p>No reference callouts on this page</p>
          <p className="text-sm mt-2">Choose a reference line tool and click twice on the patent figure to add numbered reference callouts</p>
          <div className="mt-4 text-xs text-gray-400">
            <p>1. Select Straight, Curved, or S-Curved reference line tool</p>
            <p>2. Click to place reference number</p>
            <p>3. Click to place end point (pointing to component)</p>
            <p>4. Choose end type (arrow, dot, or none)</p>
            <p>5. Enter reference number</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Reference Callouts ({pageAnnotations.length})
      </h3>
      
      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {pageAnnotations.map((annotation) => {
          const isExpanded = expandedAnnotations.has(annotation.id);
          const isSelected = selectedAnnotationId === annotation.id;
          const currentCurvature = annotation.curvature ?? 50; // Use nullish coalescing for safety
          
          return (
            <div
              key={annotation.id}
              className={`rounded-lg border overflow-hidden transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : isExpanded 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
              }`}
              onClick={() => handleAnnotationClick(annotation.id)}
            >
              {/* Header - Clean and minimal */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Expand/Collapse Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(annotation.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    
                    {/* Black circle with white number */}
                    <div 
                      className="rounded-full flex items-center justify-center font-bold bg-black text-white"
                      style={{
                        width: '32px',
                        height: '32px',
                        fontSize: '16px'
                      }}
                    >
                      {annotation.number}
                    </div>
                  </div>
                  
                  {/* Action Buttons - Duplicate and Delete only */}
                  <div className="flex items-center gap-2">
                    {/* Duplicate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateClick(annotation);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                      title="Duplicate to another page"
                    >
                      <Copy size={14} />
                      Duplicate
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnnotation(annotation.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete reference callout"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Content - Full Details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-200 bg-white">
                  <div className="space-y-3 pt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Reference Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={annotation.number}
                        onChange={(e) => onUpdateAnnotation(annotation.id, { 
                          number: Math.max(1, parseInt(e.target.value) || 1) 
                        })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Global Size Info */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Hash size={12} />
                          Number Size: {numberSize}px (Global)
                        </div>
                      </label>
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        Reference number size is controlled globally in the toolbar
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Target size={12} />
                          Arrow/Dot Size: {endingSize}px (Global)
                        </div>
                      </label>
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        Ending size is controlled globally in the toolbar
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Reference Line Type
                      </label>
                      <select
                        value={annotation.lineType}
                        onChange={(e) => onUpdateAnnotation(annotation.id, { 
                          lineType: e.target.value as Annotation['lineType']
                        })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="straight">Straight Reference Line</option>
                        <option value="curved">Curved Reference Line</option>
                        <option value="s-curved">S-Curved Reference Line</option>
                      </select>
                    </div>

                    {/* Curve Flip Option - show for BOTH curved and S-curved lines */}
                    {(annotation.lineType === 'curved' || annotation.lineType === 's-curved') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Curve Direction
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateAnnotation(annotation.id, { 
                              curveFlipped: !annotation.curveFlipped 
                            });
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors w-full"
                        >
                          <RotateCw size={14} className="text-blue-600" />
                          <span className="text-blue-700">
                            {annotation.curveFlipped ? 'Flip curve back' : 'Flip curve direction'}
                          </span>
                        </button>
                        {annotation.curveFlipped && (
                          <p className="text-xs text-blue-600 mt-1">
                            {annotation.lineType === 'curved' ? 'Curve is currently flipped' : 'S-curve is currently flipped'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* BULLETPROOF Curvature Control - ZERO SNAP PREVENTION */}
                    {(annotation.lineType === 'curved' || annotation.lineType === 's-curved') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Sliders size={12} />
                            Curvature: {currentCurvature}%
                          </div>
                        </label>
                        
                        {/* BULLETPROOF slider - direct value binding, no state conflicts */}
                        <div className="relative mb-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={currentCurvature}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleCurvatureChange(annotation.id, e.target.value);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 curvature-slider"
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>0% (Straight)</span>
                          <span>50% (Default)</span>
                          <span>100% (Maximum)</span>
                        </div>
                        
                        {/* Visual feedback with exact percentage */}
                        <div className="text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            currentCurvature === 0 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : currentCurvature <= 25
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : currentCurvature <= 75
                                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                  : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}>
                            {currentCurvature === 0 
                              ? '🔥 STRAIGHT LINE (0%)' 
                              : currentCurvature <= 25
                                ? `Slight Curve (${currentCurvature}%)`
                                : currentCurvature <= 75
                                  ? `Moderate Curve (${currentCurvature}%)`
                                  : `Strong Curve (${currentCurvature}%)`
                            }
                          </span>
                        </div>
                        
                        {/* Debug info for 0% case */}
                        {currentCurvature === 0 && (
                          <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2 border border-green-200">
                            ✅ Perfect! Curvature is exactly 0% - reference line will render completely straight
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        End Type
                      </label>
                      <select
                        value={annotation.endType}
                        onChange={(e) => onUpdateAnnotation(annotation.id, { 
                          endType: e.target.value as Annotation['endType']
                        })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="arrow">Arrow</option>
                        <option value="dot">Dot</option>
                        <option value="none">Nothing</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <div>Start: ({Math.round(annotation.startX)}, {Math.round(annotation.startY)})</div>
                      <div>End: ({Math.round(annotation.endX)}, {Math.round(annotation.endY)})</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Duplicate Modal */}
      <DuplicateModal
        isOpen={showDuplicateModal}
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateCancel}
        currentPage={currentPage}
        totalPages={totalPages}
        annotationNumber={annotationToDuplicate?.number || 0}
      />

      {/* ENHANCED SLIDER STYLES - Ensure visible track for curvature sliders */}
      <style jsx>{`
        .curvature-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        
        .curvature-slider::-webkit-slider-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #e5e7eb;
          border-radius: 4px;
          border: 1px solid #d1d5db;
        }
        
        .curvature-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          margin-top: -6px;
        }
        
        .curvature-slider::-moz-range-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #e5e7eb;
          border-radius: 4px;
          border: 1px solid #d1d5db;
        }
        
        .curvature-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 2px white, 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .curvature-slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        
        .curvature-slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
};