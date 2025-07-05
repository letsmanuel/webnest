
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4POYjU4SleOGZdRuZNRuUn_4KVL3nMgY",
  authDomain: "webnest-df2cc.firebaseapp.com",
  projectId: "webnest-df2cc",
  storageBucket: "webnest-df2cc.firebasestorage.app",
  messagingSenderId: "19116686866",
  appId: "1:19116686866:web:adaafbf3ec2beedc5162cb",
  measurementId: "G-FPV57YZ023"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('email');
googleProvider.addScope('profile');
