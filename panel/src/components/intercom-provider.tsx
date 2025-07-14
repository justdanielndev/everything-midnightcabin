'use client';

import { useEffect } from 'react';
import Intercom from '@intercom/messenger-js-sdk';

interface IntercomProviderProps {
  children: React.ReactNode;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userCreatedAt?: number;
  userXp?: number;
  userTeamId?: string;
  jwtToken?: string;
}

export function IntercomProvider({
  children,
  userId,
  userName,
  userEmail,
  userCreatedAt,
  userXp,
  userTeamId,
  jwtToken,
}: IntercomProviderProps) {
  useEffect(() => {


    if (userId && userEmail && jwtToken) {
      Intercom({
        app_id: 'aoquozt9',
        intercom_user_jwt: jwtToken,
        hackathon_xp: userXp,
        team_id: userTeamId,
        user_type: 'hackathon_participant',
        session_duration: 86400000,
      });
    } else {
    }
  }, [jwtToken, userId, userName, userEmail, userCreatedAt, userXp, userTeamId]);

  return <>{children}</>;
}