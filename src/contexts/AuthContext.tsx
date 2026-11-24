import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AdminUser } from '../types/database';

export const POST_OAUTH_HASH_KEY = 'veluna_post_oauth_hash';

const UNAUTHORIZED_ADMIN_ERROR =
  'Este e-mail não possui permissão de administradora na Veluna Cosméticos.';
const SUPABASE_MISSING_ERROR =
  'Supabase ainda não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.';
const ADMIN_LOGIN_DOMAIN = 'veluna.nexusistemas.app.br';

export function normalizeAdminIdentifier(rawInput: string): string {
  const cleaned = rawInput.trim().toLowerCase();
  if (!cleaned) return '';
  return cleaned.includes('@') ? cleaned : `${cleaned}@${ADMIN_LOGIN_DOMAIN}`;
}

export function cleanOAuthUrlParams(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.has('code') || params.has('error') || params.has('error_description')) {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  }
}

interface AuthActionResult {
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  adminProfile: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithSocial: (provider: 'google' | 'apple', targetHashRoute?: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de acessar o painel.';
  }
  if (lower.includes('password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Este provedor de login ainda não está habilitado no Supabase Auth.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const mountedRef = useRef(true);

  const syncSessionAndRole = useCallback(async (nextSession: Session | null): Promise<AdminUser | null> => {
    if (!nextSession?.user) {
      if (mountedRef.current) {
        setSession(null);
        setAdminProfile(null);
      }
      return null;
    }

    const { data, error } = await supabase.from('admin_users').select('*').limit(1);
    const adminRow = !error && Array.isArray(data) && data.length > 0 ? (data[0] as AdminUser) : null;

    if (mountedRef.current) {
      setSession(nextSession);
      setAdminProfile(adminRow);
    }
    return adminRow;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let initialized = false;
    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await syncSessionAndRole(data.session);
        if (data.session) cleanOAuthUrlParams();
      } finally {
        initialized = true;
        if (mountedRef.current) setLoading(false);
      }
    };
    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (event === 'SIGNED_IN' || nextSession) cleanOAuthUrlParams();
        void syncSessionAndRole(nextSession).finally(() => {
          if (initialized && mountedRef.current) setLoading(false);
        });
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, [syncSessionAndRole]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured) return { error: SUPABASE_MISSING_ERROR };
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeAdminIdentifier(email),
        password,
      });
      if (error || !data.session) {
        return { error: translateAuthError(error?.message ?? 'Não foi possível entrar.') };
      }
      const adminRow = await syncSessionAndRole(data.session);
      if (!adminRow) {
        await supabase.auth.signOut();
        if (mountedRef.current) {
          setSession(null);
          setAdminProfile(null);
        }
        return { error: UNAUTHORIZED_ADMIN_ERROR };
      }
      return { error: null };
    },
    [syncSessionAndRole],
  );

  const signInWithSocial = useCallback(
    async (provider: 'google' | 'apple', targetHashRoute = '/minha-conta'): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured) return { error: SUPABASE_MISSING_ERROR };
      try {
        localStorage.setItem(POST_OAUTH_HASH_KEY, targetHashRoute);
      } catch {
        // Ignora ambientes sem localStorage
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) {
        try {
          localStorage.removeItem(POST_OAUTH_HASH_KEY);
        } catch {
          // Ignora
        }
        return { error: translateAuthError(error.message) };
      }
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    if (mountedRef.current) {
      setSession(null);
      setAdminProfile(null);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) return { error: SUPABASE_MISSING_ERROR };
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeAdminIdentifier(email), {
      redirectTo: `${window.location.origin}/#/painel/redefinir-senha`,
    });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) return { error: SUPABASE_MISSING_ERROR };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const user = session?.user ?? null;
  const isAdmin = Boolean(user && adminProfile);

  return (
    <AuthContext.Provider
      value={{
        session, user, adminProfile, isAdmin, loading,
        signIn, signInWithSocial, signOut, sendPasswordReset, updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return ctx;
}
