'use client';

import { useEffect, useState } from 'react';
import { User, Award, Mail, Users } from 'lucide-react';
import { TopNav } from '@/components/top-nav';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  slackId: string;
  slackName: string;
  xp: number;
  teamId: string;
  teamName: string;
  inviteId: string;
  banned: boolean;
  banreason: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const generateQRCode = (content: string) => {
    const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/getuserinfo/${content}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;
  };

  const getTeamName = (teamName: string) => {
    return teamName || 'No Team Assigned';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="profile" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="max-w-6xl mx-auto">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 animate-pulse">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="text-center lg:text-left">
                    <div className="w-48 h-48 bg-zinc-700 rounded-2xl mx-auto lg:mx-0 mb-6"></div>
                    <div className="h-8 bg-zinc-700 rounded w-3/4 mx-auto lg:mx-0 mb-4"></div>
                    <div className="h-6 bg-zinc-700 rounded w-1/2 mx-auto lg:mx-0"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-16 bg-zinc-700 rounded"></div>
                    <div className="h-16 bg-zinc-700 rounded"></div>
                    <div className="h-16 bg-zinc-700 rounded"></div>
                    <div className="h-16 bg-zinc-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="profile" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="max-w-6xl mx-auto">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
                <p className="text-zinc-400">Unable to load your profile information. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inviteData = user.inviteId || user.slackId;
  const qrCodeUrl = generateQRCode(inviteData);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
      
      <div className="relative z-10">
        <TopNav currentPage="profile" />
        
        <div className="container mx-auto px-6 -mt-16">
          <div className="max-w-6xl mx-auto">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="text-center lg:text-left">
                  <div className="inline-block p-4 bg-white rounded-2xl mb-4">
                    <img 
                      src={qrCodeUrl} 
                      alt="Invite QR Code" 
                      className="w-48 h-48 mx-auto lg:mx-0"
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 cursor-default">Your Invite Code</h2>
                  <p className="text-zinc-400 cursor-default">Use this code when you first arrive to the venue</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                    <User className="w-6 h-6 text-[#7d82b8]" />
                    <div className="flex-1">
                      <p className="text-white font-medium cursor-default">{user.name}</p>
                      <p className="text-zinc-400 text-sm cursor-default">Name</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                    <Mail className="w-6 h-6 text-[#7d82b8]" />
                    <div className="flex-1">
                      <p className="text-white font-medium cursor-default">{user.email}</p>
                      <p className="text-zinc-400 text-sm cursor-default">Email Address</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                    <Users className="w-6 h-6 text-[#7d82b8]" />
                    <div className="flex-1">
                      <p className="text-white font-medium cursor-default">{getTeamName(user.teamName)}</p>
                      <p className="text-zinc-400 text-sm cursor-default">Team</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-zinc-800/30 rounded-xl">
                    <Award className="w-6 h-6 text-[#7d82b8]" />
                    <div className="flex-1">
                      <p className="text-white font-medium cursor-default">{user.xp?.toLocaleString() || '0'} XP</p>
                      <p className="text-zinc-400 text-sm cursor-default">Experience Points</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}