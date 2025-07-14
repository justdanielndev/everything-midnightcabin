'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, Users, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopNav } from '@/components/top-nav';

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
  storeItemId: string | null;
}

export default function EventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hackathonData, setHackathonData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, userRes, dataRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/user/me'),
          fetch('/data.json')
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const foundEvent = eventsData.events?.find((item: EventItem) => item.id === params.id);
          if (foundEvent) {
            setEvent(foundEvent);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.authenticated && userData.user) {
            setPurchasedItems(userData.user.purchasedItems || []);
          }
        }

        if (dataRes.ok) {
          const data = await dataRes.json();
          setHackathonData(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const hasAccessToEvent = (event: EventItem) => {
    if (!event.storeItemId) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return purchasedItems.some((item: any) => item.itemId === event.storeItemId);
  };

  const addToCalendar = (event: EventItem) => {
    if (!hackathonData) return;
    
    const dayDates = {
      'Friday': hackathonData.friday,
      'Saturday': hackathonData.saturday,
      'Sunday': hackathonData.sunday,
      'Monday': hackathonData.monday
    };
    
    // @ts-expect-error - error expected :3
    const eventDate = dayDates[event.dayOfWeek];
    if (!eventDate) return;
    const [time, period] = event.hour.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    
    const startDate = new Date(`${eventDate}T${hour24.toString().padStart(2, '0')}:${minutes}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const calendarEvent = {
      title: event.name,
      start: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      end: endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      description: event.description || '',
      location: event.location || ''
    };
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${calendarEvent.start}/${calendarEvent.end}&details=${encodeURIComponent(calendarEvent.description)}&location=${encodeURIComponent(calendarEvent.location)}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="events" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 animate-pulse">
              <div className="h-10 bg-zinc-700 rounded w-3/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="h-6 bg-zinc-700 rounded w-1/2"></div>
                  <div className="h-6 bg-zinc-700 rounded w-2/3"></div>
                  <div className="h-6 bg-zinc-700 rounded w-1/3"></div>
                </div>
                <div className="h-32 bg-zinc-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="events" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <h2 className="text-xl font-semibold text-white mb-2">Event Not Found</h2>
              <p className="text-zinc-400 mb-6">The event you&apos;re looking for doesn&apos;t exist or has been removed.</p>
              <Link href="/events" className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8]">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Events</span>
              </Link>
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
        <TopNav currentPage="events" />
        
        <div className="container mx-auto px-6 -mt-16">
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8">
            <header className="mb-8 pb-6 border-b border-zinc-800/50">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-white cursor-default">{event.name}</h1>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-6">
                {event.isMainEvent && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#7d82b8]/20 text-[#7d82b8] rounded-full border border-[#7d82b8]/30 cursor-default">
                    <span className="text-sm font-medium">Main Event</span>
                  </div>
                )}
                {event.isStoreUnlockable && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 cursor-default">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-sm font-medium">{event.xpToBuy} XP Required</span>
                  </div>
                )}
                {event.hasLimitedAttendees && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 cursor-default">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Limited to {event.maxAttendees} attendees</span>
                  </div>
                )}
              </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2 cursor-default">
                    <span>Event Information</span>
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-zinc-800/30 rounded-xl cursor-default">
                      <Calendar className="w-5 h-5 text-[#7d82b8]" />
                      <div>
                        <p className="text-white font-medium">{event.dayOfWeek}</p>
                        <p className="text-zinc-400 text-sm">Day</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-zinc-800/30 rounded-xl cursor-default">
                      <Clock className="w-5 h-5 text-[#7d82b8]" />
                      <div>
                        <p className="text-white font-medium">{event.hour}</p>
                        <p className="text-zinc-400 text-sm">Time</p>
                      </div>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center space-x-3 p-3 bg-zinc-800/30 rounded-xl cursor-default">
                        <MapPin className="w-5 h-5 text-[#7d82b8]" />
                        <div>
                          <p className="text-white font-medium">{event.location}</p>
                          <p className="text-zinc-400 text-sm">Location</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 cursor-default">Description</h2>
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <p className="text-zinc-300 leading-relaxed cursor-default">
                    {event.description || 'No description available for this event.'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-zinc-800/50">
              {event.isStoreUnlockable ? (
                hasAccessToEvent(event) ? (
                  <button 
                    onClick={() => addToCalendar(event)}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] cursor-pointer"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Add to Calendar</span>
                  </button>
                ) : (
                  <Link 
                    href={event.storeItemId ? `/store#${event.storeItemId}` : '/store'}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 hover:border-amber-500/50 rounded-xl transition-all text-amber-400 cursor-pointer"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>View in Store</span>
                  </Link>
                )
              ) : (
                <button 
                  onClick={() => addToCalendar(event)}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] cursor-pointer"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Add to Calendar</span>
                </button>
              )}
              
              <Link href="/events" className="flex items-center justify-center space-x-2 px-6 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-zinc-600/50 rounded-xl transition-all text-zinc-300 cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Events</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}