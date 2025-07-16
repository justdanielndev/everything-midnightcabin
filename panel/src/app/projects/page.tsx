import { TopNav } from '@/components/top-nav';
import { ProjectsContent } from '@/components/projects-content';
import { SettingsGuard } from '@/components/settings-guard';

export default function ProjectsPage() {
  return (
    <SettingsGuard requiredSetting="ProjectsEnabled">
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="projects" />
          <div className="container mx-auto px-6 -mt-16">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3 cursor-default">Projects</h2>
                  <p className="text-zinc-400 cursor-default">Create or manage your team&apos;s projects!</p>
                </div>
              </div>
              <ProjectsContent />
            </div>
          </div>
        </div>
      </div>
    </SettingsGuard>
  );
}