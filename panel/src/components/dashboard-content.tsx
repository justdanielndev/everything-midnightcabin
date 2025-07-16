'use client';

import { useEffect, useState } from 'react';
import { Clock, Award, ShoppingBag, Newspaper, Calendar } from 'lucide-react';
import Link from 'next/link';

interface NewsItem {
  id: string;
  name: string;
  description: string;
  author: string;
  publicationDate: string;
}

interface EventItem {
  id: string;
  name: string;
  location: string;
  description: string;
  dayOfWeek: string;
  hour: string;
  isMainEvent: boolean;
  isStoreUnlockable: boolean;
  hasLimitedAttendees: boolean;
  xpToBuy: string | null;
  maxAttendees: number | null;
}

export function DashboardContent() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hackathonData, setHackathonData] = useState<{ [key: string]: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [userXP, setUserXP] = useState<number>(0);
  const [settings, setSettings] = useState<{ [key: string]: string | boolean } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, eventsRes, dataRes, userRes, settingsRes] = await Promise.all([
          fetch('/api/news'),
          fetch('/api/events'),
          fetch('/data.json'),
          fetch('/api/user/me'),
          fetch('/api/settings')
        ]);

        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNews(newsData.news || []);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.events || []);
        }

        if (dataRes.ok) {
          const data = await dataRes.json();
          setHackathonData(data);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.authenticated && userData.user) {
            setUserXP(userData.user.xp || 0);
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData.settings || {});
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  useEffect(() => {
    if (hackathonData && settings) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const timeUntilStartEnabled = settings.timeUntilStartEnabled === true;
        
        if (timeUntilStartEnabled) {
          const startTime = new Date(hackathonData['start-date-and-time']).getTime();
          const difference = startTime - now;
          
          if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) {
              setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            } else {
              setTimeLeft(`${hours}h ${minutes}m`);
            }
          } else {
            setTimeLeft('Event started');
          }
        } else {
          const endTime = new Date(hackathonData['end-date-and-time']).getTime();
          const difference = endTime - now;

          if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            if (days > 0) {
              setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else {
              setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
          } else {
            setTimeLeft('Event ended');
          }
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(interval);
    }
  }, [hackathonData, settings]);

  const getUpcomingEvents = () => {
    if (!hackathonData) return events.slice(0, 2);
    
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    
    const dayOrder = ['Friday', 'Saturday', 'Sunday', 'Monday'];
    const dayDates = {
      'Friday': hackathonData.friday,
      'Saturday': hackathonData.saturday,
      'Sunday': hackathonData.sunday,
      'Monday': hackathonData.monday
    };
    
    const upcomingEvents = events.filter(event => {
      // @ts-expect-error - error expected :3
      const eventDate = dayDates[event.dayOfWeek];
      return eventDate && eventDate >= todayString;
    });
    
    return upcomingEvents
      .sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.hour.localeCompare(b.hour);
      })
      .slice(0, 3);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-700 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-20 bg-zinc-700 rounded"></div>
              <div className="h-20 bg-zinc-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-700 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-20 bg-zinc-700 rounded"></div>
              <div className="h-20 bg-zinc-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-[#7d82b8]/10 rounded-xl">
                <Award className="w-5 h-5 text-[#7d82b8]" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg cursor-default">{userXP?.toLocaleString() || '0'} XP</p>
                <p className="text-zinc-400 text-sm cursor-default">Experience Points</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-[#7d82b8]/10 rounded-xl">
                <Clock className="w-5 h-5 text-[#7d82b8]" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg cursor-default">{timeLeft || '0h 0m'}</p>
                <p className="text-zinc-400 text-sm cursor-default">
                  {settings?.timeUntilStartEnabled ? 'Time Until Beginning' : 'Time Left'}
                </p>
              </div>
            </div>
          </div>
          
          <a href="/store" className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all cursor-pointer">
            <ShoppingBag className="w-4 h-4 text-[#7d82b8]" />
            <span className="text-[#7d82b8] font-medium">XP Store</span>
          </a>
        </div>
      </div>
      
      <div className={`grid grid-cols-1 gap-6 ${
        settings?.NewsEnabled && settings?.EventsEnabled ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
      }`}>
        {settings?.NewsEnabled && (
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
                <Newspaper className="w-4 h-4 text-[#7d82b8]" />
              </div>
              <h3 className="text-lg font-semibold text-white cursor-default">Latest News</h3>
            </div>
            <div className="space-y-4">
              {news.length > 0 ? (
                news.slice(0, 3).map((item) => (
                  <a key={item.id} href={`/news/${item.id}`} className="block">
                    <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-[#7d82b8]/30 hover:bg-[#7d82b8]/5 transition-all cursor-pointer">
                      <h4 className="text-white font-medium mb-2 hover:text-[#7d82b8] transition-colors">{item.name}</h4>
                      <p className="text-zinc-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#7d82b8]">by {item.author}</span>
                        <span className="text-xs text-zinc-500">{formatTimeAgo(item.publicationDate)}</span>
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No news available</p>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/news" className="text-[#7d82b8] hover:text-[#7d82b8]/80 text-sm font-medium transition-colors">
                See more →
              </Link>
            </div>
          </div>
        )}
        
        {settings?.EventsEnabled && (
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
                <Calendar className="w-4 h-4 text-[#7d82b8]" />
              </div>
              <h3 className="text-lg font-semibold text-white cursor-default">Upcoming Events</h3>
            </div>
            <div className="space-y-4">
              {events.length > 0 ? (
                getUpcomingEvents().map((event) => (
                  <a key={event.id} href={`/events/${event.id}`} className="block">
                    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-[#7d82b8]/30 hover:bg-[#7d82b8]/5 transition-all cursor-pointer">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-medium hover:text-[#7d82b8] transition-colors">{event.name}</h4>
                          {event.isMainEvent && (
                            <span className="px-2 py-1 bg-[#7d82b8]/20 text-[#7d82b8] text-xs rounded-full">
                              Main Event
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-400 text-sm">{event.location}</p>
                        {event.isStoreUnlockable && (
                          <p className="text-amber-400 text-xs mt-1">🛒 {event.xpToBuy} XP required</p>
                        )}
                        {event.hasLimitedAttendees && (
                          <p className="text-orange-400 text-xs mt-1">👥 Limited to {event.maxAttendees} attendees</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[#7d82b8] font-medium text-sm">{event.dayOfWeek}</p>
                        <p className="text-zinc-400 text-xs">{event.hour}</p>
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No events scheduled</p>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <Link href="/events" className="text-[#7d82b8] hover:text-[#7d82b8]/80 text-sm font-medium transition-colors">
                See more →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}