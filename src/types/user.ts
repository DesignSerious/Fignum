export interface UserProfile {
  id: string;
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

export interface TrialInfo {
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_start_date: string;
  trial_end_date: string;
  days_remaining: number;
  has_access: boolean;
  subscription_end_date?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}