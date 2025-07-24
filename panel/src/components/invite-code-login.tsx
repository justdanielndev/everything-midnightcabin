'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Key } from 'lucide-react';

export function InviteCodeLogin() {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid invite code');
      }
    } catch {
      setError('Failed to validate invite code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Key className="h-5 w-5 text-zinc-400 mr-2" />
          <span className="text-sm text-zinc-400">Use code MIDNCBNDEMO if accessing demo for SoM!</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter demo invite code"
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !inviteCode.trim()}
          className="w-full h-12 text-sm font-medium bg-[#7d82b8] hover:bg-[#7d82b8]/80 disabled:bg-zinc-600 disabled:hover:bg-zinc-600 text-white border-0 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-[#7d82b8]/25 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Key className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Validating...' : 'Login with Invite Code'}
        </button>
      </form>

      <div className="text-center">
        <div className="flex items-center justify-center">
          <div className="flex-grow border-t border-zinc-700/50"></div>
          <span className="mx-4 text-xs text-zinc-500">or</span>
          <div className="flex-grow border-t border-zinc-700/50"></div>
        </div>
      </div>
    </div>
  );
}