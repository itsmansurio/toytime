import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken, setUnauthorizedHandler, type AppConfig } from './api';
import { storage } from './storage';
import { registerForPush } from './push';

const KEY = 'toytime.token';

interface Session {
  ready: boolean;
  signedIn: boolean;
  config: AppConfig | null;
  signIn: () => Promise<void>;
  revokeConsent: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const signOutLocal = useCallback(async () => {
    setToken(null);
    await storage.remove(KEY);
    setSignedIn(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { signOutLocal(); });
    (async () => {
      const saved = await storage.get(KEY);
      if (saved) {
        setToken(saved);
        setSignedIn(true);
      }
      setReady(true);
      api.config().then(setConfig).catch(() => {});
    })();
  }, [signOutLocal]);

  // Вызывается только после того, как пользователь отметил согласие.
  const signIn = useCallback(async () => {
    const { token } = await api.createSession();
    setToken(token);
    await storage.set(KEY, token);
    setSignedIn(true);
    registerForPush().then((pushToken) => { if (pushToken) api.updateMe({ pushToken }).catch(() => {}); });
    api.config().then(setConfig).catch(() => {});
  }, []);

  const revokeConsent = useCallback(async () => {
    await api.deleteMe();
    await signOutLocal();
  }, [signOutLocal]);

  return (
    <SessionContext.Provider value={{ ready, signedIn, config, signIn, revokeConsent }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession вне SessionProvider');
  return ctx;
}
