'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { FolderOpen, Calendar, Clock, GitBranch, ArrowLeft, Edit, Save, X, FileText, Plus } from 'lucide-react';
import Link from 'next/link';

interface Devlog {
  id: string;
  content: string;
  imageUrl?: string;
  timestamp: string;
  author: string;
}

interface HackatimeProject {
  projectName: string;
  userId: string;
  userName: string;
  userSlackName: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Created' | 'Approved' | 'Submitted' | 'In development' | 'Rejected';
  teamId: string;
  teamName: string;
  gitRepo?: string;
  dateSubmitted: string;
  hackatimeHours: number;
  rejectionReason?: string;
  devlogs: Devlog[];
  hackatimeProjects: (HackatimeProject | string)[];
}

interface ProjectDetailsContentProps {
  projectId: string;
}

export function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const { settings } = useSettings();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedGitRepo, setEditedGitRepo] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHackatimeModal, setShowHackatimeModal] = useState(false);
  const [newHackatimeProject, setNewHackatimeProject] = useState('');
  const [addingHackatimeProject, setAddingHackatimeProject] = useState(false);
  const [showDevlogModal, setShowDevlogModal] = useState(false);
  const [devlogContent, setDevlogContent] = useState('');
  const [devlogImageUrl, setDevlogImageUrl] = useState('');
  const [addingDevlog, setAddingDevlog] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data.project);
      setEditedDescription(data.project.description);
      setEditedGitRepo(data.project.gitRepo || '');
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSave = async () => {
    if (!project) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editedDescription.trim(),
          gitRepo: editedGitRepo.trim()
        })
      });

      if (response.ok) {
        setProject({
          ...project,
          description: editedDescription.trim(),
          gitRepo: editedGitRepo.trim()
        });
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update project');
      }
    } catch {
      setError('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDevlog = async () => {
    if (!project || !devlogContent.trim()) return;
    
    setAddingDevlog(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/devlogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: devlogContent.trim(),
          imageUrl: devlogImageUrl.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProject({
          ...project,
          devlogs: [...project.devlogs, data.devlog]
        });
        setShowDevlogModal(false);
        setDevlogContent('');
        setDevlogImageUrl('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add devlog');
      }
    } catch {
      setError('Failed to add devlog');
    } finally {
      setAddingDevlog(false);
    }
  };

  const handleAddHackatimeProject = async () => {
    if (!project || !newHackatimeProject.trim()) return;
    
    setAddingHackatimeProject(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/hackatime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: newHackatimeProject.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProject({
          ...project,
          hackatimeProjects: [...project.hackatimeProjects, data.hackatimeProject],
          hackatimeHours: data.updatedHours
        });
        setShowHackatimeModal(false);
        setNewHackatimeProject('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add Hackatime project');
      }
    } catch {
      setError('Failed to add Hackatime project');
    } finally {
      setAddingHackatimeProject(false);
    }
  };

  const handleRemoveHackatimeProject = async (projectName: string, userId: string) => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/hackatime`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: projectName,
          userId: userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProject({
          ...project,
          hackatimeProjects: project.hackatimeProjects.filter(p => {
            if (typeof p === 'string') {
              return p !== projectName;
            } else {
              return !(p.projectName === projectName && p.userId === userId);
            }
          }),
          hackatimeHours: data.updatedHours
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove Hackatime project');
      }
    } catch {
      setError('Failed to remove Hackatime project');
    }
  };

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

  if (!settings?.ProjectsEnabled) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
          <p className="text-zinc-400">Projects functionality is currently disabled.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-48"></div>
          <div className="h-64 bg-zinc-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
          <p className="text-red-400 mb-4">{error || 'This project does not exist or you do not have access to it.'}</p>
          <Link
            href="/projects"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/projects"
            className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
            <FolderOpen className="w-4 h-4 text-[#7d82b8]" />
          </div>
          <h1 className="text-lg font-semibold text-white cursor-default">Project Details</h1>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{project.name}</h2>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created: {new Date(project.dateSubmitted).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {project.hackatimeHours} hours
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-3 py-1 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-zinc-600/50 rounded-lg transition-all text-zinc-400 hover:text-white"
            >
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
          {isEditing ? (
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors resize-none"
              placeholder="Enter project description..."
              rows={4}
            />
          ) : (
            <p className="text-zinc-400 leading-relaxed">
              {project.description || 'No description provided'}
            </p>
          )}
        </div>

        {/* Git Repository */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Git Repository</h3>
          {isEditing ? (
            <input
              type="url"
              value={editedGitRepo}
              onChange={(e) => setEditedGitRepo(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
              placeholder="https://github.com/username/repo"
            />
          ) : (
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-zinc-400" />
              {project.gitRepo ? (
                <a
                  href={project.gitRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7d82b8] hover:text-[#7d82b8]/80 transition-colors"
                >
                  {project.gitRepo}
                </a>
              ) : (
                <span className="text-zinc-400">No repository added</span>
              )}
            </div>
          )}
        </div>

        {/* Rejection Reason (if rejected) */}
        {project.status === 'Rejected' && project.rejectionReason && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Rejection Reason</h3>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">{project.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Hackatime Projects */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Hackatime Projects</h3>
            <button
              onClick={() => setShowHackatimeModal(true)}
              className="flex items-center space-x-2 px-3 py-1 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-lg transition-all text-[#7d82b8] hover:text-[#7d82b8]/80"
            >
              <Plus className="w-3 h-3" />
              <span>Link Project</span>
            </button>
          </div>
          
          {project.hackatimeProjects && project.hackatimeProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {project.hackatimeProjects.map((hackatimeProject) => {
                const projectName = typeof hackatimeProject === 'string' ? hackatimeProject : hackatimeProject.projectName;
                const userName = typeof hackatimeProject === 'string' ? null : hackatimeProject.userName;
                const userId = typeof hackatimeProject === 'string' ? null : hackatimeProject.userId;
                const key = typeof hackatimeProject === 'string' ? projectName : `${projectName}-${userId}`;
                
                return (
                  <div key={key} className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-zinc-300 font-medium">{projectName}</span>
                      {userName && (
                        <span className="text-zinc-500 text-sm">({userName})</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveHackatimeProject(projectName, userId || '')}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No Hackatime projects linked. Add project names to track hours automatically!</p>
            </div>
          )}
        </div>

        {/* Devlogs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Development Logs</h3>
            <button
              onClick={() => setShowDevlogModal(true)}
              className="flex items-center space-x-2 px-3 py-1 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-lg transition-all text-[#7d82b8] hover:text-[#7d82b8]/80"
            >
              <Plus className="w-3 h-3" />
              <span>Add Devlog</span>
            </button>
          </div>
          
          {project.devlogs && project.devlogs.length > 0 ? (
            <div className="space-y-4">
              {project.devlogs.map((devlog) => (
                <div key={devlog.id} className="bg-zinc-800/30 rounded-lg border border-zinc-700/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">
                      {devlog.author} • {new Date(devlog.timestamp).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-1">
                      <FileText className="w-3 h-3 text-zinc-400" />
                    </div>
                  </div>
                  <p className="text-zinc-300 mb-3 leading-relaxed">{devlog.content}</p>
                  {devlog.imageUrl && (
                    <div className="mt-3">
                      <img
                        src={devlog.imageUrl}
                        alt="Devlog attachment"
                        className="max-w-full h-auto rounded-lg border border-zinc-700/30"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No development logs yet. Add your first devlog to track progress!</p>
            </div>
          )}
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-700/30">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedDescription(project.description);
                setEditedGitRepo(project.gitRepo || '');
              }}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#7d82b8] border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Add Hackatime Project Modal */}
      {showHackatimeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Link Hackatime Project</h2>
              <button 
                onClick={() => setShowHackatimeModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Hackatime Project Name*
                </label>
                <input
                  type="text"
                  value={newHackatimeProject}
                  onChange={(e) => setNewHackatimeProject(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
                  placeholder="Enter exact project name from Hackatime"
                  maxLength={50}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  This should match exactly with your project name on Hackatime
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowHackatimeModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHackatimeProject}
                  disabled={!newHackatimeProject.trim() || addingHackatimeProject}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingHackatimeProject ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#7d82b8] border-t-transparent rounded-full animate-spin"></div>
                      <span>Linking...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Link Project</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Devlog Modal */}
      {showDevlogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Add Development Log</h2>
              <button 
                onClick={() => setShowDevlogModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Content*
                </label>
                <textarea
                  value={devlogContent}
                  onChange={(e) => setDevlogContent(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors resize-none"
                  placeholder="What did you work on today?"
                  rows={4}
                  maxLength={500}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={devlogImageUrl}
                  onChange={(e) => setDevlogImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Tip: Use #cdn on Slack to upload images and get shareable links
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowDevlogModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDevlog}
                  disabled={!devlogContent.trim() || addingDevlog}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingDevlog ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#7d82b8] border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Devlog</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}