'use client';

import { useEffect, useState } from 'react';
import { Newspaper, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import { TopNav } from '@/components/top-nav';
import { SettingsGuard } from '@/components/settings-guard';

interface NewsItem {
  id: string;
  name: string;
  description: string;
  mdContent: string;
  author: string;
  publicationDate: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const data = await response.json();
          setNews(data.news || []);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SettingsGuard requiredSetting="NewsEnabled">
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="news" />
        
        <div className="container mx-auto px-6 -mt-16">
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 animate-pulse">
                  <div className="h-6 bg-zinc-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-zinc-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-zinc-700 rounded w-2/3 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-zinc-700 rounded w-24"></div>
                    <div className="h-4 bg-zinc-700 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-6">
              {news.map((item) => (
                <Link key={item.id} href={`/news/${item.id}`}>
                  <article className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 hover:border-[#7d82b8]/30 hover:bg-[#7d82b8]/5 transition-all cursor-pointer group">
                    <h2 className="text-xl font-semibold text-white mb-3 group-hover:text-[#7d82b8] transition-colors">
                      {item.name}
                    </h2>
                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-zinc-500">
                        <User className="w-4 h-4" />
                        <span>by {item.author}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-zinc-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.publicationDate)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12">
                <Newspaper className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-white mb-2">No News Available</h2>
                <p className="text-zinc-400">Check back later for the latest updates!</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </SettingsGuard>
  );
}