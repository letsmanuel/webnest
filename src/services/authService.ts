
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export const authService = {
  async signInWithEmail(email: string, password: string) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async signUpWithEmail(email: string, password: string) {
    return await createUserWithEmailAndPassword(auth, email, password);
  },

  async signInWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
  },

  async logout() {
    return await signOut(auth);
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  }
};
