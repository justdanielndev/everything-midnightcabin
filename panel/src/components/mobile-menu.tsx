'use client';

import { useState } from 'react';
import { Menu, X, Home, Newspaper, Calendar, User, Trophy, ShoppingBag, Users, FolderOpen } from 'lucide-react';
import { SignOutButton } from './signout-button';
import { useSettings } from '@/hooks/use-settings';
import Link from 'next/link';

interface MobileMenuProps {
  currentPage?: 'dashboard' | 'news' | 'events' | 'store' | 'profile' | 'leaderboard' | 'teams' | 'projects';
}

export function MobileMenu({ currentPage = 'dashboard' }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, loading } = useSettings();
  
  const isActive = (page: string) => currentPage === page;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-zinc-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="bg-gradient-to-b from-[#7d82b8]/30 via-[#7d82b8]/10 to-transparent h-48">
              <div className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#7d82b8] to-[#6b70a6] rounded-xl border border-[#7d82b8]/20 shadow-lg">
                      <img
                        src="/mcab.svg"
                        alt="Midnight Cabin Logo"
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Midnight Cabin</h1>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-3 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center px-6">
              <nav className="space-y-2 max-w-sm mx-auto w-full">
                <a href="/dashboard" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                  isActive('dashboard') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`} onClick={() => setIsOpen(false)}>
                  <Home className="w-6 h-6" />
                  <span>Home</span>
                </a>
                {loading ? (
                  <>
                    <div className="flex items-center justify-center space-x-4 py-6">
                      <div className="w-6 h-6 bg-zinc-400 rounded animate-pulse"></div>
                      <div className="w-16 h-6 bg-zinc-400 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-center space-x-4 py-6">
                      <div className="w-6 h-6 bg-zinc-400 rounded animate-pulse"></div>
                      <div className="w-20 h-6 bg-zinc-400 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-center space-x-4 py-6">
                      <div className="w-6 h-6 bg-zinc-400 rounded animate-pulse"></div>
                      <div className="w-14 h-6 bg-zinc-400 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-center space-x-4 py-6">
                      <div className="w-6 h-6 bg-zinc-400 rounded animate-pulse"></div>
                      <div className="w-24 h-6 bg-zinc-400 rounded animate-pulse"></div>
                    </div>
                  </>
                ) : (
                  <>
                    {settings.NewsEnabled && (
                      <Link href="/news" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                        isActive('news') ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`} onClick={() => setIsOpen(false)}>
                        <Newspaper className="w-6 h-6" />
                        <span>News</span>
                      </Link>
                    )}
                    {settings.EventsEnabled && (
                      <Link href="/events" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                        isActive('events') ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`} onClick={() => setIsOpen(false)}>
                        <Calendar className="w-6 h-6" />
                        <span>Events</span>
                      </Link>
                    )}
                    {settings.StoreEnabled && (
                      <a href="/store" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                        isActive('store') ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`} onClick={() => setIsOpen(false)}>
                        <ShoppingBag className="w-6 h-6" />
                        <span>Store</span>
                      </a>
                    )}
                    {settings.LeaderboardEnabled && (
                      <a href="/leaderboard" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                        isActive('leaderboard') ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`} onClick={() => setIsOpen(false)}>
                        <Trophy className="w-6 h-6" />
                        <span>Leaderboard</span>
                      </a>
                    )}
                    {settings.TeamsEnabled && (
                      <a href="/teams" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                        isActive('teams') ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`} onClick={() => setIsOpen(false)}>
                        <Users className="w-6 h-6" />
                        <span>Teams</span>
                      </a>
                    )}
                    {settings.ProjectsEnabled && (
                      <a href="/projects" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                        isActive('projects') ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`} onClick={() => setIsOpen(false)}>
                        <FolderOpen className="w-6 h-6" />
                        <span>Projects</span>
                      </a>
                    )}
                  </>
                )}
                <a href="/profile" className={`flex items-center justify-center space-x-4 font-medium hover:text-[#7d82b8] transition-colors py-6 text-xl ${
                  isActive('profile') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`} onClick={() => setIsOpen(false)}>
                  <User className="w-6 h-6" />
                  <span>Profile</span>
                </a>
              </nav>
              
              <div className="mt-8 flex justify-center">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}