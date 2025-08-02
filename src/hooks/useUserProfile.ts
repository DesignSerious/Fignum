import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, TrialInfo } from '../types/user';

export const useUserProfile = (user: User | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user || !supabase) {
      setProfile(null);
      setTrialInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      // Fetch trial info using the database function
      if (profileData) {
        const { data: trialData, error: trialError } = await supabase
          .rpc('get_user_trial_info', { user_id: user.id });

        if (trialError) {
          throw trialError;
        }

        setTrialInfo(trialData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const createProfile = async (
    profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'trial_start_date' | 'trial_end_date' | 'subscription_status'>
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (!supabase) {
      throw new Error('Database not available');
    }

    try {
      // Use the secure RPC function to create the profile
      const { data, error } = await supabase
        .rpc('create_user_profile_secure', {
          p_first_name: profileData.first_name,
          p_last_name: profileData.last_name,
          p_phone_number: profileData.phone_number
        });

      if (error) {
        console.error('Profile creation error:', error);
        throw error;
      }

      console.log('Profile created successfully:', data);
      await fetchProfile(); // Refresh profile and trial info
      return data;
    } catch (error) {
      console.error('Profile creation error:', error);
      throw error;
    }
  };

  const updateSubscriptionStatus = async (status: 'active' | 'expired' | 'cancelled', endDate?: string) => {
    if (!user || !supabase) {
      throw new Error('User not authenticated or database not available');
    }

    const updateData: any = {
      subscription_status: status,
      updated_at: new Date().toISOString()
    };

    if (endDate) {
      updateData.subscription_end_date = endDate;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) throw error;

    await fetchProfile(); // Refresh profile and trial info
  };

  return {
    profile,
    trialInfo,
    loading,
    error,
    createProfile,
    updateSubscriptionStatus,
    refetch: fetchProfile
  };
};