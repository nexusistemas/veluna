import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cleanOAuthUrlParams,
  POST_OAUTH_HASH_KEY,
  useAuth,
} from '../../contexts/AuthContext';

export default function OAuthRedirectListener() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session) return;
    cleanOAuthUrlParams();

    let savedHash: string | null = null;
    try {
      savedHash = localStorage.getItem(POST_OAUTH_HASH_KEY);
      if (savedHash) localStorage.removeItem(POST_OAUTH_HASH_KEY);
    } catch {
      savedHash = null;
    }

    if (savedHash && savedHash.startsWith('/')) {
      navigate(savedHash, { replace: true });
    }
  }, [session, loading, navigate]);

  return null;
}
