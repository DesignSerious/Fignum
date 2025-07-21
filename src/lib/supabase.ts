import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co'; // Replace with your URL
const supabaseKey = 'your-anon-public-key'; // Replace with your anon key

export const supabase = createClient(supabaseUrl, supabaseKey);

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