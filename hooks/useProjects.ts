import { useState, useEffect } from 'react';
import { supabase, Database } from '../lib/supabase';
import { Annotation } from '../types/annotation';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!userId || !supabase) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const uploadPDFToStorage = async (file: File, projectId: string): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    if (!supabase) {
      throw new Error('Database not available. Please check your configuration.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;
    return filePath;
  };

  const getPDFFromStorage = async (projectId: string): Promise<File | null> => {
    if (!userId) {
      console.warn('User not authenticated for PDF retrieval');
      return null;
    }
    
    if (!supabase) {
      console.warn('Database not available for PDF retrieval');
      return null;
    }

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return null;

      const fileExt = project.pdf_file_name.split('.').pop();
      const fileName = `${projectId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('pdfs')
        .download(filePath);

      if (error) throw error;

      // Convert blob to File object
      const file = new File([data], project.pdf_file_name, {
        type: 'application/pdf'
      });

      return file;
    } catch (err) {
      console.error('Error downloading PDF:', err);
      return null;
    }
  };

  const createProject = async (
    title: string,
    description: string | null,
    pdfFile: File,
    annotations: Annotation[]
  ) => {
    if (!userId) throw new Error('User not authenticated');
    if (!supabase) throw new Error('Database not available. Please check your configuration.');

    // First create the project record to get an ID
    const projectData: ProjectInsert = {
      user_id: userId,
      title,
      description,
      pdf_file_name: pdfFile.name,
      pdf_file_size: pdfFile.size,
      annotations: JSON.stringify(annotations),
    };

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Upload the PDF file to storage
    try {
      await uploadPDFToStorage(pdfFile, project.id);
    } catch (uploadError) {
      // If upload fails, delete the project record
      await supabase.from('projects').delete().eq('id', project.id);
      throw uploadError;
    }
    
    await fetchProjects(); // Refresh the list
    return project;
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<{
      title: string;
      description: string | null;
      annotations: Annotation[];
      pdfFile?: File;
    }>
  ) => {
    if (!userId) throw new Error('User not authenticated');
    if (!supabase) throw new Error('Database not available. Please check your configuration.');

    // If a new PDF file is provided, upload it
    if (updates.pdfFile) {
      await uploadPDFToStorage(updates.pdfFile, projectId);
    }

    const updateData: ProjectUpdate = {
      title: updates.title,
      description: updates.description,
      annotations: updates.annotations ? JSON.stringify(updates.annotations) : undefined,
      pdf_file_name: updates.pdfFile?.name,
      pdf_file_size: updates.pdfFile?.size,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    await fetchProjects(); // Refresh the list
    return data;
  };

  const deleteProject = async (projectId: string) => {
    if (!userId) throw new Error('User not authenticated');
    if (!supabase) throw new Error('Database not available. Please check your configuration.');

    // Delete the PDF file from storage
    try {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const fileExt = project.pdf_file_name.split('.').pop();
        const fileName = `${projectId}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        
        await supabase.storage
          .from('pdfs')
          .remove([filePath]);
      }
    } catch (err) {
      console.warn('Failed to delete PDF from storage:', err);
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
    
    await fetchProjects(); // Refresh the list
  };

  const getProject = async (projectId: string) => {
    if (!userId) throw new Error('User not authenticated');
    if (!supabase) throw new Error('Database not available. Please check your configuration.');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    getPDFFromStorage,
    refetch: fetchProjects,
  };
};