import React, {useContext} from 'react';
import {useNavigate} from 'react-router-dom';
import {authService} from '../services/auth';
import {ThemeContext} from '../App';
import {Sun, Moon, Laptop} from 'lucide-react';
import Logo from '../components/Logo';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';


/**
 * Login Page
 *
 * Entry point for unauthenticated users.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const {theme, setTheme} = useContext(ThemeContext);

  const handleGoogleLogin = () => {
    const authUrl = authService.getGoogleAuthUrl();
    navigate(authUrl);
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={20}/>;
      case 'dark':
        return <Moon size={20}/>;
      case 'system':
        return <Laptop size={20}/>;
    }
  };

  // The Login page requires a centered layout that takes up the full viewport.
  return (
    <Page className="min-h-screen flex flex-col items-center justify-center relative w-full p-4 transition-colors">

      {/* Theme Toggle - Positioned absolutely outside the Panel */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={cycleTheme}
          className="p-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
        >
          {getThemeIcon()}
        </button>
      </div>

      <Panel
        title=""
        className="w-full max-w-sm text-center"
      >
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <Logo className="w-16 h-16 drop-shadow-md"/>
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
      </Panel>
    </Page>
  );
};

export default Login;