import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface NotificationState {
  enabled: boolean;
  reminderTime: string;
  lastSmartAlertAt: Record<string, string>;
  setEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  markSmartAlertTriggered: (alertId: string, dateIso: string) => void;
  resetSmartAlertHistory: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      reminderTime: '19:00',
      lastSmartAlertAt: {},
      setEnabled: (enabled) => set({ enabled }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
      markSmartAlertTriggered: (alertId, dateIso) =>
        set((state) => ({
          lastSmartAlertAt: {
            ...state.lastSmartAlertAt,
            [alertId]: dateIso,
          },
        })),
      resetSmartAlertHistory: () => set({ lastSmartAlertAt: {} }),
    }),
    {
      name: 'fargo-climb-notifications',
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
