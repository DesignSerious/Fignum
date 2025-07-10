import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration Check:');
console.log('URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('Anon Key:', supabaseAnonKey ? 'SET' : 'NOT SET');

// Check if we have valid Supabase configuration
const hasValidSupabaseConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseUrl !== 'your_supabase_project_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseAnonKey !== 'your_actual_anon_key_here';

let supabase: any;

if (hasValidSupabaseConfig) {
  // Validate URL format
  try {
    new URL(supabaseUrl);
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.log('✅ Supabase client created successfully');
  } catch (error) {
    console.warn(`❌ Invalid VITE_SUPABASE_URL format: "${supabaseUrl}". Running in demo mode.`);
    supabase = null;
  }
} else {
  console.warn('❌ Supabase configuration not found or incomplete. Running in demo mode.');
  console.warn('Please check your .env file and make sure you have:');
  console.warn('VITE_SUPABASE_URL=your_actual_supabase_url');
  console.warn('VITE_SUPABASE_ANON_KEY=your_actual_anon_key');
  supabase = null;
}

export { supabase };

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