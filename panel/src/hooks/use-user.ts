'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name?: string;
  email?: string;
  createdAt?: number;
  xp?: number;
  teamId?: string;
  token?: string;
}

export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/user/me')
      .then(res => {
        return res.json();
      })
      .then(data => {
        if (data.authenticated && data.user) {
          if (!data.user.id) {
            console.error('Missing required user data (ID) from Slack/Notion, logging out');
            document.cookie = 'slack_user_id=; Max-Age=0; path=/';
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
            return;
          }
          
          fetch('/api/intercom/token')
            .then(res => res.json())
            .then(tokenData => {
              
              const userData = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                createdAt: data.user.createdAt,
                xp: tokenData.user?.xp || 0,
                teamId: tokenData.user?.teamId || '',
                token: tokenData.token,
              };
              setUser(userData);
            })
            .catch(error => {
              console.error('Error getting JWT token (non-fatal):', error);
              const userData = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                createdAt: data.user.createdAt,
                xp: data.user.xp || 0,
                teamId: data.user.teamId || '',
                token: undefined,
              };
              setUser(userData);
            });
        } else {
          document.cookie = 'slack_user_id=; Max-Age=0; path=/';
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
        setUser(null);
      });
  }, []);

  return user;
}