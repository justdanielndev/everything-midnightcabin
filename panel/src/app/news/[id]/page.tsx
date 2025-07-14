'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, User, Calendar, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopNav } from '@/components/top-nav';

interface NewsItem {
  id: string;
  name: string;
  description: string;
  mdContent: string;
  author: string;
  publicationDate: string;
}

export default function NewsArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const data = await response.json();
          const foundArticle = data.news?.find((item: NewsItem) => item.id === params.id);
          if (foundArticle) {
            setArticle(foundArticle);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (error) {
        console.error('Error fetching article:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

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

  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="news" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 animate-pulse">
              <div className="h-8 bg-zinc-700 rounded w-3/4 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-zinc-700 rounded w-full"></div>
                <div className="h-4 bg-zinc-700 rounded w-full"></div>
                <div className="h-4 bg-zinc-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="news" />
          
          <div className="container mx-auto px-6 -mt-16">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-12 text-center">
              <Newspaper className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <h2 className="text-xl font-semibold text-white mb-2">Article Not Found</h2>
              <p className="text-zinc-400 mb-6">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
              <Link href="/news" className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8]">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to News</span>
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
        <TopNav currentPage="news" />
        
        <div className="container mx-auto px-6 -mt-16">
          <article className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8">
            <header className="mb-8 pb-6 border-b border-zinc-800/50">
              <h1 className="text-3xl font-bold text-white mb-4">{article.name}</h1>
              <p className="text-lg text-zinc-300 mb-6">{article.description}</p>
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>by {article.author}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(article.publicationDate)}</span>
                </div>
              </div>
            </header>
            
            <div className="prose prose-invert max-w-none">
              {article.mdContent ? (
                <div
                  className="text-zinc-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: `<p class="mb-4">${formatContent(article.mdContent)}</p>`
                  }}
                />
              ) : (
                <p className="text-zinc-300 leading-relaxed">
                  No content available for this article.
                </p>
              )}
            </div>
            
            <div className="mt-12 pt-6 border-t border-zinc-800/50">
              <Link href="/news" className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8]">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to News</span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}