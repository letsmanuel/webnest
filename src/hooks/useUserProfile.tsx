import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { userService, UserProfile } from '@/services/userService';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralClaimCount, setReferralClaimCount] = useState<number>(0);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setReferralClaimCount(0);
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
      // Fetch referral claim count
      const count = await userService.getReferralClaimCount(user.uid);
      setReferralClaimCount(count);
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
      await loadProfile();
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
    refreshProfile,
    referralClaimCount
  };
};
