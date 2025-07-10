import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { PDFViewer } from './components/PDFViewer';
import { AnnotationPanel } from './components/AnnotationPanel';
import { CSVPanel } from './components/CSVPanel';
import { NumberInputModal } from './components/NumberInputModal';
import { EndTypeModal } from './components/EndTypeModal';
import { AuthForm } from './components/AuthForm';
import { SignUpForm } from './components/SignUpForm';
import { SignInModal } from './components/SignInModal';
import { Dashboard } from './components/Dashboard';
import { ProjectCreateModal } from './components/ProjectCreateModal';
import { TrialBanner } from './components/TrialBanner';
import { UpgradeModal } from './components/UpgradeModal';
import { DatabaseStatus } from './components/DatabaseStatus';
import { useAnnotations } from './hooks/useAnnotations';
import { useCSVData } from './hooks/useCSVData';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useUserProfile } from './hooks/useUserProfile';
import { savePDFWithAnnotations } from './utils/pdfUtils';
import { PendingAnnotation, Annotation } from './types/annotation';
import { SignUpData } from './types/user';
import { supabase } from './lib/supabase';

type AppMode = 'auth' | 'dashboard' | 'editor';

interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

function App() {
  // Auth state - BACK TO SUPABASE (working solution)
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { profile, trialInfo, loading: profileLoading, createProfile, updateSubscriptionStatus } = useUserProfile(user);
  const { projects, createProject, updateProject, getPDFFromStorage } = useProjects(user?.id);
  
  // App mode state
  const [appMode, setAppMode] = useState<AppMode>('auth');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('');
  const [currentProjectDescription, setCurrentProjectDescription] = useState<string>('');
  const [loadingProject, setLoadingProject] = useState(false);
  
  // Auth form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalLoading, setCreateModalLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Editor state
  const [file, setFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [tool, setTool] = useState<'select' | 'annotate-straight' | 'annotate-curved' | 'annotate-s-curved'>('annotate-s-curved');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [showEndTypeModal, setShowEndTypeModal] = useState(false);
  const [numberSize, setNumberSize] = useState(45);
  const [endingSize, setEndingSize] = useState(28);
  const [csvPanelVisible, setCSVPanelVisible] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  // Default end type state
  const [defaultEndType, setDefaultEndType] = useState<'dot' | 'arrow' | 'none'>('none');
  
  // Line gap state
  const [lineGap, setLineGap] = useState(8);
  
  const [tempAnnotationData, setTempAnnotationData] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    page: number;
    number: number;
    endType?: 'dot' | 'arrow' | 'none';
    isFromCSV?: boolean;
  } | null>(null);

  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
    loadAnnotations,
    undo,
    redo,
    canUndo,
    canRedo
  } = useAnnotations();

  const {
    csvData,
    isLoading: csvLoading,
    error: csvError,
    loadCSVFile,
    clearCSVData
  } = useCSVData();

  // Calculate which reference numbers have been used
  const usedReferenceNumbers = React.useMemo(() => {
    if (!csvData) return [];
    
    // Get all annotation numbers that match CSV reference numbers
    const csvNumbers = csvData.references.map(ref => ref.number);
    const annotationNumbers = annotations.map(ann => ann.number.toString());
    
    return csvNumbers.filter(csvNum => annotationNumbers.includes(csvNum));
  }, [csvData, annotations]);

  // Helper function to check if user has access (trial or paid)
  const hasAccess = () => {
    // If no trial info yet (still loading), allow access to prevent blocking
    if (!trialInfo) return true;
    
    // Check if user has active access (trial or subscription)
    return trialInfo.has_access;
  };

  // Show success notification
  const showSuccessNotification = (message: string) => {
    const successMsg = document.createElement('div');
    successMsg.textContent = message;
    successMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    document.body.appendChild(successMsg);
    setTimeout(() => {
      if (document.body.contains(successMsg)) {
        document.body.removeChild(successMsg);
      }
    }, 3000);
  };

  // Show error notification
  const showErrorNotification = (message: string) => {
    const errorMsg = document.createElement('div');
    errorMsg.textContent = message;
    errorMsg.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    document.body.appendChild(errorMsg);
    setTimeout(() => {
      if (document.body.contains(errorMsg)) {
        document.body.removeChild(errorMsg);
      }
    }, 5000);
  };

  // Set initial app mode based on authentication and trial status
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (user) {
        // User is authenticated - always go to dashboard
        // The dashboard and other components will handle access control based on trial status
        setAppMode('dashboard');
      } else {
        setAppMode('auth');
      }
    }
  }, [user, authLoading, profileLoading]);

  // Auth handlers
  const handleAuthSubmit = async (email: string, password: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setAuthError(error.message);
      } else {
        // Successful auth - go to dashboard
        setAppMode('dashboard');
        setShowSignInModal(false);
        showSuccessNotification(`Welcome back to Fignum!`);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (signUpData: SignUpData) => {
    setAuthSubmitting(true);
    setAuthError(null);
    
    try {
      const { data, error } = await signUp(signUpData);
      
      if (error) {
        // Handle specific case where user tries to sign up with existing email
        if (error.message === 'User already registered') {
          setAuthMode('signin');
          setAuthError('This email is already registered. Please sign in.');
        } else {
          setAuthError(error.message);
        }
      } else if (data.user) {
        // Wait a moment for the auth state to fully settle
        // This timeout might still be useful for Supabase's internal session handling
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          console.log('Creating user profile...');
          // Use the createProfile function from useUserProfile hook
          // This function will now call the secure RPC function
          await createProfile({
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            phone_number: signUpData.phoneNumber
          });
          
          console.log('Profile created successfully');
          setAppMode('dashboard');
          showSuccessNotification(`Welcome to Fignum! Your 7-day free trial has started.`);
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
          setAuthError('Account created but failed to set up profile. Please contact support.');
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleToggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setAuthError(null);
  };

  const handleOpenSignInModal = () => {
    setShowSignInModal(true);
    setAuthError(null);
  };

  const handleCloseSignInModal = () => {
    setShowSignInModal(false);
    setAuthError(null);
  };

  // Upgrade handlers
  const handleUpgrade = async (paymentData: PaymentData) => {
    try {
      // In a real app, this would integrate with Stripe or another payment processor
      // For now, we'll simulate the upgrade process and update the user's subscription status
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update subscription status to active
      if (updateSubscriptionStatus) {
        await updateSubscriptionStatus('active');
      }
      
      showSuccessNotification('Welcome to Fignum Pro! Your subscription is now active.');
      setShowUpgradeModal(false);
    } catch (error) {
      console.error('Upgrade error:', error);
      showErrorNotification('Failed to process upgrade. Please try again or contact support.');
    }
  };

  // Project handlers
  const handleCreateProject = () => {
    // Check access before allowing project creation
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateProjectWithDetails = async (title: string, description: string) => {
    // Check access before creating project
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }

    setCreateModalLoading(true);
    try {
      setAppMode('editor');
      setCurrentProjectId(null);
      setCurrentProjectTitle(title);
      setCurrentProjectDescription(description);
      
      // Reset editor state
      setFile(null);
      clearAllAnnotations();
      setCurrentPage(1);
      setTotalPages(0);
      setPendingAnnotation(null);
      setSelectedAnnotationId(null);
      
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setCreateModalLoading(false);
    }
  };

  const handleEditProject = async (projectId: string, projectAnnotations: Annotation[]) => {
    // Check access before editing project
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }

    setLoadingProject(true);
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        alert('Project not found.');
        return;
      }

      const pdfFile = await getPDFFromStorage(projectId);
      
      if (!pdfFile) {
        alert('Could not load the PDF file for this project.');
        return;
      }

      setAppMode('editor');
      setCurrentProjectId(projectId);
      setCurrentProjectTitle(project.title);
      setCurrentProjectDescription(project.description || '');
      
      setFile(pdfFile);
      loadAnnotations(projectAnnotations);
      
      setCurrentPage(1);
      setPendingAnnotation(null);
      setSelectedAnnotationId(null);
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project. Please try again.');
    } finally {
      setLoadingProject(false);
    }
  };

  const handleBackToDashboard = () => {
    setAppMode('dashboard');
    setCurrentProjectId(null);
    setCurrentProjectTitle('');
    setCurrentProjectDescription('');
    // Reset editor state
    setFile(null);
    clearAllAnnotations();
    setCurrentPage(1);
    setTotalPages(0);
    setPendingAnnotation(null);
    setSelectedAnnotationId(null);
  };

  // Save handlers
  const handleDirectSaveNewProject = async () => {
    if (!file) {
      alert('Please upload a PDF file first.');
      return;
    }

    if (!currentProjectTitle.trim()) {
      alert('Project title is required. Please create a project first.');
      return;
    }

    // Check access before saving
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }

    // Check if Supabase is available
    if (!supabase) {
      showErrorNotification('Database not available. Please check your configuration or try again later.');
      return;
    }

    try {
      const currentAnnotations = [...annotations];
      
      const newProject = await createProject(
        currentProjectTitle,
        currentProjectDescription || null,
        file,
        currentAnnotations
      );
      
      setCurrentProjectId(newProject.id);
      showSuccessNotification('Project saved successfully!');
    } catch (error) {
      console.error('Failed to save project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project. Please try again.';
      showErrorNotification(errorMessage);
    }
  };

  const handleQuickSave = async () => {
    if (!currentProjectId || !file) {
      alert('Cannot save: No project loaded.');
      return;
    }

    // Check access before saving
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }

    // Check if Supabase is available
    if (!supabase) {
      showErrorNotification('Database not available. Please check your configuration or try again later.');
      return;
    }

    try {
      const currentAnnotations = [...annotations];
      
      await updateProject(currentProjectId, {
        title: currentProjectTitle,
        description: currentProjectDescription || null,
        annotations: currentAnnotations
      });
      
      showSuccessNotification('Project updated successfully!');
    } catch (error) {
      console.error('Failed to save project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project. Please try again.';
      showErrorNotification(errorMessage);
    }
  };

  const handleSaveButtonClick = () => {
    if (!file) {
      alert('Please upload a PDF file first.');
      return;
    }

    if (currentProjectId) {
      handleQuickSave();
    } else {
      handleDirectSaveNewProject();
    }
  };

  // Editor handlers
  const handleFileUpload = (uploadedFile: File) => {
    // Check access before allowing file upload
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }

    setFile(uploadedFile);
    clearAllAnnotations();
    setCurrentPage(1);
    setTotalPages(0);
    setPendingAnnotation(null);
    setSelectedAnnotationId(null);
  };

  const handleSave = async () => {
    if (!file) {
      alert('Please upload a PDF file first.');
      return;
    }

    // Check access before exporting
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }
    
    try {
      const annotatedPDF = await savePDFWithAnnotations(file, annotations, numberSize, endingSize, lineGap);
      const url = URL.createObjectURL(annotatedPDF);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotated_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('Error saving PDF. Please try again.');
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.1));
  };

  const handleStartAnnotation = (x: number, y: number, page: number) => {
    if (tool === 'select') return;
    
    // Check access before creating annotations
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }
    
    setPendingAnnotation({
      startX: x,
      startY: y,
      number: 0,
      lineType: 'straight',
      page
    });
  };

  const handleCompleteAnnotation = (endX: number, endY: number) => {
    if (endX < 0 || endY < 0) {
      setPendingAnnotation(null);
      setTempAnnotationData(null);
      setShowEndTypeModal(false);
      setShowNumberModal(false);
      return;
    }

    if (pendingAnnotation) {
      const isFromCSV = pendingAnnotation.number > 0;
      
      // Use default end type instead of showing modal
      if (isFromCSV) {
        const lineType = tool === 'annotate-straight' ? 'straight' : 
                        tool === 'annotate-curved' ? 'curved' : 's-curved';
        
        addAnnotation({
          startX: pendingAnnotation.startX,
          startY: pendingAnnotation.startY,
          endX,
          endY,
          number: pendingAnnotation.number,
          endType: defaultEndType,
          lineType: lineType,
          page: pendingAnnotation.page,
          curvature: 50
        });
        
        setPendingAnnotation(null);
        setTempAnnotationData(null);
      } else {
        const nextNumber = Math.max(0, ...annotations.map(a => a.number)) + 1;
        
        // Skip end type modal and use default
        const lineType = tool === 'annotate-straight' ? 'straight' : 
                        tool === 'annotate-curved' ? 'curved' : 's-curved';
        
        addAnnotation({
          startX: pendingAnnotation.startX,
          startY: pendingAnnotation.startY,
          endX,
          endY,
          number: nextNumber,
          endType: defaultEndType,
          lineType: lineType,
          page: pendingAnnotation.page,
          curvature: 50
        });
        
        setPendingAnnotation(null);
        setTempAnnotationData(null);
      }
    }
  };

  const handleEndTypeSelect = (endType: 'dot' | 'arrow' | 'none') => {
    if (tempAnnotationData) {
      setTempAnnotationData({
        ...tempAnnotationData,
        endType
      });
      setShowEndTypeModal(false);
      
      if (tempAnnotationData.isFromCSV) {
        const lineType = tool === 'annotate-straight' ? 'straight' : 
                        tool === 'annotate-curved' ? 'curved' : 's-curved';
        
        addAnnotation({
          startX: tempAnnotationData.startX,
          startY: tempAnnotationData.startY,
          endX: tempAnnotationData.endX,
          endY: tempAnnotationData.endY,
          number: tempAnnotationData.number,
          endType: endType,
          lineType: lineType,
          page: tempAnnotationData.page,
          curvature: 50
        });
        
        setPendingAnnotation(null);
        setTempAnnotationData(null);
      } else {
        const nextNumber = Math.max(0, ...annotations.map(a => a.number)) + 1;
        setTempAnnotationData(prev => prev ? { ...prev, number: nextNumber } : null);
        setShowNumberModal(true);
      }
    }
  };

  const handleEndTypeCancel = () => {
    setShowEndTypeModal(false);
    setPendingAnnotation(null);
    setTempAnnotationData(null);
  };

  const handleNumberConfirm = (number: number) => {
    if (tempAnnotationData && tempAnnotationData.endType) {
      const lineType = tool === 'annotate-straight' ? 'straight' : 
                      tool === 'annotate-curved' ? 'curved' : 's-curved';
      
      addAnnotation({
        startX: tempAnnotationData.startX,
        startY: tempAnnotationData.startY,
        endX: tempAnnotationData.endX,
        endY: tempAnnotationData.endY,
        number: number,
        endType: tempAnnotationData.endType,
        lineType: lineType,
        page: tempAnnotationData.page,
        curvature: 50
      });
      
      setPendingAnnotation(null);
      setTempAnnotationData(null);
    }
    setShowNumberModal(false);
  };

  const handleNumberCancel = () => {
    setShowNumberModal(false);
    setPendingAnnotation(null);
    setTempAnnotationData(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedAnnotationId(null);
  };

  const handleTotalPagesUpdate = (total: number) => {
    setTotalPages(total);
  };

  const handleDuplicateAnnotation = (annotation: Annotation, targetPage: number) => {
    const targetPageAnnotations = annotations.filter(ann => ann.page === targetPage);
    const nextNumber = targetPageAnnotations.length > 0 
      ? Math.max(...targetPageAnnotations.map(a => a.number)) + 1 
      : 1;

    const duplicatedAnnotation: Omit<Annotation, 'id'> = {
      startX: annotation.startX,
      startY: annotation.startY,
      endX: annotation.endX,
      endY: annotation.endY,
      number: nextNumber,
      endType: annotation.endType,
      lineType: annotation.lineType,
      page: targetPage,
      curvature: annotation.curvature,
      curveFlipped: annotation.curveFlipped
    };

    addAnnotation(duplicatedAnnotation);
  };

  const handleCSVNumberDrop = (number: string, x: number, y: number, page: number) => {
    // Check access before creating annotations
    if (!hasAccess()) {
      setShowUpgradeModal(true);
      return;
    }

    const parsedNumber = parseInt(number);
    if (isNaN(parsedNumber)) {
      return;
    }

    setPendingAnnotation({
      startX: x,
      startY: y,
      number: parsedNumber,
      lineType: 'straight',
      page
    });
    
    setTempAnnotationData(null);
    setShowNumberModal(false);
    setShowEndTypeModal(false);
  };

  const handleAnnotationSelect = (annotationId: string | null) => {
    setSelectedAnnotationId(annotationId);
  };

  const handleDeleteSelected = () => {
    if (selectedAnnotationId) {
      deleteAnnotation(selectedAnnotationId);
      setSelectedAnnotationId(null);
    }
  };

  // Handle default end type change
  const handleDefaultEndTypeChange = (endType: 'dot' | 'arrow' | 'none') => {
    setDefaultEndType(endType);
  };

  // Handle line gap change
  const handleLineGapChange = (gap: number) => {
    setLineGap(gap);
  };

  // Show loading screen while checking auth
  if (authLoading || profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading screen while loading project
  if (loadingProject) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  // Route based on app mode
  switch (appMode) {
    case 'auth':
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Database Status at the top */}
          <div className="p-4">
            <DatabaseStatus />
          </div>
          
          <div className="flex items-center justify-center p-4">
            {authMode === 'signup' ? (
              <SignUpForm
                onSubmit={handleSignUpSubmit}
                onToggleMode={handleToggleAuthMode}
                loading={authSubmitting}
                error={authError}
                onBackToLanding={() => {}} // No longer needed
              />
            ) : (
              <AuthForm
                mode={authMode}
                onSubmit={handleAuthSubmit}
                onToggleMode={handleToggleAuthMode}
                loading={authSubmitting}
                error={authError}
                onBackToLanding={() => {}} // No longer needed
              />
            )}
          </div>
          
          <SignInModal
            isOpen={showSignInModal}
            onClose={handleCloseSignInModal}
            onSubmit={handleAuthSubmit}
            onToggleMode={handleToggleAuthMode}
            loading={authSubmitting}
            error={authError}
            mode={authMode}
          />
        </div>
      );

    case 'dashboard':
      return (
        <>
          {/* Trial Banner */}
          {trialInfo && (
            <TrialBanner
              trialInfo={trialInfo}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          )}
          
          <Dashboard
            onCreateProject={handleCreateProject}
            onEditProject={handleEditProject}
          />
          
          <ProjectCreateModal
            isOpen={showCreateModal}
            onCreate={handleCreateProjectWithDetails}
            onCancel={() => setShowCreateModal(false)}
            loading={createModalLoading}
          />

          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={handleUpgrade}
          />
        </>
      );

    case 'editor':
      return (
        <div className="h-screen flex flex-col bg-gray-100">
          {/* Trial Banner */}
          {trialInfo && (
            <TrialBanner
              trialInfo={trialInfo}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          )}

          <Toolbar
            onFileUpload={handleFileUpload}
            onSave={handleSave}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onUndo={undo}
            onRedo={redo}
            zoom={zoom}
            tool={tool}
            onToolChange={setTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onClearAll={clearAllAnnotations}
            hasFile={!!file}
            numberSize={numberSize}
            onNumberSizeChange={setNumberSize}
            endingSize={endingSize}
            onEndingSizeChange={setEndingSize}
            onDeleteSelected={handleDeleteSelected}
            hasSelection={!!selectedAnnotationId}
            pageNumberSize={60}
            onPageNumberSizeChange={() => {}}
            onBackToDashboard={handleBackToDashboard}
            onSaveProject={handleSaveButtonClick}
            hasAnnotations={annotations.length > 0}
            currentProjectTitle={currentProjectTitle}
            isExistingProject={!!currentProjectId}
            defaultEndType={defaultEndType}
            onDefaultEndTypeChange={handleDefaultEndTypeChange}
            lineGap={lineGap}
            onLineGapChange={handleLineGapChange}
          />
          
          <div className="flex-1 flex overflow-hidden">
            <CSVPanel
              csvData={csvData}
              isLoading={csvLoading}
              error={csvError}
              onFileUpload={loadCSVFile}
              onClearData={clearCSVData}
              isVisible={csvPanelVisible}
              onToggleVisibility={() => setCSVPanelVisible(!csvPanelVisible)}
              tool={tool}
              usedReferenceNumbers={usedReferenceNumbers}
            />

            <PDFViewer
              file={file}
              annotations={annotations}
              pendingAnnotation={pendingAnnotation}
              selectedAnnotationId={selectedAnnotationId}
              onAddAnnotation={addAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onDeleteAnnotation={deleteAnnotation}
              onSelectAnnotation={handleAnnotationSelect}
              onStartAnnotation={handleStartAnnotation}
              onCompleteAnnotation={handleCompleteAnnotation}
              zoom={zoom}
              setZoom={setZoom}
              tool={tool}
              numberSize={numberSize}
              endingSize={endingSize}
              pageNumberSize={60}
              onFileUpload={handleFileUpload}
              onPageChange={handlePageChange}
              onTotalPagesUpdate={handleTotalPagesUpdate}
              onCSVNumberDrop={handleCSVNumberDrop}
              lineGap={lineGap}
            />
            
            {file && (
              <AnnotationPanel
                annotations={annotations}
                selectedAnnotationId={selectedAnnotationId}
                onUpdateAnnotation={updateAnnotation}
                onDeleteAnnotation={deleteAnnotation}
                onSelectAnnotation={handleAnnotationSelect}
                onDuplicateAnnotation={handleDuplicateAnnotation}
                currentPage={currentPage}
                totalPages={totalPages}
                numberSize={numberSize}
                endingSize={endingSize}
              />
            )}
          </div>

          <EndTypeModal
            isOpen={showEndTypeModal}
            onSelect={handleEndTypeSelect}
            onCancel={handleEndTypeCancel}
          />

          <NumberInputModal
            isOpen={showNumberModal}
            onConfirm={handleNumberConfirm}
            onCancel={handleNumberCancel}
            suggestedNumber={tempAnnotationData?.number || 1}
          />

          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={handleUpgrade}
          />
        </div>
      );

    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Database Status at the top */}
          <div className="p-4">
            <DatabaseStatus />
          </div>
          
          <div className="flex items-center justify-center p-4">
            {authMode === 'signup' ? (
              <SignUpForm
                onSubmit={handleSignUpSubmit}
                onToggleMode={handleToggleAuthMode}
                loading={authSubmitting}
                error={authError}
                onBackToLanding={() => {}} // No longer needed
              />
            ) : (
              <AuthForm
                mode={authMode}
                onSubmit={handleAuthSubmit}
                onToggleMode={handleToggleAuthMode}
                loading={authSubmitting}
                error={authError}
                onBackToLanding={() => {}} // No longer needed
              />
            )}
          </div>
          
          <SignInModal
            isOpen={showSignInModal}
            onClose={handleCloseSignInModal}
            onSubmit={handleAuthSubmit}
            onToggleMode={handleToggleAuthMode}
            loading={authSubmitting}
            error={authError}
            mode={authMode}
          />
        </div>
      );
  }
}

export default App;