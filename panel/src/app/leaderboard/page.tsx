'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/top-nav';
import { Trophy, Users, TrendingUp } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  name: string;
  slackName: string;
  xp: number;
  teamName: string;
  rank: number;
}

interface TeamStats {
  teamName: string;
  totalXP: number;
  memberCount: number;
  averageXP: number;
  rank: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setTeams(data.teams || []);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="leaderboard" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="max-w-6xl mx-auto">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 animate-pulse">
                <div className="h-8 bg-zinc-700 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="leaderboard" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="max-w-6xl mx-auto">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-white mb-2">Leaderboard Unavailable</h2>
                <p className="text-zinc-400">Unable to load leaderboard data. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
      
      <div className="relative z-10">
        <TopNav currentPage="leaderboard" />
        
        <div className="container mx-auto px-6 -mt-16">
          <div className="max-w-6xl mx-auto">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-[#7d82b8]" />
                  Leaderboard
                </h1>
                
                <div className="flex bg-zinc-800/50 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      activeTab === 'users' 
                        ? 'bg-[#7d82b8] text-white' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      activeTab === 'teams' 
                        ? 'bg-[#7d82b8] text-white' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Teams
                  </button>
                </div>
              </div>

              {activeTab === 'users' ? (
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                      <p className="text-zinc-400">No users found on the leaderboard.</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-zinc-400 text-sm">{user.slackName} @ Slack • Member of {user.teamName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{user.xp.toLocaleString()} XP</p>
                          <p className="text-zinc-400 text-sm">Experience Points</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                      <p className="text-zinc-400">No teams found on the leaderboard.</p>
                    </div>
                  ) : (
                    teams.map((team) => (
                      <div key={team.teamName} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="text-white font-medium">{team.teamName}</p>
                            <p className="text-zinc-400 text-sm">{team.memberCount} members • {team.averageXP.toLocaleString()} avg XP</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{team.totalXP.toLocaleString()} XP</p>
                          <p className="text-zinc-400 text-sm">Total Team XP</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}