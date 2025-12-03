import React, { useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../App';
import { authService } from '../services/auth';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  
  // Ref to ensure effect runs only once (handles StrictMode double-invocation)
  // In development, React 18+ mounts components twice. This ref prevents sending the auth code twice.
  const processingRef = useRef(false);

  useEffect(() => {
    const processLogin = async () => {
      // Prevent double-execution
      if (processingRef.current) return;
      processingRef.current = true;

      const code = searchParams.get('code');
      
      if (!code) {
        navigate('/login');
        return;
      }

      try {
        // Exchange code for token
        const response = await authService.exchangeCodeForToken(code);
        
        // Securely log in (store token in memory via Context)
        login(response.user, response.token);
        
        // Redirect to dashboard
        // Use replace: true to replace the /auth/callback entry in history to prevent back-button loops
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Login failed', error);
        // Only alert if we really failed, not if it was a duplicate call ignored
        // (Though the ref prevents duplicate calls reaching here)
        alert('Authentication failed. Please try again.');
        navigate('/login', { replace: true });
      }
    };

    processLogin();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" size={32} />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Authenticating...</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Verifying credentials with Google</p>
      </div>
    </div>
  );
};

export default AuthCallback;