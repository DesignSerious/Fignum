import { useState, useEffect } from 'react';
import { 
  createProject as dbCreateProject,
  getProjectsByUserId,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  getProjectById
} from '../lib/database';
import { Annotation } from '../types/annotation';

interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  pdf_file_name: string;
  pdf_file_size: number;
  annotations: string;
  created_at: string;
  updated_at: string;
}

export const usePlanetScaleProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userProjects = await getProjectsByUserId(userId);
      setProjects(userProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const createProject = async (
    title: string,
    description: string | null,
    pdfFile: File,
    annotations: Annotation[]
  ) => {
    if (!userId) throw new Error('User not authenticated');

    const newProject = await dbCreateProject({
      user_id: userId,
      title,
      description: description || undefined,
      pdf_file_name: pdfFile.name,
      pdf_file_size: pdfFile.size,
      annotations
    });
    
    await fetchProjects(); // Refresh the list
    return newProject;
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<{
      title: string;
      description: string | null;
      annotations: Annotation[];
    }>
  ) => {
    if (!userId) throw new Error('User not authenticated');

    await dbUpdateProject(projectId, updates);
    await fetchProjects(); // Refresh the list
    
    return getProjectById(projectId);
  };

  const deleteProject = async (projectId: string) => {
    if (!userId) throw new Error('User not authenticated');

    await dbDeleteProject(projectId);
    await fetchProjects(); // Refresh the list
  };

  const getPDFFromStorage = async (projectId: string): Promise<File | null> => {
    // In this implementation, we can't store actual files
    // Return null to indicate file not available
    return null;
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getPDFFromStorage,
    refetch: fetchProjects,
  };
};