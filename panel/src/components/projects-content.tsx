'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { FolderOpen, Plus, Calendar, AlertCircle, Folder, Search, X } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Created' | 'Approved' | 'Rejected' | 'Submitted' | 'In development';
  teamId: string;
  teamName: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  teamId: string;
  name: string;
  projects: string[];
  members: { id: string; name: string; slackName: string }[];
  type: string;
}

export function ProjectsContent() {
  const { settings } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const response2 = await fetch('/api/user/current-team');
      if (response2.ok) {
        const userData = await response2.json();
        if (userData.teamId) {
          const teamsResponse = await fetch('/api/teams');
          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            const currentUserTeam = teamsData.teams.find((team: Team) => team.teamId === userData.teamId);
            setUserTeam(currentUserTeam || null);
          }
        } else {
          setUserTeam(null);
        }
      } else {
        setUserTeam(null);
      }
      
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.teamName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: projectName.trim(),
          description: projectDescription.trim() || undefined
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setProjectName('');
        setProjectDescription('');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create project');
      }
    } catch {
      setError('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (!settings?.ProjectsEnabled) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-zinc-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
            <p className="text-zinc-400">Projects functionality is currently disabled.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-48"></div>
            <div className="h-12 bg-zinc-800 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-zinc-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 mx-auto"
            >
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Created':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Submitted':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'In development':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Created':
        return 'Created';
      case 'Approved':
        return 'Approved';
      case 'Submitted':
        return 'Submitted';
      case 'In development':
        return 'In development';
      case 'Rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative" style={{ width: '66.67%' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 whitespace-nowrap"
            style={{ width: '33.33%' }}
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mx-auto mb-4">
                <Folder className="w-8 h-8 text-zinc-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'No projects found' : 'No projects yet'}
              </h2>
              <p className="text-zinc-400 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : userTeam 
                    ? "Your team hasn't created any projects yet."
                    : "Join a team to start working on projects together!"
                }
              </p>
              {userTeam && !searchTerm && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Project</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 p-4 hover:border-[#7d82b8]/30 hover:bg-[#7d82b8]/5 transition-all cursor-pointer"
                  onClick={() => window.location.href = `/projects/${project.id}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{project.name}</h3>
                      <p className="text-zinc-400 mb-3">{project.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-700/30 pt-4">
                    <div className="flex justify-between items-center">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 5).map((member, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 bg-[#7d82b8]/20 border-2 border-zinc-800 rounded-full flex items-center justify-center text-[#7d82b8] text-sm font-medium"
                            title={member}
                          >
                            {member.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {project.members.length > 5 && (
                          <div className="w-8 h-8 bg-zinc-700/50 border-2 border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 text-xs font-medium">
                            +{project.members.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Create New Project</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Project Name*
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
                  placeholder="Enter project name..."
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors resize-none"
                  placeholder="Enter project description..."
                  rows={3}
                  maxLength={200}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || creating}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#7d82b8] border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}