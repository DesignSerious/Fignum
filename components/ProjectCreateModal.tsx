import React, { useState } from 'react';
import { Plus, FileText } from 'lucide-react';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onCreate: (title: string, description: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  isOpen,
  onCreate,
  onCancel,
  loading
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    console.log('📝 Creating project with:', { title: title.trim(), description: description.trim() });
    await onCreate(title.trim(), description.trim());
    
    // Reset form
    setTitle('');
    setDescription('');
  };

  const handleCancel = () => {
    console.log('❌ Canceling project creation');
    setTitle('');
    setDescription('');
    onCancel();
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎯 Project creation modal opened');
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Plus size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Create New Project
            </h3>
            <p className="text-sm text-gray-500">
              Give your project a name and description to get started
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Patent Project"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Optional description of your project"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Next Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
              <li>Create your project with a name and description</li>
              <li>Upload a PDF file to start annotating</li>
              <li>Add numbered line annotations with arrows and dots</li>
              <li>Save your work to continue editing later</li>
            </ol>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};