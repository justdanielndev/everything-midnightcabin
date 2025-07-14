'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';

interface SettingsGuardProps {
  children: React.ReactNode;
  requiredSetting: keyof ReturnType<typeof useSettings>['settings'];
}

export function SettingsGuard({ children, requiredSetting }: SettingsGuardProps) {
  const { settings, loading } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !settings[requiredSetting]) {
      router.push('/dashboard');
    }
  }, [loading, settings, requiredSetting, router]);

  if (loading) {
    return <>{children}</>;
  }

  if (!settings[requiredSetting]) {
    return null;
  }

  return <>{children}</>;
}