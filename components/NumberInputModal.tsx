import React, { useState, useEffect } from 'react';

interface NumberInputModalProps {
  isOpen: boolean;
  onConfirm: (number: number) => void;
  onCancel: () => void;
  suggestedNumber: number;
}

export const NumberInputModal: React.FC<NumberInputModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  suggestedNumber
}) => {
  const [number, setNumber] = useState(suggestedNumber);

  useEffect(() => {
    setNumber(suggestedNumber);
  }, [suggestedNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(number);
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Enter Annotation Number
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Number
            </label>
            <input
              type="number"
              min="1"
              value={number}
              onChange={(e) => setNumber(Math.max(1, parseInt(e.target.value) || 1))}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};