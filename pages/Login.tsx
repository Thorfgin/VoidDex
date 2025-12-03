import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { ThemeContext } from '../App';
import { Sun, Moon, Laptop } from 'lucide-react';
import Logo from '../components/Logo';

/**
 * Login Page
 *
 * Entry point for unauthenticated users.
 * Initiates the OAuth flow by redirecting to the provider's URL.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useContext(ThemeContext);

  const handleGoogleLogin = () => {
    // Get the Auth URL. In a real app, this is an external Google URL.
    // Here, our mock service returns a local path to /auth/callback with fake params.
    const authUrl = authService.getGoogleAuthUrl();

    // Redirect the user to initiate the flow
    navigate(authUrl);
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={20} />;
      case 'dark': return <Moon size={20} />;
      case 'system': return <Laptop size={20} />;
    }
  };

  return (
      <div className="min-h-[calc(100vh-1rem)] flex flex-col items-center justify-center transition-colors relative w-full">

        {/* Theme Toggle - Accessible on Login screen for comfort */}
        <div className="absolute top-0 right-0 p-2">
          <button
              onClick={cycleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
          >
            {getThemeIcon()}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm text-center border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex justify-center mb-4">
            <Logo className="w-16 h-16 drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white mb-2">VoidDex</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 font-serif text-sm">Sign in to manage inventory.</p>

          <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm font-serif text-sm"
          >
            <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
            />
            Sign in with Google
          </button>

          <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500 font-serif">
            This initiates a secure OAuth 2.0 flow.
          </p>
        </div>
      </div>
  );
};

export default Login;