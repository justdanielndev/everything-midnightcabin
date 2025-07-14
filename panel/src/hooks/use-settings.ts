'use client';

import { useEffect, useState } from 'react';

interface GlobalSettings {
  StoreEnabled: boolean;
  LeaderboardEnabled: boolean;
  NewsEnabled: boolean;
  EventsEnabled: boolean;
  TeamEnabled: boolean;
  ProjectsEnabled: boolean;
  VotingEnabled: boolean;
  [key: string]: string | boolean;
}

const defaultSettings: GlobalSettings = {
  StoreEnabled: true,
  LeaderboardEnabled: true,
  NewsEnabled: true,
  EventsEnabled: true,
  TeamEnabled: true,
  ProjectsEnabled: true,
  VotingEnabled: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('globalSettings');
      if (cached) {
        try {
          return { ...defaultSettings, ...JSON.parse(cached) };
        } catch (error) {
          console.error('Error parsing cached settings:', error);
        }
      }
    }
    return defaultSettings;
  });
  
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('globalSettings');
    }
    return true;
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          const newSettings = { ...defaultSettings, ...data.settings };
          setSettings(newSettings);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('globalSettings', JSON.stringify(data.settings));
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}