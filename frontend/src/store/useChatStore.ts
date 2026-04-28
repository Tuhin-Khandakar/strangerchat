import { create } from 'zustand';

interface ChatState {
  isPremium: boolean;
  isBanned: boolean;
  setPremium: (val: boolean) => void;
  setBanned: (val: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isPremium: false,
  isBanned: false,
  setPremium: (val) => set({ isPremium: val }),
  setBanned: (val) => set({ isBanned: val }),
}));
