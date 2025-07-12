import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SECONDS_PER_TOKEN = 30; // Change this value to set how many seconds per token
const CIRCLE_RADIUS = 70;
const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_RADIUS;

function AnimatedTokenCounter({ value }: { value: number }) {
  const digits = value.toString().split("");
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex justify-center gap-1 text-4xl font-bold mb-0" style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {digits.map((digit, i) => (
          <motion.span
            key={i + '-' + digit}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
            className="inline-block min-w-[1ch] text-green-500"
          >
            {digit}
          </motion.span>
        ))}
      </div>
      <span className="block mt-1 text-base font-semibold text-indigo-400 tracking-wide" style={{letterSpacing: '0.04em'}}>tokens</span>
    </div>
  );
}

function CircularTimer({ seconds, tokens }: { seconds: number, tokens: number }) {
  const progress = seconds / SECONDS_PER_TOKEN;
  const offset = CIRCLE_CIRCUM * (1 - progress);
  return (
    <div className="flex flex-col items-center justify-center w-60 mx-auto select-none">
      <div className="relative w-60 h-60 flex items-center justify-center" style={{overflow: 'visible'}}>
        <svg width={240} height={240} className="absolute top-0 left-0 z-0" style={{overflow: 'visible'}}>
          <circle
            cx={120}
            cy={120}
            r={CIRCLE_RADIUS}
            stroke="#e0e7ff"
            strokeWidth={14}
            fill="none"
          />
          <motion.circle
            cx={120}
            cy={120}
            r={CIRCLE_RADIUS}
            stroke="url(#timer-gradient)"
            strokeWidth={14}
            fill="none"
            strokeDasharray={CIRCLE_CIRCUM}
            strokeDashoffset={offset}
            strokeLinecap="round"
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 32px #818cf8)' }}
          />
          <defs>
            <linearGradient id="timer-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.span
            key={seconds}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="z-10 text-6xl font-extrabold text-indigo-700"
            style={{
              textShadow:
                '0 2px 16px #a5b4fc, 0 0px 32px #6366f1, 0 1px 0 #fff',
              filter: 'drop-shadow(0 0 8px #818cf8)'
            }}
          >
            {SECONDS_PER_TOKEN - seconds}
          </motion.span>
        </div>
      </div>
      <span className="mt-4 text-sm font-semibold text-indigo-400 bg-white/70 px-3 py-1 rounded-full shadow-sm tracking-wide z-20 text-center" style={{letterSpacing: '0.04em', minWidth: '180px'}}>
        seconds until next token ({SECONDS_PER_TOKEN}s)
      </span>
      <div className="mt-6">
        <AnimatedTokenCounter value={tokens} />
      </div>
    </div>
  );
}

const RewardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [seconds, setSeconds] = useState(0);
  const [tokens, setTokens] = useState<number | null>(null);
  const [lastRewardMinute, setLastRewardMinute] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [rewarding, setRewarding] = useState(false);

  // Fetch token balance
  useEffect(() => {
    if (!user) return;
    userService.getUserProfile(user.uid).then(profile => {
      setTokens(profile?.tokens ?? 0);
    });
  }, [user]);

  // Timer logic
  useEffect(() => {
    if (!user) return;
    intervalRef.current && clearInterval(intervalRef.current);
    setSeconds(0);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s >= SECONDS_PER_TOKEN - 1) {
          setRewarding(true);
          userService.addTokens(user.uid, 1, 'Time reward').then(() => {
            setTokens((t) => (t !== null ? t + 1 : 1));
            setLastRewardMinute((m) => m + 1);
            setTimeout(() => setRewarding(false), 800);
          });
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-400 border-opacity-30"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 p-8 rounded-2xl shadow-2xl text-center"
        >
          <h2 className="text-3xl font-bold mb-4 text-indigo-700">Login Required</h2>
          <p className="text-lg text-indigo-500 mb-6">Please log in to start earning tokens for your time!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated background shapes */}
        <motion.div
          className="absolute w-96 h-96 bg-indigo-200 rounded-full opacity-30 blur-3xl left-[-10%] top-[-10%]"
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-purple-200 rounded-full opacity-20 blur-3xl right-[-8%] bottom-[-8%]"
          animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        />
      </div>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="bg-white/80 p-10 rounded-3xl shadow-2xl flex flex-col items-center relative z-10"
      >
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-6 drop-shadow-lg">Earn Tokens for Your Time</h1>
        <div className="mb-8">
          <CircularTimer seconds={seconds} tokens={tokens ?? 0} />
        </div>
        {/* Remove +1 Token animation */}
        {/* <AnimatePresence>
          {rewarding && (
            <motion.div
              key={lastRewardMinute}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-green-500 mb-2 drop-shadow animate-bounce"
            >
              +1 Token!
            </motion.div>
          )}
        </AnimatePresence> */}
        {/* Token counter is now inside the timer */}
        <div className="text-indigo-500 mb-6">Stay on this page to keep earning tokens every minute.</div>
        <Button onClick={() => window.location.href = '/'} className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-lg transition-all duration-300">
          Back to Home
        </Button>
      </motion.div>
    </div>
  );
};

export default RewardPage; 