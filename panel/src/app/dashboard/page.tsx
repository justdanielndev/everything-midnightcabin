import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardContent } from '@/components/dashboard-content';
import { TopNav } from '@/components/top-nav';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const slackUserId = cookieStore.get('slack_user_id')?.value;
  
  if (!slackUserId) {
    redirect('/');
  }
  
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
      
      <div className="relative z-10">
        <TopNav currentPage="dashboard" />
        
        <div className="container mx-auto px-6 -mt-16">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-3 cursor-default">Welcome back! 👋</h2>
              </div>
            </div>
            
            <DashboardContent />
          </div>
        </div>
      </div>
    </div>
  );
}