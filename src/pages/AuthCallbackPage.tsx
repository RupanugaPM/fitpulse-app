import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const handleOAuthToken = useAuthStore((s) => s.handleOAuthToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('No authentication token received');
      return;
    }
    handleOAuthToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('Failed to complete sign in'));
  }, [params, handleOAuthToken, navigate]);

  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      {error ? (
        <>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <a href="/login">Back to login</a>
        </>
      ) : (
        <p>Signing you in…</p>
      )}
    </div>
  );
}
