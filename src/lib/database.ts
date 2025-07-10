import { connect } from '@planetscale/database';

// PlanetScale connection
const config = {
  host: import.meta.env.VITE_DATABASE_HOST,
  username: import.meta.env.VITE_DATABASE_USERNAME,
  password: import.meta.env.VITE_DATABASE_PASSWORD,
};

let connection: any = null;

export const getConnection = () => {
  if (!connection) {
    if (!config.host || !config.username || !config.password) {
      console.warn('Database not configured. Running in demo mode.');
      return null;
    }
    
    try {
      connection = connect(config);
      console.log('✅ Connected to PlanetScale database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      return null;
    }
  }
  
  return connection;
};

// Database types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  trial_start_date: string;
  trial_end_date: string;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  pdf_file_name: string;
  pdf_file_size: number;
  annotations: string; // JSON string
  created_at: string;
  updated_at: string;
}

// Helper function to execute queries safely
export const executeQuery = async (query: string, params: any[] = []) => {
  const conn = getConnection();
  if (!conn) {
    throw new Error('Database not available');
  }
  
  try {
    const result = await conn.execute(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// User operations
export const createUser = async (userData: {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}): Promise<User> => {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const query = `
    INSERT INTO users (
      id, email, password_hash, first_name, last_name, phone_number,
      trial_start_date, trial_end_date, subscription_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?)
  `;
  
  await executeQuery(query, [
    id, userData.email, userData.password_hash, userData.first_name,
    userData.last_name, userData.phone_number, now, trialEndDate, now, now
  ]);
  
  return getUserById(id);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE email = ?';
  const result = await executeQuery(query, [email]);
  return result.rows[0] || null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE id = ?';
  const result = await executeQuery(query, [id]);
  return result.rows[0] || null;
};

export const getAllUsers = async (): Promise<User[]> => {
  const query = `
    SELECT u.*, 
           COALESCE(p.project_count, 0) as project_count,
           GREATEST(0, DATEDIFF(u.trial_end_date, NOW())) as days_remaining
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) as project_count
      FROM projects
      GROUP BY user_id
    ) p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `;
  const result = await executeQuery(query);
  return result.rows;
};

export const updateUserSubscription = async (
  userId: string, 
  status: string, 
  endDate?: string
): Promise<void> => {
  const query = `
    UPDATE users 
    SET subscription_status = ?, subscription_end_date = ?, updated_at = NOW()
    WHERE id = ?
  `;
  await executeQuery(query, [status, endDate, userId]);
};

// Project operations
export const createProject = async (projectData: {
  user_id: string;
  title: string;
  description?: string;
  pdf_file_name: string;
  pdf_file_size: number;
  annotations: any[];
}): Promise<Project> => {
  const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const query = `
    INSERT INTO projects (
      id, user_id, title, description, pdf_file_name, pdf_file_size,
      annotations, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(query, [
    id, projectData.user_id, projectData.title, projectData.description || null,
    projectData.pdf_file_name, projectData.pdf_file_size,
    JSON.stringify(projectData.annotations), now, now
  ]);
  
  return getProjectById(id);
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  const query = 'SELECT * FROM projects WHERE id = ?';
  const result = await executeQuery(query, [id]);
  return result.rows[0] || null;
};

export const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
  const query = 'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC';
  const result = await executeQuery(query, [userId]);
  return result.rows;
};

export const updateProject = async (
  projectId: string,
  updates: Partial<{
    title: string;
    description: string;
    annotations: any[];
  }>
): Promise<void> => {
  const fields = [];
  const values = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  
  if (updates.annotations !== undefined) {
    fields.push('annotations = ?');
    values.push(JSON.stringify(updates.annotations));
  }
  
  fields.push('updated_at = NOW()');
  values.push(projectId);
  
  const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
  await executeQuery(query, values);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const query = 'DELETE FROM projects WHERE id = ?';
  await executeQuery(query, [projectId]);
};

// Database initialization
export const initializeDatabase = async () => {
  const conn = getConnection();
  if (!conn) {
    console.log('Database not configured - skipping initialization');
    return;
  }
  
  try {
    // Create users table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        trial_start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        trial_end_date DATETIME NOT NULL,
        subscription_status ENUM('trial', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'trial',
        subscription_end_date DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_subscription_status (subscription_status),
        INDEX idx_trial_end_date (trial_end_date)
      )
    `);
    
    // Create projects table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NULL,
        pdf_file_name VARCHAR(500) NOT NULL,
        pdf_file_size BIGINT NOT NULL,
        annotations JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_updated_at (updated_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};