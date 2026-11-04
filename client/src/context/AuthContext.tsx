import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { networkFetch } from '../lib/api';
import { db } from '../lib/db';

export interface User {
  id: string;
  email: string;
  name: string;
  settings: { dailyGoal: number; remindersEnabled: boolean };
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('trackit_token'),
  );
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('trackit_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('trackit_token');
      localStorage.removeItem('trackit_user');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('trackit:unauthorized', onUnauthorized);
    return () =>
      window.removeEventListener('trackit:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (token) {
      networkFetch('GET', '/auth/me')
        .then((d) => {
          if (cancelled) return;
          setUser(d.user);
          localStorage.setItem('trackit_user', JSON.stringify(d.user));
        })
        .catch(() => {
          /* offline or expired - keep the local user for offline use */
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  const persist = (t: string, u: User) => {
    localStorage.setItem('trackit_token', t);
    localStorage.setItem('trackit_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const d = await networkFetch('POST', '/auth/login', { email, password });
    persist(d.token, d.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const d = await networkFetch('POST', '/auth/register', {
      name,
      email,
      password,
    });
    persist(d.token, d.user);
  };

  const logout = () => {
    localStorage.removeItem('trackit_token');
    localStorage.removeItem('trackit_user');
    setToken(null);
    setUser(null);
    // Clear cached data so another account doesn't see the previous user's data.
    void db.cache.clear();
    void db.pendingOps.clear();
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((u) => {
      const next = u ? { ...u, ...patch } : (patch as User);
      localStorage.setItem('trackit_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <Ctx.Provider
      value={{ user, token, loading, login, register, logout, updateUser }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
