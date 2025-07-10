import { useLocalStorage, LocalProject, LocalUser, STORAGE_KEYS } from './useLocalStorage';

export const useLocalProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useLocalStorage<LocalProject[]>(STORAGE_KEYS.PROJECTS, []);
  const [loading, setLoading] = useState(false);

  const userProjects = projects.filter(p => p.userId === userId);

  const createProject = async (
    title: string,
    description: string | null,
    pdfFile: File,
    annotations: any[]
  ) => {
    if (!userId) throw new Error('User not authenticated');

    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const newProject: LocalProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      description: description || '',
      fileName: pdfFile.name,
      fileSize: pdfFile.size,
      annotations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects([...projects, newProject]);
    setLoading(false);
    
    return newProject;
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<{
      title: string;
      description: string | null;
      annotations: any[];
    }>
  ) => {
    if (!userId) throw new Error('User not authenticated');

    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const updatedProjects = projects.map(p => 
      p.id === projectId && p.userId === userId
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );

    setProjects(updatedProjects);
    setLoading(false);
    
    return updatedProjects.find(p => p.id === projectId);
  };

  const deleteProject = async (projectId: string) => {
    if (!userId) throw new Error('User not authenticated');

    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const filteredProjects = projects.filter(p => !(p.id === projectId && p.userId === userId));
    setProjects(filteredProjects);
    setLoading(false);
  };

  const getPDFFromStorage = async (projectId: string): Promise<File | null> => {
    // In local storage mode, we can't actually store files
    // Return null to indicate file not available
    return null;
  };

  return {
    projects: userProjects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    getPDFFromStorage,
    refetch: () => {}, // No-op for local storage
  };
};