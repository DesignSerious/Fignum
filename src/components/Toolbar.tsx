import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw, 
  Minus,
  Spline,
  Trash2,
  Hash,
  Target,
  MousePointer,
  Check,
  HelpCircle,
  X,
  Edit3,
  LayoutDashboard,
  FileText,
  Circle,
  ArrowRight,
  Move,
  ChevronUp,
  ChevronDown,
  Grid3X3,
  Search
} from 'lucide-react';

interface ToolbarProps {
  onFileUpload: (file: File) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  tool: 'select' | 'annotate-straight' | 'annotate-curved' | 'annotate-s-curved';
  onToolChange: (tool: 'select' | 'annotate-straight' | 'annotate-curved' | 'annotate-s-curved') => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearAll: () => void;
  hasFile: boolean;
  numberSize: number;
  onNumberSizeChange: (size: number) => void;
  endingSize: number;
  onEndingSizeChange: (size: number) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  pageNumberSize: number;
  onPageNumberSizeChange: (size: number) => void;
  onBackToDashboard: () => void;
  onSaveProject: () => void;
  hasAnnotations: boolean;
  currentProjectTitle?: string;
  isExistingProject?: boolean;
  // Line ending controls
  defaultEndType?: 'dot' | 'arrow' | 'none';
  onDefaultEndTypeChange?: (endType: 'dot' | 'arrow' | 'none') => void;
  // Line gap control
  lineGap?: number;
  onLineGapChange?: (gap: number) => void;
}

