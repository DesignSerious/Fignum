import React from 'react';
import { Circle, ArrowRight, Minus } from 'lucide-react';

interface EndTypeModalProps {
  isOpen: boolean;
  onSelect: (endType: 'dot' | 'arrow' | 'none') => void;
  onCancel: () => void;
}

export const EndTypeModal: React.FC<EndTypeModalProps> = ({
  isOpen,
  onSelect,
  onCancel
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4" onKeyDown={handleKeyDown}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Choose Line End Type
        </h3>
        
        <div className="space-y-3">
          <button
            onClick={() => onSelect('arrow')}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <ArrowRight size={20} className="text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-800">Arrow</div>
              <div className="text-sm text-gray-500">Line ends with an arrow pointer</div>
            </div>
          </button>
          
          <button
            onClick={() => onSelect('dot')}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <Circle size={20} className="text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-800">Dot</div>
              <div className="text-sm text-gray-500">Line ends with a simple dot</div>
            </div>
          </button>

          <button
            onClick={() => onSelect('none')}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <Minus size={20} className="text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-800">Nothing</div>
              <div className="text-sm text-gray-500">Line ends with no marker</div>
            </div>
          </button>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};