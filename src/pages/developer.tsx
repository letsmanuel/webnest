import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { developerService } from '../services/developerService';
import { userService } from '../services/userService';

const DeveloperPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [devKey, setDevKey] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [usage, setUsage] = useState<number>(0);
  const [loadingKey, setLoadingKey] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingKey(true);
    developerService.getOrCreateKey(user.uid).then((data) => {
      setDevKey(data.key);
      setUsage(data.usage);
      setLoadingKey(false);
    });
    // Fetch user token balance
    userService.getTokenBalance(user.uid).then((balance) => {
      setTokens(balance);
    });
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to access developer features.</div>;

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Webnest for Developers</h1>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Your Developer Key:</label>
        {loadingKey ? (
          <div>Loading key...</div>
        ) : devKey ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={devKey}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700 font-mono"
            />
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => navigator.clipboard.writeText(devKey)}
            >
              Copy
            </button>
          </div>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={async () => {
              setLoadingKey(true);
              const data = await developerService.getOrCreateKey(user.uid);
              setDevKey(data.key);
              setUsage(data.usage);
              setLoadingKey(false);
            }}
          >
            Generate Key
          </button>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Tokens Left:</label>
        <span className="text-lg font-mono text-green-700">{tokens}</span>
        <a
          href="/dashboard?buyTokens=1"
          className="ml-4 text-blue-600 underline hover:text-blue-800"
        >
          Buy More Tokens
        </a>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">API Usage:</label>
        <span className="text-lg font-mono">{usage} requests</span>
        <div className="text-sm text-gray-500">1 token = 5 requests</div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">API Endpoints</h2>
        <div className="bg-gray-50 p-4 rounded border text-sm">
          <div className="mb-2 font-mono text-blue-900">POST /webnest-api/page-visits</div>
          <div className="mb-2">Body: {'{ pageId, devKey }'}</div>
          <div className="mb-4">Returns: {'{ pageId, totalVisits }'}</div>
          <div className="mb-2 font-mono text-blue-900">POST /webnest-api/check-dns</div>
          <div className="mb-2">Body: {'{ dns, devKey }'}</div>
          <div>Returns: {'{ dns, available }'}</div>
        </div>
        <div className="mt-4 text-gray-600 text-xs">
          Usage costs 1 token per 5 requests. If you run out of tokens, you must buy more to continue using the API.
        </div>
      </div>
    </div>
  );
};

export default DeveloperPage; 