'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Users, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { TopNav } from '@/components/top-nav';
import { SettingsGuard } from '@/components/settings-guard';

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

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const groupEventsByDay = () => {
    const dayOrder = ['Friday', 'Saturday', 'Sunday', 'Monday'];
    const grouped: { [key: string]: EventItem[] } = {};
    
    dayOrder.forEach(day => {
      grouped[day] = events
        .filter(event => event.dayOfWeek === day)
        .sort((a, b) => a.hour.localeCompare(b.hour));
    });
    
    return grouped;
  };

  const groupedEvents = groupEventsByDay();

  return (
    <SettingsGuard requiredSetting="EventsEnabled">
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="events" />
        
        <div className="container mx-auto px-6 -mt-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['Friday', 'Saturday', 'Sunday', 'Monday'].map((day) => (
                <div key={day} className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-zinc-700 rounded w-20 mb-4"></div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-zinc-700 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(groupedEvents).map(([day, dayEvents]) => (
                <div key={day} className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
                  <h2 className="text-xl font-semibold text-white mb-6 text-center border-b border-zinc-800/50 pb-3">
                    {day}
                  </h2>
                  
                  <div className="space-y-4">
                    {dayEvents.length > 0 ? (
                      dayEvents.map((event) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-[#7d82b8]/30 hover:bg-[#7d82b8]/5 transition-all cursor-pointer group">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-medium text-white group-hover:text-[#7d82b8] transition-colors text-sm leading-tight">
                                {event.name}
                              </h3>
                              {event.isMainEvent && (
                                <span className="px-2 py-1 bg-[#7d82b8]/20 text-[#7d82b8] text-xs rounded-full flex-shrink-0 ml-2">
                                  Main Event
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              <span className="text-xs text-zinc-400">{event.hour}</span>
                            </div>
                            
                            {event.location && (
                              <div className="flex items-center space-x-2 mb-3">
                                <MapPin className="w-3 h-3 text-zinc-500" />
                                <span className="text-xs text-zinc-400 truncate">{event.location}</span>
                              </div>
                            )}
                            
                            <div className="space-y-1">
                              {event.isStoreUnlockable && (
                                <div className="flex items-center space-x-1 text-xs text-amber-400">
                                  <ShoppingBag className="w-3 h-3" />
                                  <span>{event.xpToBuy} XP</span>
                                </div>
                              )}
                              {event.hasLimitedAttendees && (
                                <div className="flex items-center space-x-1 text-xs text-orange-400">
                                  <Users className="w-3 h-3" />
                                  <span>Max {event.maxAttendees}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 text-zinc-500">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No events</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && events.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-white mb-2 cursor-default">No Events Scheduled</h2>
                <p className="text-zinc-400 cursor-default">Check back later for upcoming events!</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </SettingsGuard>
  );
}