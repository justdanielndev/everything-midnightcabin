'use client';

import { useEffect, useState } from 'react';
import { Users, Star, UserMinus, Trophy, Wrench, Lock, Globe, Mail, Plus, UserPlus, Search, Clock, X } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  slackName: string;
  xp: number;
}

interface JoinRequest {
  id: string;
  name: string;
  slackName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Team {
  id: string;
  teamId: string;
  name: string;
  teamSize: number;
  members: TeamMember[];
  projects: string[];
  joinRequests: JoinRequest[];
  type: 'Public' | 'Private' | 'Ask for invite';
  totalXP: number;
}

export function TeamsContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState<'Public' | 'Private' | 'Ask for invite'>('Public');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, teamsRes] = await Promise.all([
          fetch('/api/user/me'),
          fetch('/api/teams')
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.authenticated && userData.user) {
            setUser(userData.user);
            
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json();
            
              if (userData.user.teamId) {
                const userTeam = teamsData.teams.find((t: any) => t.teamId === userData.user.teamId);
                
                if (userTeam) {
                  const totalXP = userTeam.members.reduce((sum: number, member: TeamMember) => sum + member.xp, 0);
                  
                  const team: Team = {
                    id: userTeam.id,
                    teamId: userTeam.teamId,
                    name: userTeam.name,
                    teamSize: userTeam.teamSize,
                    members: userTeam.members,
                    projects: userTeam.projects,
                    joinRequests: userTeam.joinRequests || [],
                    type: userTeam.type,
                    totalXP: totalXP
                  };
                  setTeam(team);
                }
              } else {
                const joinableTeams = teamsData.teams
                  .filter((t: any) => t.type === 'Public' || t.type === 'Ask for invite')
                  .map((t: any) => ({
                    id: t.id,
                    teamId: t.teamId,
                    name: t.name,
                    teamSize: t.teamSize,
                    members: t.members,
                    projects: t.projects,
                    joinRequests: t.joinRequests || [],
                    type: t.type,
                    totalXP: t.members.reduce((sum: number, member: TeamMember) => sum + member.xp, 0)
                  }));
                setAvailableTeams(joinableTeams);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRequestStatus = (team: Team): 'none' | 'pending' | 'rejected' => {
    if (!user?.id) return 'none';
    const request = team.joinRequests.find(req => req.id === user.id);
    if (!request) return 'none';
    return request.status === 'rejected' ? 'rejected' : 'pending';
  };

  const filteredTeams = availableTeams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave your team? This action cannot be undone.')) {
      return;
    }

    setIsLeavingTeam(true);
    try {
      const response = await fetch('/api/teams/leave', { method: 'POST' });
      if (response.ok) {
        setTeam(null);
        setUser({ ...user, teamId: null, teamName: 'No Team Assigned' });
        alert('Successfully left the team!');
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to leave team: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error leaving team:', error);
      alert('Failed to leave team. Please try again.');
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleJoinTeam = async (teamId: string, teamType: string) => {
    const team = availableTeams.find(t => t.teamId === teamId);
    if (!team) return;
    
    const requestStatus = getRequestStatus(team);
    if (requestStatus === 'pending') {
      alert('You already have a pending request for this team.');
      return;
    }
    
    setIsJoiningTeam(teamId);
    try {
      const endpoint = teamType === 'Ask for invite' ? '/api/teams/request' : '/api/teams/join';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });
      
      if (response.ok) {
        const message = teamType === 'Ask for invite' ? 'Join request sent successfully!' : 'Successfully joined the team!';
        alert(message);
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to ${teamType === 'Ask for invite' ? 'send join request' : 'join team'}: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error with team action:', error);
      alert(`Failed to ${teamType === 'Ask for invite' ? 'send join request' : 'join team'}. Please try again.`);
    } finally {
      setIsJoiningTeam(null);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      alert('Please enter a team name.');
      return;
    }

    setIsCreatingTeam(true);
    try {
      const response = await fetch('/api/teams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamName: newTeamName.trim(), 
          teamType: newTeamType 
        })
      });
      
      if (response.ok) {
        alert('Team created successfully!');
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to create team: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team. Please try again.');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleProjectClick = async (projectName: string) => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projectsData = await response.json();
        const project = projectsData.projects.find((p: any) => 
          p.name === projectName && p.teamId === team?.teamId
        );
        if (project) {
          window.location.href = `/projects/${project.id}`;
        }
      }
    } catch (error) {
      console.error('Error finding project:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
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

  if (!team || !user?.teamId) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
                <Plus className="w-4 h-4 text-[#7d82b8]" />
              </div>
              <h3 className="text-lg font-semibold text-white cursor-default">Create a Team</h3>
            </div>
            <button
              onClick={() => setShowCreateTeam(!showCreateTeam)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80"
            >
              <Plus className="w-4 h-4" />
              <span>Create Team</span>
            </button>
          </div>
          
          {showCreateTeam && (
            <div className="bg-zinc-800/30 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Team Type</label>
                <select
                  value={newTeamType}
                  onChange={(e) => setNewTeamType(e.target.value as 'Public' | 'Private' | 'Ask for invite')}
                  className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600/50 rounded-lg text-white focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
                >
                  <option value="Public">Public - Anyone can join</option>
                  <option value="Ask for invite">Ask for invite - Requires approval</option>
                  <option value="Private">Private - Invite only</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCreateTeam}
                  disabled={isCreatingTeam || !newTeamName.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-lg transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingTeam ? 'Creating...' : 'Create Team'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateTeam(false);
                    setNewTeamName('');
                    setNewTeamType('Public');
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
                <Users className="w-4 h-4 text-[#7d82b8]" />
              </div>
              <h3 className="text-lg font-semibold text-white cursor-default">Available Teams</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-[#7d82b8]/50 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((availableTeam) => {
                const requestStatus = getRequestStatus(availableTeam);
                return (
                <div key={availableTeam.id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-[#7d82b8]/10 rounded-lg">
                      {availableTeam.type === 'Private' && <Lock className="w-5 h-5 text-red-400" />}
                      {availableTeam.type === 'Public' && <Globe className="w-5 h-5 text-green-400" />}
                      {availableTeam.type === 'Ask for invite' && <Mail className="w-5 h-5 text-blue-400" />}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{availableTeam.name}</h4>
                      <p className="text-zinc-400 text-sm">{availableTeam.teamSize} members • {availableTeam.totalXP.toLocaleString()} XP</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      availableTeam.type === 'Public' ? 'hidden' :
                      availableTeam.type === 'Ask for invite' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {availableTeam.type}
                    </span>
                    
                    {requestStatus === 'rejected' && (
                      <span className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                        <X className="w-3 h-3" />
                        <span>Request Rejected</span>
                      </span>
                    )}
                    
                    <button
                      onClick={() => handleJoinTeam(availableTeam.teamId, availableTeam.type)}
                      disabled={isJoiningTeam === availableTeam.teamId || requestStatus === 'pending'}
                      className="flex items-center space-x-2 px-4 py-2 bg-[#7d82b8]/20 hover:bg-[#7d82b8]/30 border border-[#7d82b8]/30 hover:border-[#7d82b8]/50 rounded-xl transition-all text-[#7d82b8] hover:text-[#7d82b8]/80 disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isJoiningTeam === availableTeam.teamId ? 'Joining...' : 
                         requestStatus === 'pending' ? 'Requested' :
                         requestStatus === 'rejected' ? 'Request Again' :
                         availableTeam.type === 'Ask for invite' ? 'Request' : 'Join'}
                      </span>
                    </button>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{searchTerm ? 'No teams match your search' : 'No teams available to join'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
              <Users className="w-4 h-4 text-[#7d82b8]" />
            </div>
            <h3 className="text-lg font-semibold text-white cursor-default">Team Overview</h3>
          </div>
          <button
            onClick={handleLeaveTeam}
            disabled={isLeavingTeam}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-xl transition-all text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            <UserMinus className="w-4 h-4" />
            <span>{isLeavingTeam ? 'Leaving...' : 'Leave Team'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="text-white font-medium">Team Name</h4>
            </div>
            <p className="text-2xl font-bold text-[#7d82b8]">{team.name}</p>
          </div>

          <div className="bg-zinc-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="text-white font-medium">Type</h4>
            </div>
            <p className="text-2xl font-bold text-[#7d82b8]">{team.type}</p>
          </div>

          <div className="bg-zinc-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="text-white font-medium">Total XP</h4>
            </div>
            <p className="text-2xl font-bold text-[#7d82b8]">{team.totalXP.toLocaleString()}</p>
          </div>

          <div className="bg-zinc-800/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="text-white font-medium">Members</h4>
            </div>
            <p className="text-2xl font-bold text-[#7d82b8]">{team.teamSize}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
            <Wrench className="w-4 h-4 text-[#7d82b8]" />
          </div>
          <h3 className="text-lg font-semibold text-white cursor-default">Projects</h3>
        </div>
        
        <div className="space-y-3">
          {team.projects.map((project, index) => (
            <div 
              key={index} 
              className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30 hover:border-[#7d82b8]/30 hover:bg-[#7d82b8]/5 transition-all cursor-pointer"
              onClick={() => handleProjectClick(project)}
            >
              <h4 className="text-white font-medium">{project}</h4>
              <p className="text-zinc-400 text-sm mt-1">Active project</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
            <Users className="w-4 h-4 text-[#7d82b8]" />
          </div>
          <h3 className="text-lg font-semibold text-white cursor-default">Team Members</h3>
        </div>
        
        <div className="space-y-3">
          {team.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-[#7d82b8]/10 rounded-lg">
                  <Users className="w-4 h-4 text-[#7d82b8]" />
                </div>
                <div>
                  <h4 className="text-white font-medium">{member.name}</h4>
                  <p className="text-zinc-400 text-sm">@{member.slackName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#7d82b8] font-medium">{member.xp.toLocaleString()} XP</p>
                <p className="text-zinc-400 text-xs">Experience Points</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}