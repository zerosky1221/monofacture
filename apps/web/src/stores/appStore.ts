import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  activeSheet: string | null;
  sheetData: unknown;
  openSheet: (name: string, data?: unknown) => void;
  closeSheet: () => void;

  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: navigator.onLine,
  setOnline: (isOnline) => set({ isOnline }),

  activeSheet: null,
  sheetData: null,
  openSheet: (name, data) => set({ activeSheet: name, sheetData: data }),
  closeSheet: () => set({ activeSheet: null, sheetData: null }),

  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useAppStore.getState().setOnline(true));
  window.addEventListener('offline', () => useAppStore.getState().setOnline(false));
}
