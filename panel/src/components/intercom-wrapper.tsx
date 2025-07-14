'use client';

import { IntercomProvider } from './intercom-provider';
import { useUser } from '@/hooks/use-user';

interface IntercomWrapperProps {
  children: React.ReactNode;
}

export function IntercomWrapper({ children }: IntercomWrapperProps) {
  const user = useUser();

  return (
    <IntercomProvider
      userId={user?.id}
      userName={user?.name}
      userEmail={user?.email}
      userCreatedAt={user?.createdAt}
      userXp={user?.xp}
      userTeamId={user?.teamId}
      jwtToken={user?.token}
    >
      {children}
    </IntercomProvider>
  );
}