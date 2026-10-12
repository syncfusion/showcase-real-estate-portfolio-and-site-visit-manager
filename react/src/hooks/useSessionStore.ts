import { useState, useEffect } from 'react';
import { sessionStore } from '@/services/sessionStore';
import { SessionState } from '@/domain/types';

export function useSessionStore(): {
  state: SessionState;
  resetToDemoData: () => void;
} {
  const [state, setState] = useState<SessionState>(() => sessionStore.getState());

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setState({ ...sessionStore.getState() });
    });
    return unsubscribe;
  }, []);

  return {
    state,
    resetToDemoData: () => sessionStore.resetToDemoData()
  };
}
