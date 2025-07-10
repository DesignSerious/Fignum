import React, { useState, useRef } from 'react';
import { CSVData, CSVReference } from '../types/csv';
import { Upload, Search, X, FileText, Calendar, Hash, FileSpreadsheet, ChevronDown, ChevronRight, AlertTriangle, Check } from 'lucide-react';

interface CSVPanelProps {
  csvData: CSVData | null;
  isLoading: boolean;
  error: string | null;
  onFileUpload: (file: File) => void;
  onClearData: () => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  tool: 'select' | 'annotate-straight' | 'annotate-curved' | 'annotate-s-curved';
  usedReferenceNumbers?: string[]; // NEW: Track which reference numbers have been used
}

export const CSVPanel: React.FC<CSVPanelProps> = ({
  csvData,
  isLoading,
  error,
  onFileUpload,
  onClearData,
  isVisible,
  onToggleVisibility,
  tool,
  usedReferenceNumbers = [] // NEW: Default to empty array
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredReferences = csvData?.references.filter(ref =>
    ref.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
    
    const files = Array.from(e.dataTransfer.files);
    const supportedFile = files.find(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv') ||
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    
    if (supportedFile) {
      onFileUpload(supportedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const createDragPreview = (number: string): HTMLElement => {
    // Create a blue circle with the number
    const dragPreview = document.createElement('div');
    dragPreview.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      width: 32px;
      height: 32px;
      background-color: #2563eb;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      z-index: 9999;
      pointer-events: none;
    `;
    dragPreview.textContent = number;
    
    return dragPreview;
  };

  const handleReferenceDragStart = (e: React.DragEvent, reference: CSVReference) => {
    // PREVENT DRAG if in select mode
    if (tool === 'select') {
      e.preventDefault();
      return;
    }
    
    console.log('Drag started for reference:', reference);
    
    // Set drag data for the browser's native drag-and-drop
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'csv-reference',
      number: reference.number,
      description: reference.description,
      reference: reference
    }));
    
    // Also set global variable for compatibility
    (window as any).csvDragData = {
      type: 'csv-reference',
      number: reference.number,
      description: reference.description,
      reference: reference
    };
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create and set custom drag preview - blue circle with number
    const dragPreview = createDragPreview(reference.number);
    document.body.appendChild(dragPreview);
    
    // Set the custom drag image
    e.dataTransfer.setDragImage(dragPreview, 16, 16); // Center the preview
    
    // Clean up drag preview after a short delay
    setTimeout(() => {
      if (document.body.contains(dragPreview)) {
        document.body.removeChild(dragPreview);
      }
    }, 100);
  };

  const handleReferenceDragEnd = (e: React.DragEvent) => {
    console.log('Drag ended');
    // Clean up global variable after a delay to ensure drop handlers can access it
    setTimeout(() => {
      (window as any).csvDragData = null;
    }, 100);
  };

  // Check if drag is disabled
  const isDragDisabled = tool === 'select';

  // NEW: Check if a reference number has been used
  const isReferenceUsed = (referenceNumber: string): boolean => {
    return usedReferenceNumbers.includes(referenceNumber);
  };

  // NEW: Count used and total references
  const usedCount = csvData ? csvData.references.filter(ref => isReferenceUsed(ref.number)).length : 0;
  const totalCount = csvData ? csvData.references.length : 0;

  if (!isVisible) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleVisibility}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Show Reference Template Panel"
        >
          <ChevronRight size={20} />
        </button>
        <div className="mt-4 -rotate-90 text-xs text-gray-400 whitespace-nowrap">
          References
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Reference Template</h3>
          </div>
          <button
            onClick={onToggleVisibility}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Hide Reference Template Panel"
          >
            <ChevronDown size={16} />
          </button>
        </div>
        
        {csvData && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <FileText size={14} />
                <span className="font-medium">{csvData.filename}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Hash size={12} />
                <span>{totalCount} reference numbers</span>
                {/* NEW: Show usage statistics */}
                {usedCount > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    • {usedCount} used
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClearData}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Clear reference template data"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!csvData ? (
          /* Upload Area */
          <div 
            className={`flex-1 flex flex-col items-center justify-center p-6 transition-all duration-300 ${
              isDragOver ? 'bg-blue-50 border-4 border-dashed border-blue-400' : 'bg-gray-50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragOver 
                ? 'bg-blue-100 border-4 border-dashed border-blue-400 scale-110' 
                : 'bg-gray-200 border-2 border-dashed border-gray-300'
            }`}>
              <Upload 
                size={isDragOver ? 32 : 28} 
                className={`transition-all duration-300 ${
                  isDragOver ? 'text-blue-600' : 'text-gray-400'
                }`} 
              />
            </div>
            
            <h4 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
              isDragOver ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {isDragOver ? 'Drop File Here' : 'Import Reference Template'}
            </h4>
            
            <p className={`text-sm text-center mb-4 transition-colors duration-300 ${
              isDragOver ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {isDragOver 
                ? 'Release to load your reference file' 
                : 'Drag & drop a CSV or Excel file or click to browse'
              }
            </p>
            
            {!isDragOver && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Browse Files
                </button>
                
                <div className="mt-6 text-xs text-gray-400 space-y-1">
                  <div className="font-medium">Supported File Formats:</div>
                  <div>• CSV files (.csv)</div>
                  <div>• Excel files (.xlsx, .xls)</div>
                  <div>• Two columns: Number, Description</div>
                  <div>• Example: 10, Housing assembly</div>
                  <div>• First row can be headers (optional)</div>
                </div>
              </>
            )}
            
            {isLoading && (
              <div className="mt-4 flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Loading reference file...</span>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Reference List */
          <>
            {/* Tool Mode Warning - UPDATED MESSAGE */}
            {isDragDisabled && (
              <div className="p-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle size={16} />
                  <div className="text-sm">
                    <div className="font-medium">Selection Mode Active</div>
                    <div className="text-xs text-amber-600 mt-1">
                      Choose a reference line tool to drag template numbers or create new reference callouts
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reference numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Reference List */}
            <div className="flex-1 overflow-y-auto">
              {filteredReferences.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No reference numbers match your search' : 'No reference numbers found'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredReferences.map((reference) => {
                    const isUsed = isReferenceUsed(reference.number);
                    
                    return (
                      <div
                        key={reference.id}
                        draggable={!isDragDisabled}
                        onDragStart={(e) => handleReferenceDragStart(e, reference)}
                        onDragEnd={handleReferenceDragEnd}
                        className={`p-3 border rounded-lg transition-all duration-200 select-none ${
                          isDragDisabled 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                            : isUsed
                              ? 'bg-green-50 border-green-300 hover:bg-green-100 cursor-grab active:cursor-grabbing'
                              : 'border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-grab active:cursor-grabbing'
                        }`}
                        title={isDragDisabled 
                          ? "Select a reference line tool to enable dragging" 
                          : isUsed
                            ? "This reference has been used in an annotation"
                            : "Drag this reference number to the patent figure to create a callout"
                        }
                      >
                        <div className="flex items-center gap-3">
                          {/* Reference number circle with conditional styling */}
                          <div className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 relative ${
                            isDragDisabled 
                              ? 'bg-gray-400 text-white' 
                              : isUsed
                                ? 'bg-green-600 text-white'
                                : 'bg-black text-white'
                          }`}>
                            {reference.number}
                            {/* NEW: Check mark overlay for used references */}
                            {isUsed && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          
                          {/* Description with conditional styling */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs line-clamp-2 ${
                              isDragDisabled 
                                ? 'text-gray-400' 
                                : isUsed
                                  ? 'text-green-700'
                                  : 'text-gray-600'
                            }`}>
                              {reference.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer Info */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 space-y-1">
                {!isDragDisabled ? (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Drag reference numbers to patent figure for instant placement</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Green items have been used in annotations</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Edit line style in annotation panel</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>Select a reference line tool to enable template dragging</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};