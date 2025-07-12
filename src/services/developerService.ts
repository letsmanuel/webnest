import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  Timestamp,
  increment,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { userService } from './userService';

const DEVELOPER_KEYS_COLLECTION = 'developerKeys';
const API_USAGE_COLLECTION = 'apiUsage';
const TOKENS_PER_BATCH = 1; // 1 token per 5 requests
const REQUESTS_PER_TOKEN = 5;

export const developerService = {
  async getOrCreateKey(userId: string) {
    const keyDocRef = doc(db, DEVELOPER_KEYS_COLLECTION, userId);
    const keyDoc = await getDoc(keyDocRef);
    if (keyDoc.exists()) {
      return keyDoc.data();
    }
    const newKey = uuidv4();
    // Get user's current token balance
    const userTokens = await userService.getTokenBalance(userId);
    const data = {
      userId,
      key: newKey,
      tokens: userTokens,
      usage: 0,
      createdAt: Timestamp.now(),
    };
    await setDoc(keyDocRef, data);
    return data;
  },

  async getKeyDataByKey(key: string) {
    // Query the collection for a document where the 'key' field matches
    const q = query(collection(db, DEVELOPER_KEYS_COLLECTION), where('key', '==', key));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    return null;
  },

  async incrementUsage(userId: string) {
    const keyDocRef = doc(db, DEVELOPER_KEYS_COLLECTION, userId);
    await updateDoc(keyDocRef, {
      usage: increment(1),
    });
  },

  async deductTokenIfNeeded(userId: string) {
    const keyDocRef = doc(db, DEVELOPER_KEYS_COLLECTION, userId);
    const keyDoc = await getDoc(keyDocRef);
    if (!keyDoc.exists()) return false;
    const data = keyDoc.data();
    const newUsage = (data.usage || 0) + 1;
    if (newUsage % REQUESTS_PER_TOKEN === 0) {
      if ((data.tokens || 0) < TOKENS_PER_BATCH) return false;
      await updateDoc(keyDocRef, {
        tokens: increment(-TOKENS_PER_BATCH),
        usage: newUsage,
      });
      return true;
    } else {
      await updateDoc(keyDocRef, {
        usage: newUsage,
      });
      return true;
    }
  },

  async addTokens(userId: string, amount: number) {
    const keyDocRef = doc(db, DEVELOPER_KEYS_COLLECTION, userId);
    await updateDoc(keyDocRef, {
      tokens: increment(amount),
    });
  },
}; 