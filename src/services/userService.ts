
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  tokens: number;
  language: 'de' | 'en';
  darkMode: boolean;
  customPaths: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const userService = {
  async createUserProfile(uid: string, email: string, displayName?: string): Promise<UserProfile> {
    const now = new Date();
    const userProfile: UserProfile = {
      uid,
      email,
      displayName,
      tokens: 10, // Start with 10 tokens
      language: 'de',
      darkMode: false,
      customPaths: [],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(doc(db, 'users', uid), {
      ...userProfile,
      createdAt: now,
      updatedAt: now
    });

    return userProfile;
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }
    return null;
  },

  async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async deductTokens(uid: string, amount: number): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    if (!profile || profile.tokens < amount) {
      return false;
    }

    await this.updateUserProfile(uid, {
      tokens: profile.tokens - amount
    });
    return true;
  },

  async addTokens(uid: string, amount: number) {
    const profile = await this.getUserProfile(uid);
    if (profile) {
      await this.updateUserProfile(uid, {
        tokens: profile.tokens + amount
      });
    }
  }
};
