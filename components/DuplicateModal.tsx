import React, { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';

interface DuplicateModalProps {
  isOpen: boolean;
  onConfirm: (targetPage: number) => void;
  onCancel: () => void;
  currentPage: number;
  totalPages: number;
  annotationNumber: number;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  currentPage,
  totalPages,
  annotationNumber
}) => {
  const [targetPage, setTargetPage] = useState(currentPage === 1 ? 2 : 1);

  useEffect(() => {
    // Set default target page to a different page than current
    if (isOpen) {
      setTargetPage(currentPage === 1 ? Math.min(2, totalPages) : 1);
    }
  }, [isOpen, currentPage, totalPages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(targetPage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Copy size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Duplicate Annotation
            </h3>
            <p className="text-sm text-gray-500">
              Copy annotation #{annotationNumber} to another page
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Target Page
            </label>
            <select
              value={targetPage}
              onChange={(e) => setTargetPage(parseInt(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page !== currentPage)
                .map(page => (
                  <option key={page} value={page}>
                    Page {page}
                  </option>
                ))}
            </select>
            {totalPages === 1 && (
              <p className="text-xs text-amber-600 mt-1">
                Only one page available. Upload a multi-page PDF to duplicate to other pages.
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> The duplicated annotation will appear in the same position on the target page. 
              You can move it after duplication if needed.
            </p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalPages === 1}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Copy size={16} />
              Duplicate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};