// Official Fignum logo component for toolbar
const FignumLogo = () => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  if (imageError) {
    // Fallback with brand colors
    return (
      <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center">
        <span className="text-white font-bold text-xs">F</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {!imageLoaded && (
        <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-xs">F</span>
        </div>
      )}
      <img 
        src="/fignum-logo.png" 
        alt="Fignum Logo" 
        className={`w-5 h-5 rounded object-cover transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ 
          display: imageLoaded ? 'block' : 'none'
        }}
      />
    </div>
  );
};

// Perfect S-Curve Icon matching reference image
const SCurveIcon = ({ size = 20, className = "text-white" }: { size?: number; className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path 
        d="M 3 16 Q 6 10 10 12 Q 14 14 17 4" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
};

// Perfect Curved Line Icon matching reference image
const CurvedLineIcon = ({ size = 20, className = "text-white" }: { size?: number; className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path 
        d="M 3 16 Q 10 6 17 16" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
};

// Perfect Arrow Icon - matching the reference image exactly
const ArrowIcon = ({ size = 20, className = "text-white" }: { size?: number; className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path 
        d="M8 5L16 12L8 19V5Z" 
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
};

// Perfect Zoom In Icon matching reference image
const ZoomInIcon = ({ size = 20, className = "text-white" }: { size?: number; className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      className={className}
      style={{ flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="m16 16-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};

// Vertical Separator Component with 15px padding on each side
const VerticalSeparator = () => (
  <div className="px-[15px]">
    <div className="h-16 w-px bg-slate-600"></div>
  </div>
);

// COMPLETELY REWRITTEN Click and Hold Button - BULLETPROOF IMPLEMENTATION
interface ClickAndHoldButtonProps {
  onAction: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  children: React.ReactNode;
}

const ClickAndHoldButton: React.FC<ClickAndHoldButtonProps> = ({
  onAction,
  disabled = false,
  className = '',
  title = '',
  children
}) => {
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef(false);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start the action sequence
  const startAction = useCallback(() => {
    if (disabled) return;
    
    console.log('🚀 Starting action sequence');
    setIsActive(true);
    isMouseDownRef.current = true;
    
    // Immediate first action
    onAction();
    
    // Start continuous action after delay
    timeoutRef.current = setTimeout(() => {
      if (isMouseDownRef.current) {
        console.log('⚡ Starting continuous action');
        intervalRef.current = setInterval(() => {
          if (isMouseDownRef.current) {
            onAction();
          }
        }, 80); // Fast 80ms interval for smooth continuous action
      }
    }, 300); // 300ms delay before continuous action starts
  }, [onAction, disabled]);

  // Stop the action sequence
  const stopAction = useCallback(() => {
    console.log('🛑 Stopping action sequence');
    setIsActive(false);
    isMouseDownRef.current = false;
    clearAllTimers();
  }, [clearAllTimers]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startAction();
  }, [startAction]);

  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startAction();
  }, [startAction]);

  // Global event listeners for mouse/touch up
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      stopAction();
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopAction();
    };

    const handleGlobalMouseLeave = () => {
      stopAction();
    };

    // Add listeners to document and window for maximum coverage
    document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    document.addEventListener('touchend', handleGlobalTouchEnd, { capture: true });
    document.addEventListener('touchcancel', handleGlobalTouchEnd, { capture: true });
    document.addEventListener('mouseleave', handleGlobalMouseLeave, { capture: true });
    window.addEventListener('blur', stopAction);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
      document.removeEventListener('touchend', handleGlobalTouchEnd, { capture: true });
      document.removeEventListener('touchcancel', handleGlobalTouchEnd, { capture: true });
      document.removeEventListener('mouseleave', handleGlobalMouseLeave, { capture: true });
      window.removeEventListener('blur', stopAction);
    };
  }, [isActive, stopAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return (
    <button
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      disabled={disabled}
      className={`${className} ${isActive ? 'bg-blue-500 scale-95' : ''} transition-all duration-75`}
      title={title}
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
    </button>
  );
};

// NEW: Direct Input Control Component with Keyboard Support
interface DirectInputControlProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  label?: string;
}

const DirectInputControl: React.FC<DirectInputControlProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  onIncrease,
  onDecrease,
  disabled = false,
  className = '',
  inputClassName = '',
  label = ''
}) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes (but not when focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Parse and validate the number
    const numValue = parseInt(newValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      if (clampedValue !== value) {
        console.log(`📝 Direct input: ${value} → ${clampedValue}`);
        onChange(clampedValue);
      }
    }
  };

  // Handle input focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select(); // Select all text for easy replacement
  };

  // Handle input blur
  const handleBlur = () => {
    setIsFocused(false);
    // Ensure the displayed value matches the actual value
    setLocalValue(value.toString());
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onIncrease();
      console.log(`⬆️ Keyboard up: ${value} → ${Math.min(max, value + step)}`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onDecrease();
      console.log(`⬇️ Keyboard down: ${value} → ${Math.max(min, value - step)}`);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur(); // Remove focus on Enter
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(value.toString()); // Reset to original value
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex flex-col">
        <ClickAndHoldButton
          onAction={onIncrease}
          disabled={disabled || value >= max}
          className="w-6 h-5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-t transition-colors flex items-center justify-center"
          title={`Increase ${label} (click and hold for rapid adjustment)`}
        >
          <ChevronUp size={12} />
        </ClickAndHoldButton>
        <ClickAndHoldButton
          onAction={onDecrease}
          disabled={disabled || value <= min}
          className="w-6 h-5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-b transition-colors flex items-center justify-center"
          title={`Decrease ${label} (click and hold for rapid adjustment)`}
        >
          <ChevronDown size={12} />
        </ClickAndHoldButton>
      </div>
      
      {/* Direct Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-8 h-10 text-xs text-slate-300 bg-slate-800 border border-slate-600 rounded text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-slate-700 focus:text-white transition-all ${inputClassName}`}
        title={`${label}: ${min}-${max} (type number or use arrow keys)`}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
};

const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FignumLogo />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Fignum Guide</h2>
              <p className="text-blue-600 font-medium">Drag. Drop. Number. Done.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Getting Started */}
          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload size={20} className="text-blue-600" />
              Getting Started
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>1. <strong>Import PDF:</strong> Click "Import PDF" or drag and drop a patent figure PDF</p>
              <p>2. <strong>Choose a tool:</strong> Select from selection, straight line, curved line, or S-curved line tools</p>
              <p>3. <strong>Set line ending:</strong> Choose default ending type (none, dot, or arrow) for new annotations</p>
              <p>4. <strong>Adjust sizing:</strong> Click/hold arrows, type numbers directly, or use keyboard arrow keys</p>
              <p>5. <strong>Create reference callouts:</strong> Click twice on the PDF to draw numbered reference lines</p>
              <p>6. <strong>Export PDF:</strong> Use "Export PDF" to download your annotated document</p>
            </div>
          </section>

          {/* Size Controls */}
          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ChevronUp size={20} className="text-blue-600" />
              Size Controls - Multiple Input Methods
            </h3>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChevronUp size={16} className="text-blue-600" />
                <strong>Three Ways to Adjust Values</strong>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>1. Click & Hold:</strong> Click the up/down arrow buttons for single adjustments, or hold them down for continuous rapid changes.</p>
                <p><strong>2. Direct Typing:</strong> Click on the number field and type a new value directly. Press Enter to confirm or Escape to cancel.</p>
                <p><strong>3. Keyboard Arrows:</strong> Focus the number field and use your keyboard's up/down arrow keys for precise adjustments.</p>
                <p className="mt-3 font-medium">Ranges: Number Size (10-80px) • End Size (10-45px) • Gap (2-50px)</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({
  onFileUpload,
  onSave,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  zoom,
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onClearAll,
  hasFile,
  numberSize,
  onNumberSizeChange,
  endingSize,
  onEndingSizeChange,
  onDeleteSelected,
  hasSelection,
  pageNumberSize,
  onPageNumberSizeChange,
  onBackToDashboard,
  onSaveProject,
  hasAnnotations,
  currentProjectTitle,
  isExistingProject,
  defaultEndType = 'arrow',
  onDefaultEndTypeChange,
  lineGap = 8,
  onLineGapChange
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileUpload(file);
    }
  };

  const handleZoomOut = () => {
    if (zoom > 0.1) {
      onZoomOut();
    }
  };

  // Handle end type change
  const handleEndTypeChange = (endType: 'dot' | 'arrow' | 'none') => {
    if (onDefaultEndTypeChange) {
      onDefaultEndTypeChange(endType);
    }
  };

  // BULLETPROOF Size control handlers with proper bounds checking
  const handleNumberSizeUp = useCallback(() => {
    const newSize = Math.min(80, numberSize + 5);
    if (newSize !== numberSize) {
      console.log(`📈 Number size: ${numberSize} → ${newSize}`);
      onNumberSizeChange(newSize);
    }
  }, [numberSize, onNumberSizeChange]);

  const handleNumberSizeDown = useCallback(() => {
    const newSize = Math.max(10, numberSize - 5);
    if (newSize !== numberSize) {
      console.log(`📉 Number size: ${numberSize} → ${newSize}`);
      onNumberSizeChange(newSize);
    }
  }, [numberSize, onNumberSizeChange]);

  const handleEndingSizeUp = useCallback(() => {
    const newSize = Math.min(45, endingSize + 2);
    if (newSize !== endingSize) {
      console.log(`📈 Ending size: ${endingSize} → ${newSize}`);
      onEndingSizeChange(newSize);
    }
  }, [endingSize, onEndingSizeChange]);

  const handleEndingSizeDown = useCallback(() => {
    const newSize = Math.max(10, endingSize - 2);
    if (newSize !== endingSize) {
      console.log(`📉 Ending size: ${endingSize} → ${newSize}`);
      onEndingSizeChange(newSize);
    }
  }, [endingSize, onEndingSizeChange]);

  const handleLineGapUp = useCallback(() => {
    if (onLineGapChange) {
      const newGap = Math.min(50, lineGap + 2);
      if (newGap !== lineGap) {
        console.log(`📈 Line gap: ${lineGap} → ${newGap}`);
        onLineGapChange(newGap);
      }
    }
  }, [lineGap, onLineGapChange]);

  const handleLineGapDown = useCallback(() => {
    if (onLineGapChange) {
      const newGap = Math.max(2, lineGap - 2);
      if (newGap !== lineGap) {
        console.log(`📉 Line gap: ${lineGap} → ${newGap}`);
        onLineGapChange(newGap);
      }
    }
  }, [lineGap, onLineGapChange]);

  return (
    <>
      <div className="bg-slate-700 text-white px-6 py-3 shadow-lg">
        {/* Labels Row - Updated with Import PDF and Export PDF */}
        <div className="flex items-center text-xs text-slate-300 font-medium mb-3 tracking-wide">
          <div className="w-[72px] text-center">Dashboard</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Save</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Import PDF</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Export PDF</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Select</div>
          <div className="px-[15px]"></div>
          <div className="w-[216px] text-center">Line Shape</div>
          <div className="px-[15px]"></div>
          <div className="w-[216px] text-center">End Shape</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Num. Size</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">End Size</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Gap</div>
          <div className="px-[15px]"></div>
          <div className="w-[144px] text-center">Zoom</div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Undo</div>
          <div className="flex-1"></div>
          <div className="px-[15px]"></div>
          <div className="w-[72px] text-center">Help</div>
        </div>

        {/* Buttons Row with Vertical Separators - Pixel-perfect alignment */}
        <div className="flex items-center">
          {/* Dashboard */}
          <div className="w-[72px] flex justify-center">
            <button
              onClick={onBackToDashboard}
              className="w-12 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors flex items-center justify-center"
              title="Dashboard"
            >
              <Grid3X3 size={20} />
            </button>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Save */}
          <div className="w-[72px] flex justify-center">
            <button
              onClick={onSaveProject}
              className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center"
              title="Save"
            >
              <Check size={20} />
            </button>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Import PDF */}
          <div className="w-[72px] flex justify-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors flex items-center justify-center"
              title="Import PDF"
            >
              <Upload size={20} />
            </label>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Export PDF */}
          <div className="w-[72px] flex justify-center">
            {hasFile && (
              <button
                onClick={onSave}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center"
                title="Export PDF"
              >
                <Download size={20} />
              </button>
            )}
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Select */}
          <div className="w-[72px] flex justify-center">
            <button
              onClick={() => onToolChange('select')}
              className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                tool === 'select' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
              }`}
              title="Select"
            >
              <MousePointer size={20} />
            </button>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Line Shape - Three buttons with exact spacing */}
          <div className="w-[216px] flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToolChange('annotate-straight')}
                className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                  tool === 'annotate-straight' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title="Straight Line"
              >
                <Minus size={20} />
              </button>
              
              <button
                onClick={() => onToolChange('annotate-curved')}
                className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                  tool === 'annotate-curved' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title="Curved Line"
              >
                <CurvedLineIcon size={20} />
              </button>

              <button
                onClick={() => onToolChange('annotate-s-curved')}
                className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                  tool === 'annotate-s-curved' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title="S-Curved Line"
              >
                <SCurveIcon size={20} />
              </button>
            </div>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* End Shape - Three buttons with exact spacing */}
          <div className="w-[216px] flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEndTypeChange('none')}
                className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                  defaultEndType === 'none' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title="No End"
              >
                <X size={20} />
              </button>
              
              <button
                onClick={() => handleEndTypeChange('dot')}
                className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                  defaultEndType === 'dot' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title="Dot End"
              >
                <Circle size={20} />
              </button>
              
              <button
                onClick={() => handleEndTypeChange('arrow')}
                className={`w-12 h-12 rounded-lg transition-colors flex items-center justify-center ${
                  defaultEndType === 'arrow' ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title="Arrow End"
              >
                <ArrowIcon size={20} />
              </button>
            </div>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Number Size with Direct Input Control */}
          <div className="w-[72px] flex justify-center">
            <DirectInputControl
              value={numberSize}
              onChange={onNumberSizeChange}
              min={10}
              max={80}
              step={5}
              onIncrease={handleNumberSizeUp}
              onDecrease={handleNumberSizeDown}
              label="number size"
            />
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* End Size with Direct Input Control */}
          <div className="w-[72px] flex justify-center">
            <DirectInputControl
              value={endingSize}
              onChange={onEndingSizeChange}
              min={10}
              max={45}
              step={2}
              onIncrease={handleEndingSizeUp}
              onDecrease={handleEndingSizeDown}
              label="end size"
            />
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Gap with Direct Input Control */}
          <div className="w-[72px] flex justify-center">
            <DirectInputControl
              value={lineGap}
              onChange={onLineGapChange || (() => {})}
              min={2}
              max={50}
              step={2}
              onIncrease={handleLineGapUp}
              onDecrease={handleLineGapDown}
              label="gap"
            />
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Zoom */}
          <div className="w-[144px] flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.1}
                className="w-10 h-10 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-500 rounded transition-colors flex items-center justify-center"
                title="Zoom Out"
              >
                <Search size={18} />
              </button>
              <span className="text-xs font-medium min-w-[48px] text-center text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={onZoomIn}
                disabled={zoom >= 3.0}
                className="w-10 h-10 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-500 rounded transition-colors flex items-center justify-center"
                title="Zoom In"
              >
                <ZoomInIcon size={18} />
              </button>
            </div>
          </div>

          {/* Vertical Separator */}
          <VerticalSeparator />

          {/* Undo */}
          <div className="w-[72px] flex justify-center">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-12 h-12 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors flex items-center justify-center"
              title="Undo"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Vertical Separator before Help */}
          <VerticalSeparator />

          {/* Help */}
          <div className="w-[72px] flex justify-center">
            <button
              onClick={() => setShowHelp(true)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center"
              title="Help"
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};