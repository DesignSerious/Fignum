import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://motgsqofedfudslmcwbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdGdzcW9mZWRmdWRzbG1jd2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NjkwMTksImV4cCI6MjA2ODU0NTAxOX0.XOanxCYboeNOaVxcQD4dZ2WYZiYXUyBk5rRyxmHteSM';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdGdzcW9mZWRmdWRzbG1jd2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjk2OTAxOSwiZXhwIjoyMDY4NTQ1MDE5fQ.EroPBb2ukIUHqmJeYx3u9HHs6rfqXL2XAGBqVOjBR9c';

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          pdf_file_name: string;
          pdf_file_size: number;
          annotations: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          pdf_file_name: string;
          pdf_file_size: number;
          annotations: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          pdf_file_name?: string;
          pdf_file_size?: number;
          annotations?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          trial_start_date: string;
          trial_end_date: string;
          subscription_status: string;
          subscription_end_date: string | null;
          created_at: string;
          updated_at: string;
          role?: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          phone_number: string;
          trial_start_date?: string;
          trial_end_date?: string;
          subscription_status?: string;
          subscription_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          phone_number?: string;
          trial_start_date?: string;
          trial_end_date?: string;
          subscription_status?: string;
          subscription_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: string;
        };
      };
    };
  };
};