
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { userService, UserProfile } from '@/services/userService';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      let userProfile = await userService.getUserProfile(user.uid);
      
      if (!userProfile) {
        // Create profile if it doesn't exist
        userProfile = await userService.createUserProfile(
          user.uid,
          user.email || '',
          user.displayName || undefined
        );
      }
      
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    
    try {
      await userService.updateUserProfile(user.uid, updates);
      setProfile({ ...profile, ...updates });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const refreshProfile = () => {
    loadProfile();
  };

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile
  };
};
