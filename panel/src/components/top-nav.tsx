'use client';

import { SignOutButton } from '@/components/signout-button';
import { MobileMenu } from '@/components/mobile-menu';
import { Home, Newspaper, Calendar, User, Trophy, ShoppingBag, Users, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/hooks/use-settings';

interface TopNavProps {
  currentPage?: 'dashboard' | 'news' | 'events' | 'store' | 'profile' | 'leaderboard' | 'teams' | 'projects';
}

export function TopNav({ currentPage = 'dashboard' }: TopNavProps) {
  const { settings, loading } = useSettings();
  const isActive = (page: string) => currentPage === page;

  return (
    <div className="bg-gradient-to-b from-[#7d82b8]/30 via-[#7d82b8]/10 to-transparent h-48">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between w-full">
          <a href="/dashboard" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#7d82b8] to-[#6b70a6] rounded-xl border border-[#7d82b8]/20 shadow-lg">
              <img
                src="/mcab.svg"
                alt="Midnight Cabin Logo"
                className="w-6 h-6"
              />
            </div>
            <div className="block md:hidden lg:block">
              <h1 className="text-xl font-bold text-white">Midnight Cabin</h1>
            </div>
          </a>
          
          <nav className="hidden md:flex items-center justify-center space-x-8">
            <a 
              href="/dashboard" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('dashboard') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </a>
            {loading ? (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-zinc-400 rounded animate-pulse"></div>
                  <div className="w-12 h-4 bg-zinc-400 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-zinc-400 rounded animate-pulse"></div>
                  <div className="w-14 h-4 bg-zinc-400 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-zinc-400 rounded animate-pulse"></div>
                  <div className="w-10 h-4 bg-zinc-400 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-zinc-400 rounded animate-pulse"></div>
                  <div className="w-20 h-4 bg-zinc-400 rounded animate-pulse"></div>
                </div>
              </>
            ) : (
              <>
                {settings.NewsEnabled && (
                  <Link 
                    href="/news" 
                    className={`flex items-center space-x-2 font-medium transition-colors ${
                      isActive('news') ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Newspaper className="w-4 h-4" />
                    <span>News</span>
                  </Link>
                )}
                {settings.EventsEnabled && (
                  <Link 
                    href="/events" 
                    className={`flex items-center space-x-2 font-medium transition-colors ${
                      isActive('events') ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Events</span>
                  </Link>
                )}
                {settings.StoreEnabled && (
                  <a 
                    href="/store" 
                    className={`flex items-center space-x-2 font-medium transition-colors ${
                      isActive('store') ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Store</span>
                  </a>
                )}
                {settings.LeaderboardEnabled && (
                  <a 
                    href="/leaderboard" 
                    className={`flex items-center space-x-2 font-medium transition-colors ${
                      isActive('leaderboard') ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Leaderboard</span>
                  </a>
                )}
                {settings.TeamsEnabled && (
                  <a 
                    href="/teams" 
                    className={`flex items-center space-x-2 font-medium transition-colors ${
                      isActive('teams') ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Teams</span>
                  </a>
                )}
                {settings.ProjectsEnabled && (
                  <Link 
                    href="/projects" 
                    className={`flex items-center space-x-2 font-medium transition-colors ${
                      isActive('projects') ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Projects</span>
                  </Link>
                )}
              </>
            )}
            <a 
              href="/profile" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('profile') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </a>
          </nav>
          
          <div className="flex items-center">
            <div className="hidden md:block">
              <SignOutButton />
            </div>
            <MobileMenu currentPage={currentPage} />
          </div>
        </div>
      </div>
    </div>
  );
}