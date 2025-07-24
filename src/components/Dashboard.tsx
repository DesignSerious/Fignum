import React, { useState } from 'react';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Edit3, 
  Trash2, 
  Search,
  Download,
  User,
  LogOut,
  FolderOpen,
  Target,
  Hash,
  CreditCard
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { Annotation } from '../types/annotation';
import { PDFThumbnail } from './PDFThumbnail';
import { UpgradeModal } from './UpgradeModal';

interface DashboardProps {
  onCreateProject: () => void;
  onEditProject: (projectId: string, annotations: Annotation[]) => void;
}

// Official Fignum logo component with the new brand identity
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
    return (
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
        <span className="text-white font-bold text-lg">F</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {!imageLoaded && (
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center animate-pulse shadow-sm">
          <span className="text-white font-bold text-sm">F</span>
        </div>
      )}
      <img 
        src="/fignum-logo.png"
        alt="Fignum - Patent annotation tool" 
        className={`w-10 h-10 rounded-lg object-cover shadow-sm transition-opacity duration-200 ${
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

export const Dashboard: React.FC<DashboardProps> = ({
  onCreateProject,
  onEditProject
}) => {
  const { user, signOut } = useAuth();
  const { trialInfo, updateSubscriptionStatus } = useUserProfile(user);
  const { projects, loading, deleteProject, getPDFFromStorage } = useProjects(user?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleEditProject = (project: any) => {
    try {
      const annotations = typeof project.annotations === 'string' 
        ? JSON.parse(project.annotations) 
        : project.annotations || [];
      onEditProject(project.id, annotations);
    } catch (error) {
      console.error('Failed to parse project annotations:', error);
      alert('Failed to load project. The project data may be corrupted.');
    }
  };

  const handleCreateNewProject = () => {
    onCreateProject();
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update subscription status to active
      if (updateSubscriptionStatus) {
        await updateSubscriptionStatus('active');
      }
      
      // Show success notification
      const successMsg = document.createElement('div');
      successMsg.textContent = 'Welcome to Fignum Pro! Your subscription is now active.';
      successMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(successMsg);
      setTimeout(() => {
        if (document.body.contains(successMsg)) {
          document.body.removeChild(successMsg);
        }
      }, 3000);
      
      setShowUpgradeModal(false);
    } catch (error) {
      console.error('Upgrade error:', error);
      // Show error notification
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'Failed to process upgrade. Please try again or contact support.';
      errorMsg.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        if (document.body.contains(errorMsg)) {
          document.body.removeChild(errorMsg);
        }
      }, 5000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  // Determine if user is on trial - ALWAYS show upgrade button for trial users
  const isTrialUser = trialInfo && trialInfo.subscription_status === 'trial';
  const isActiveSubscriber = trialInfo && trialInfo.subscription_status === 'active';

  // Debug logging
  console.log('Dashboard render - trialInfo:', trialInfo);
  console.log('Dashboard render - isTrialUser:', isTrialUser);
  console.log('Dashboard render - isActiveSubscriber:', isActiveSubscriber);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with new Fignum branding */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <FignumLogo />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fignum</h1>
                <p className="text-sm text-blue-600 font-medium">Drag. Drop. Number. Done.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* UPGRADE BUTTON - ALWAYS VISIBLE FOR TRIAL USERS */}
              {isTrialUser && (
                <button
                  onClick={handleUpgradeClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <CreditCard size={16} />
                  Upgrade to Pro
                </button>
              )}
              
              <div className="flex items-center gap-2 text-gray-600">
                <User size={16} />
                <span className="text-sm">{user?.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isTrialUser 
                  ? `Welcome to your ${trialInfo.days_remaining}-day free trial!`
                  : isActiveSubscriber
                    ? 'Welcome to Fignum Pro!'
                    : 'Welcome to Fignum!'
                }
              </h3>
              <p className="text-blue-100 mb-4">
                {isTrialUser
                  ? `Create unlimited projects, import reference lists, and export publication-ready PDFs. ${trialInfo.days_remaining} days remaining in your trial.`
                  : isActiveSubscriber
                    ? 'You have full access to all Fignum Pro features. Create unlimited projects and export professional PDFs.'
                    : 'Create unlimited projects, import reference lists, and export publication-ready PDFs - all completely free.'
                }
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Target size={16} />
                  <span>Drag & Drop References</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash size={16} />
                  <span>Professional Leader Lines</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download size={16} />
                  <span>PDF Export</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCreateNewProject}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Create Project
              </button>
              {/* PROMINENT Upgrade Button in Banner for Trial Users */}
              {isTrialUser && (
                <button
                  onClick={handleUpgradeClick}
                  className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <CreditCard size={16} />
                  Upgrade - $19.99/month
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header section with search and new project button */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-8">
          <div className="flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">Your Patent Projects</h2>
            <p className="text-gray-600 text-sm">
              {projects.length === 0 
                ? 'No projects yet. Create your first patent annotation project!' 
                : `${projects.length} project${projects.length !== 1 ? 's' : ''} total`
              }
            </p>
          </div>

          {projects.length > 0 && (
            <div className="flex-1 max-w-md mx-4 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>
          )}
          
          <button
            onClick={handleCreateNewProject}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {projects.length === 0 ? 'No Projects Yet' : 'No Projects Found'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {projects.length === 0 
                ? 'Create your first patent annotation project. Upload your patent figures and start adding professional reference callouts.'
                : 'No projects match your search criteria. Try adjusting your search terms.'
              }
            </p>
            {projects.length === 0 && (
              <button
                onClick={handleCreateNewProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const annotationCount = project.annotations 
                ? (typeof project.annotations === 'string' 
                    ? JSON.parse(project.annotations).length 
                    : project.annotations.length)
                : 0;

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <PDFThumbnail
                          projectId={project.id}
                          fileName={project.pdf_file_name}
                          getPDFFromStorage={getPDFFromStorage}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FileText size={14} />
                        <span className="truncate">{project.pdf_file_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Download size={14} />
                        <span>{formatFileSize(project.pdf_file_size)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Target size={14} />
                        <span>{annotationCount} reference callout{annotationCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} />
                        <span>Updated {formatDate(project.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(project.id)}
                        className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Project
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};