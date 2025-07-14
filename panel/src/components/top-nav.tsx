'use client';

import { SignOutButton } from '@/components/signout-button';
import { MobileMenu } from '@/components/mobile-menu';
import { Home, Newspaper, Calendar, User, Trophy, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface TopNavProps {
  currentPage?: 'dashboard' | 'news' | 'events' | 'store' | 'profile' | 'leaderboard';
}

export function TopNav({ currentPage = 'dashboard' }: TopNavProps) {
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
            <Link 
              href="/news" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('news') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>News</span>
            </Link>
            <Link 
              href="/events" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('events') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events</span>
            </Link>
            <a 
              href="/store" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('store') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Store</span>
            </a>
            <a 
              href="/profile" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('profile') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </a>
            <a 
              href="/leaderboard" 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                isActive('leaderboard') ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
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