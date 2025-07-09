import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { Login } from '@/components/Login';

const Referral = () => {
  const { userid: referrerId } = useParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle'|'rewarded'|'already'|'self'|'error'|'not-logged-in'>('idle');
  const [referrerEmail, setReferrerEmail] = useState<string|null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus('not-logged-in');
      return;
    }
    if (!referrerId || user.uid === referrerId) {
      setStatus('self');
      return;
    }
    // Fetch referrer info for message
    userService.getUserProfile(referrerId).then(profile => {
      setReferrerEmail(profile?.email || referrerId);
    });
    // Only use backend to check if already claimed
    userService.hasClaimedReferral(user.uid, referrerId).then(async (alreadyClaimed) => {
      if (alreadyClaimed) {
        setStatus('already');
      } else {
        // Award tokens and record claim (userService handles both sides)
        try {
          await userService.recordReferralClaim(user.uid, referrerId);
          setStatus('rewarded');
        } catch {
          setStatus('error');
        }
      }
    }).catch(() => setStatus('error'));
  }, [user, loading, referrerId]);

  if (status === 'not-logged-in') {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full text-center text-gray-900 dark:text-gray-100">
        <h1 className="text-2xl font-bold mb-4">Referral</h1>
        {status === 'self' && <p>You cannot claim your own referral link.</p>}
        {status === 'already' && <p>You have already claimed a reward from this user.</p>}
        {status === 'rewarded' && (
          <>
            <p>
              Success! You received <b>1 token</b> for using a referral link.<br/>
              <span className="text-sm text-gray-500">Referred by: <b>{referrerEmail || referrerId}</b></span>
            </p>
            <button
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              onClick={() => navigate('/')}
            >
              Start making a website for FREE now
            </button>
          </>
        )}
        {status === 'error' && <p>There was an error processing your referral. Please try again later.</p>}
        {status === 'idle' && <p>Checking referral status...</p>}
      </div>
    </div>
  );
};

export default Referral; 