import { useChatStore } from '@/store/useChatStore';

export function useChat() {
  const { isPremium, isBanned, setPremium, setBanned } = useChatStore();
  
  return {
    isPremium,
    isBanned,
    setPremium,
    setBanned
  };
}
