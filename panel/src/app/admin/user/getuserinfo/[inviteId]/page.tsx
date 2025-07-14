'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { User, Award, Mail, Users, ArrowLeft, ShoppingBag, AlertTriangle, Package, CheckCircle, Circle } from 'lucide-react';

interface PurchasedItem {
  itemId: string;
  itemName: string;
  category?: string;
  xpPrice: number;
  purchasedAt: string;
  used: boolean;
  usedAt: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  xp: number;
  teamId: string;
  teamName: string;
  inviteId: string;
  slackId: string;
  slackName: string;
  banned: boolean;
  banreason: string;
  purchasedItems: PurchasedItem[];
}

export default function AdminUserInfoPage() {
  const params = useParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchUser = async () => {
      try {
        const authRes = await fetch('/api/admin/check-auth');
        if (!authRes.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const authData = await authRes.json();
        if (!authData.isAdmin) {
          setError(true);
          setLoading(false);
          return;
        }
        setIsAuthorized(true);
        const userRes = await fetch(`/api/admin/user/${params.inviteId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error('Error:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (params.inviteId) {
      checkAuthAndFetchUser();
    }
  }, [params.inviteId]);

  const getTotalSpent = () => {
    if (!user?.purchasedItems) return 0;
    return user.purchasedItems.reduce((total, item) => total + item.xpPrice, 0);
  };

  const getUsageStats = () => {
    if (!user?.purchasedItems) return { used: 0, unused: 0 };
    const used = user.purchasedItems.filter(item => item.used).length;
    const unused = user.purchasedItems.length - used;
    return { used, unused };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Swag':
        return <Package className="w-4 h-4" />;
      case 'Item':
        return <ShoppingBag className="w-4 h-4" />;
      case 'Event':
        return <Users className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error || !isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Access Denied</div>
          <div className="text-zinc-400">You are not authorized to view this page.</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">User Not Found</div>
          <div className="text-zinc-400">No user found with the provided invite ID.</div>
        </div>
      </div>
    );
  }

  const usageStats = getUsageStats();

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">User Information</h1>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              
              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <User className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-zinc-400 text-sm">Full Name</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <Mail className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{user.email}</p>
                  <p className="text-zinc-400 text-sm">Email Address</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <Users className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{user.teamName || 'No Team Assigned'}</p>
                  <p className="text-zinc-400 text-sm">Team</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#7d82b8] rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{user.inviteId}</p>
                  <p className="text-zinc-400 text-sm">Invite ID</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#7d82b8] rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">@{user.slackName}</p>
                  <p className="text-zinc-400 text-sm">Slack Username</p>
                </div>
              </div>

              {user.banned && (
                <div className="flex items-center space-x-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium">BANNED</p>
                    <p className="text-red-300 text-sm">{user.banreason || 'No reason provided'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Statistics</h2>
              
              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <Award className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{user.xp?.toLocaleString() || '0'} XP</p>
                  <p className="text-zinc-400 text-sm">Experience Points</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{user.purchasedItems?.length || 0}</p>
                  <p className="text-zinc-400 text-sm">Items Purchased</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <Award className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{getTotalSpent().toLocaleString()} XP</p>
                  <p className="text-zinc-400 text-sm">Total XP Spent</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                <CheckCircle className="w-6 h-6 text-[#7d82b8]" />
                <div className="flex-1">
                  <p className="text-white font-medium">{usageStats.used} / {user.purchasedItems?.length || 0}</p>
                  <p className="text-zinc-400 text-sm">Items Used</p>
                </div>
              </div>
            </div>
          </div>

          {user.purchasedItems && user.purchasedItems.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-4">Purchase History</h2>
              <div className="space-y-3">
                {user.purchasedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded-full text-xs">
                        {getCategoryIcon(item.category || 'Other')}
                        <span>{item.category || 'Other'}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{item.itemName}</p>
                        <p className="text-zinc-400 text-sm">{new Date(item.purchasedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-white font-medium">{item.xpPrice.toLocaleString()} XP</p>
                        <p className="text-zinc-400 text-sm">Price</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {item.used ? (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-[#7d82b8]/20 text-[#7d82b8] rounded-full text-xs">
                            <CheckCircle className="w-3 h-3" />
                            <span>Used</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded-full text-xs">
                            <Circle className="w-3 h-3" />
                            <span>Unused</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}