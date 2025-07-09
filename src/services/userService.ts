import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  serverTimestamp
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
  totalTokensEarned: number;
  totalTokensSpent: number;
  createdAt: Date;
  updatedAt: Date;
  hasUsedFreeCollabTrial?: boolean; // Added for free collab trial
}

export interface TokenTransaction {
  id?: string;
  userId: string;
  type: 'earned' | 'spent' | 'refunded';
  amount: number;
  reason: string;
  websiteId?: string;
  sessionId?: string;
  createdAt: Date;
}

export const userService = {
  async createUserProfile(uid: string, email: string, displayName?: string): Promise<UserProfile> {
    const now = new Date();
    const userProfile: UserProfile = {
      uid,
      email,
      ...(displayName ? { displayName } : {}),
      tokens: 15, // Start with 15 tokens (increased from 10)
      language: 'de',
      darkMode: false,
      customPaths: [],
      totalTokensEarned: 15,
      totalTokensSpent: 0,
      createdAt: now,
      updatedAt: now,
      hasUsedFreeCollabTrial: false // Default to false
    };

    // Remove undefined fields before sending to Firestore
    const cleanProfile = Object.fromEntries(Object.entries(userProfile).filter(([_, v]) => v !== undefined));

    await setDoc(doc(db, 'users', uid), {
      ...cleanProfile,
      createdAt: now,
      updatedAt: now
    });

    // Log initial token grant
    await this.logTokenTransaction(uid, {
      type: 'earned',
      amount: 15,
      reason: 'Initial account creation bonus'
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
        hasUsedFreeCollabTrial: data.hasUsedFreeCollabTrial ?? false // Ensure default
      } as UserProfile;
    }
    return null;
  },

  async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    const docRef = doc(db, 'users', uid);
    // Remove undefined fields before sending to Firestore
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await updateDoc(docRef, {
      ...cleanUpdates,
      updatedAt: new Date()
    });
  },

  async deductTokens(uid: string, amount: number, reason: string, websiteId?: string, sessionId?: string): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    if (!profile || profile.tokens < amount) {
      return false;
    }

    await this.updateUserProfile(uid, {
      tokens: profile.tokens - amount,
      totalTokensSpent: profile.totalTokensSpent + amount
    });

    // Log the transaction
    await this.logTokenTransaction(uid, {
      type: 'spent',
      amount,
      reason,
      websiteId,
      sessionId
    });

    return true;
  },

  async addTokens(userId: string, amount: number, reason: string) {
    const userRef = doc(db, 'users', userId);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentTokens = userDoc.exists() ? (userDoc.data()?.tokens || 0) : 0;
      transaction.update(userRef, { tokens: currentTokens + amount });
    });
    
    // Add transaction record
    await addDoc(collection(db, 'tokenTransactions'), {
      userId,
      amount,
      type: 'earned',
      reason,
      createdAt: serverTimestamp(),
    });
  },

  // Log token transactions for analytics
  async logTokenTransaction(uid: string, transaction: Omit<TokenTransaction, 'id' | 'userId' | 'createdAt'>) {
    const tokenTransaction: Omit<TokenTransaction, 'id'> = {
      userId: uid,
      ...transaction,
      createdAt: new Date()
    };

    // Filter out undefined values to prevent Firebase errors
    const cleanTransaction = Object.fromEntries(
      Object.entries(tokenTransaction).filter(([_, value]) => value !== undefined)
    );

    await addDoc(collection(db, 'token_transactions'), {
      ...cleanTransaction,
      createdAt: Timestamp.fromDate(tokenTransaction.createdAt)
    });
  },

  // Get user's token transaction history
  async getTokenHistory(uid: string, limit: number = 50): Promise<TokenTransaction[]> {
    try {
      const q = query(
        collection(db, 'token_transactions'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const allTransactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as TokenTransaction;
      });
      
      // Apply limit manually
      return allTransactions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching token history:', error);
      return [];
    }
  },

  // Updated token cost constants
  TOKEN_COSTS: {
    WEBSITE_CREATION: 3,        // Increased from 2
    CUSTOM_PATH: 8,             // Increased from 5
    COLLABORATION_BASE: 25,     // Increased from 20
    COLLABORATION_PER_PARTICIPANT: 15, // Increased from 10
    PREMIUM_TEMPLATE: 5,        // New: premium templates cost extra
    DOMAIN_CONNECTION: 12,      // New: connecting custom domain
    ADVANCED_FEATURES: 10       // New: advanced features like analytics
  },

  // Calculate collaboration session cost
  calculateCollaborationCost(maxParticipants: number): number {
    if (maxParticipants <= 2) return 20;
    if (maxParticipants === 3) return 30;
    if (maxParticipants === 4) return 40;
    if (maxParticipants === 5) return 50;
    if (maxParticipants > 5) return 50 + (maxParticipants - 5) * 5;
    return 20;
  },

  // Improved website deletion refund calculation
  calculateWebsiteRefund(hasCustomPath: boolean, websiteAgeHours: number = 0): number {
    let refundAmount = 0;
    
    // Base website creation refund (diminishes over time)
    const baseRefund = this.TOKEN_COSTS.WEBSITE_CREATION;
    if (websiteAgeHours < 24) {
      // Full refund if deleted within 24 hours
      refundAmount += baseRefund;
    } else if (websiteAgeHours < 168) { // 7 days
      // 50% refund if deleted within a week
      refundAmount += Math.floor(baseRefund * 0.5);
    } else if (websiteAgeHours < 720) { // 30 days
      // 25% refund if deleted within a month
      refundAmount += Math.floor(baseRefund * 0.25);
    }
    // No refund after 30 days
    
    // Custom path refund (higher refund rate for unused paths)
    if (hasCustomPath) {
      const customPathRefund = this.TOKEN_COSTS.CUSTOM_PATH;
      if (websiteAgeHours < 24) {
        // Full refund for custom path if deleted within 24 hours
        refundAmount += customPathRefund;
      } else if (websiteAgeHours < 168) {
        // 75% refund for custom path if deleted within a week
        refundAmount += Math.floor(customPathRefund * 0.75);
      } else if (websiteAgeHours < 720) {
        // 50% refund for custom path if deleted within a month
        refundAmount += Math.floor(customPathRefund * 0.5);
      }
    }
    
    return refundAmount;
  },

  // Improved collaboration session refund calculation
  calculateCollaborationRefund(sessionDurationMinutes: number, totalCost: number): number {
    let refundPercentage = 0;
    if (sessionDurationMinutes < 5) {
      refundPercentage = 0.75;
    } else if (sessionDurationMinutes < 10) {
      refundPercentage = 0.5;
    } else if (sessionDurationMinutes < 30) {
      refundPercentage = 0.1;
    }
    return Math.floor(totalCost * refundPercentage);
  },

  // Check if user has enough tokens for an action
  async hasEnoughTokens(uid: string, requiredTokens: number): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile ? profile.tokens >= requiredTokens : false;
  },

  // Get user's token balance
  async getTokenBalance(uid: string): Promise<number> {
    const profile = await this.getUserProfile(uid);
    return profile ? profile.tokens : 0;
  },

  // Get user's token statistics
  async getTokenStats(uid: string): Promise<{
    currentBalance: number;
    totalEarned: number;
    totalSpent: number;
    netTokens: number;
  }> {
    const profile = await this.getUserProfile(uid);
    if (!profile) {
      return {
        currentBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        netTokens: 0
      };
    }

    return {
      currentBalance: profile.tokens,
      totalEarned: profile.totalTokensEarned,
      totalSpent: profile.totalTokensSpent,
      netTokens: profile.totalTokensEarned - profile.totalTokensSpent
    };
  },

  // Award bonus tokens for various activities
  async awardBonusTokens(uid: string, reason: string, amount: number = 1) {
    await this.addTokens(uid, amount, `Bonus: ${reason}`);
  },

  // Profanity filter for custom domains
  BLOCKED_WORDS: [
    // Common profanity and inappropriate terms
    'fuck', 'shit', 'bitch', 'ass', 'dick', 'cock', 'pussy', 'cunt','nigger','nigga','cumshot',
    'fucker', 'motherfucker', 'shitty', 'asshole', 'dickhead', 'cockhead',
    'porn', 'sex', 'nude', 'naked', 'adult', 'xxx', 'pornhub', 'xvideos',
    'drugs', 'cocaine', 'heroin', 'weed', 'marijuana', 'alcohol',
    'hack', 'hacker', 'crack', 'warez', 'torrent', 'pirate',
    'scam', 'spam', 'phishing', 'malware', 'virus',
    'nazi', 'hitler', 'racist', 'hate', 'kill', 'death',
    'terrorist', 'bomb', 'explosive', 'weapon', 'gun',
    // Common variations and leetspeak
    'fuk', 'fck', 'sh1t', 'b1tch', 'a55', 'd1ck', 'c0ck', 'p0rn','n!gga','n!gger','cumsh0t','t!ts','c!umshot','n!gg3r','n!gg3r',
    's3x', 'n00d', 'h4ck', 'cr4ck', 'w4r3z', 'ph1sh', 'm4lw4r3',
    // German profanity
    'scheisse', 'arsch', 'fick', 'schlampe', 'hure', 'wichser',
    'schwuchtel', 'schwanz', 'fotze', 'nutte', 'schlampe',
    // Add more as needed
  ],

  // Check if a custom path contains blocked words
  isCustomPathBlocked(customPath: string): { blocked: boolean; reason?: string } {
    const normalizedPath = customPath.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check for exact matches
    for (const word of this.BLOCKED_WORDS) {
      if (normalizedPath.includes(word.toLowerCase())) {
        return { 
          blocked: true, 
          reason: `Custom path contains inappropriate content: "${word}"` 
        };
      }
    }
    
    // Check for common variations and patterns
    const suspiciousPatterns = [
      /f[^a-z]*u[^a-z]*c[^a-z]*k/i,
      /s[^a-z]*h[^a-z]*i[^a-z]*t/i,
      /b[^a-z]*i[^a-z]*t[^a-z]*c[^a-z]*h/i,
      /p[^a-z]*o[^a-z]*r[^a-z]*n/i,
      /s[^a-z]*e[^a-z]*x/i,
      /n[^a-z]*u[^a-z]*d[^a-z]*e/i,
      /h[^a-z]*a[^a-z]*c[^a-z]*k/i,
      /c[^a-z]*r[^a-z]*a[^a-z]*c[^a-z]*k/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(customPath)) {
        return { 
          blocked: true, 
          reason: 'Custom path contains inappropriate content patterns' 
        };
      }
    }
    
    // Check for repeated characters (common in spam)
    if (/(.)\1{3,}/.test(customPath)) {
      return { 
        blocked: true, 
        reason: 'Custom path contains too many repeated characters' 
      };
    }
    
    // Check for suspicious length (too short or too long)
    if (customPath.length < 3) {
      return { 
        blocked: true, 
        reason: 'Custom path must be at least 3 characters long' 
      };
    }
    
    if (customPath.length > 50) {
      return { 
        blocked: true, 
        reason: 'Custom path must be less than 50 characters long' 
      };
    }
    
    return { blocked: false };
  },

  // Validate custom path with comprehensive checks
  validateCustomPath(customPath: string): { valid: boolean; reason?: string } {
    // Basic format validation
    if (!/^[a-z0-9-]+$/.test(customPath)) {
      return { 
        valid: false, 
        reason: 'Custom path can only contain lowercase letters, numbers, and hyphens' 
      };
    }
    
    // Check for reserved words
    const reservedWords = [
      'www', 'api', 'admin', 'login', 'logout', 'register', 'signup', 'signin',
      'dashboard', 'settings', 'profile', 'help', 'support', 'contact',
      'about', 'privacy', 'terms', 'legal', 'blog', 'news', 'shop',
      'cart', 'checkout', 'payment', 'billing', 'account', 'user',
      'system', 'server', 'database', 'mail', 'email', 'ftp', 'ssh',
      'test', 'demo', 'example', 'sample', 'temp', 'tmp', 'backup',
      'webnest', 'web', 'site', 'page', 'home', 'index', 'main'
    ];
    
    if (reservedWords.includes(customPath.toLowerCase())) {
      return { 
        valid: false, 
        reason: `"${customPath}" is a reserved word and cannot be used` 
      };
    }
    
    // Check for profanity and inappropriate content
    const profanityCheck = this.isCustomPathBlocked(customPath);
    if (profanityCheck.blocked) {
      return { 
        valid: false, 
        reason: profanityCheck.reason 
      };
    }
    
    // Check for consecutive hyphens
    if (customPath.includes('--')) {
      return { 
        valid: false, 
        reason: 'Custom path cannot contain consecutive hyphens' 
      };
    }
    
    // Check for leading/trailing hyphens
    if (customPath.startsWith('-') || customPath.endsWith('-')) {
      return { 
        valid: false, 
        reason: 'Custom path cannot start or end with a hyphen' 
      };
    }
    
    return { valid: true };
  },

  async hasClaimedReferral(userId: string, _referrerId?: string): Promise<boolean> {
    // Only allow one referral claim per user, regardless of referrer
    const q = query(collection(db, 'referral_claims'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  async addReferralNotification(referrerId: string, newUserId: string) {
    await addDoc(collection(db, 'notifications'), {
      userId: referrerId,
      type: 'referral',
      message: `Your referral link was claimed by user ${newUserId}!`,
      newUserId,
      read: false,
      createdAt: Timestamp.fromDate(new Date())
    });
  },

  async recordReferralClaim(userId: string, referrerId: string) {
    // Prevent self-referral
    if (userId === referrerId) return;
    // Prevent double-claim (any referrer)
    if (await this.hasClaimedReferral(userId)) return;
    await addDoc(collection(db, 'referral_claims'), {
      userId,
      referrerId,
      claimedAt: Timestamp.fromDate(new Date())
    });
    // Award tokens
    await this.addTokens(userId, 1, `Referral bonus from ${referrerId}`);
    await this.addTokens(referrerId, 2, `Referral reward for inviting ${userId}`);
    // Send notification to referrer
    await this.addReferralNotification(referrerId, userId);
  },

  async getReferralClaimCount(referrerId: string): Promise<number> {
    const q = query(collection(db, 'referral_claims'), where('referrerId', '==', referrerId));
    const snap = await getDocs(q);
    return snap.size;
  },

  async getUnreadReferralNotifications(userId: string) {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('type', '==', 'referral'), where('read', '==', false));
    const snap = await getDocs(q);
    const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Mark as read
    for (const n of notifications) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
    return notifications;
  },

  // Check if a user is an admin
  async isAdmin(userId: string): Promise<boolean> {
    // Option 1: Check a custom 'admin' field in the user profile
    const profile = await this.getUserProfile(userId);
    if (profile && (profile as any).admin === true) return true;
    // Option 2: Hardcoded admin emails (fallback)
    const adminEmails = ['luap.palu@gmail.com'];
    if (profile && adminEmails.includes(profile.email)) return true;
    return false;
  },
};
