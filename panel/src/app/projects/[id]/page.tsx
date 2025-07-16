import { TopNav } from '@/components/top-nav';
import { ProjectDetailsContent } from '@/components/project-details-content';
import { SettingsGuard } from '@/components/settings-guard';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  
  return (
    <SettingsGuard requiredSetting="ProjectsEnabled">
      <div className="min-h-screen bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(125,130,184,0.1)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        
        <div className="relative z-10">
          <TopNav currentPage="projects" />
          <div className="container mx-auto px-6 -mt-16">
            <ProjectDetailsContent projectId={id} />
          </div>
        </div>
      </div>
    </SettingsGuard>
  );
}