import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface NotificationState {
  enabled: boolean;
  reminderTime: string;
  setEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      reminderTime: '19:00',
      setEnabled: (enabled) => set({ enabled }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
    }),
    {
      name: 'fargo-climb-notifications',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
