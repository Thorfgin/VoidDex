import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateItem from './pages/CreateItem';
import RechargeItem from './pages/RechargeItem';
import AssignItem from './pages/AssignItem';
import CreateCondition from './pages/CreateCondition';
import ExtendCondition from './pages/ExtendCondition';
import AssignCondition from './pages/AssignCondition';
import CreatePower from './pages/CreatePower';
import ExtendPower from './pages/ExtendPower';
import AssignPower from './pages/AssignPower';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import DeepLinkHandler from './pages/DeepLinkHandler';
import Scanner from './pages/Scanner';
import StoredChanges from './pages/StoredChanges';
import MyNotes from './pages/MyNotes';
import CreateNote from './pages/CreateNote';
import { resetData } from './services/api';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppThemeId = 'futura' | 'modern' | 'historic';

interface ThemeColorSet {
  colItem: string;
  colCondition: string;
  colPower: string;
  colNote: string;
  colDraft: string;
}

interface ThemeProperties {
  label: string;
  primaryHex: string;
  primaryRgb: string;
  fontDisplay: string;
  fontBody: string;
  radiusBtn: string;
  btnPx: string;
  btnPy: string;
  appScale: string;
  colors: {
    light: ThemeColorSet;
    dark: ThemeColorSet;
  };
}

export const THEME_PRESETS: Record<AppThemeId, ThemeProperties> = {
  futura: {
    label: 'Futura',
    primaryHex: '#8B0000',
    primaryRgb: '139 0 0',
    fontDisplay: "'Orbitron', sans-serif",
    fontBody: "'Exo 2', sans-serif",
    radiusBtn: '0.375rem',
    btnPx: '1rem',
    btnPy: '0.375rem',
    appScale: '100%',
    colors: {
      light: {
        colItem: '13 148 136',      // Teal 600
        colCondition: '147 51 234', // Purple 600
        colPower: '234 88 12',      // Orange 600
        colNote: '202 138 4',       // Yellow 600
        colDraft: '37 99 235'       // Blue 600
      },
      dark: {
        colItem: '45 212 191',      // Teal 400
        colCondition: '192 132 252', // Purple 400
        colPower: '251 146 60',      // Orange 400
        colNote: '250 204 21',       // Yellow 400
        colDraft: '96 165 250'       // Blue 400
      }
    }
  },
  modern: {
    label: 'Modern',
    primaryHex: '#475569', // Slate 600
    primaryRgb: '71 85 105',
    fontDisplay: "'Cinzel', serif",
    fontBody: "'Merriweather', serif",
    radiusBtn: '0.75rem',
    btnPx: '1rem',
    btnPy: '0.375rem',
    appScale: '95%',
    colors: {
      light: {
        colItem: '71 85 105',      // Slate 600
        colCondition: '71 85 105',
        colPower: '71 85 105',
        colNote: '71 85 105',
        colDraft: '71 85 105'
      },
      dark: {
        colItem: '148 163 184',    // Slate 400
        colCondition: '148 163 184',
        colPower: '148 163 184',
        colNote: '148 163 184',
        colDraft: '148 163 184'
      }
    }
  },
  historic: {
    label: 'Historic',
    primaryHex: '#78350F', // Leather Brown
    primaryRgb: '120 53 15',
    fontDisplay: "'MedievalSharp', cursive",
    fontBody: "'Crimson Text', serif",
    radiusBtn: '0.25rem',
    btnPx: '1rem',
    btnPy: '0.375rem',
    appScale: '105%',
    colors: {
      light: {
        colItem: '63 98 18',      // Moss Green (lime-800)
        colCondition: '127 29 29', // Dried Blood (red-900)
        colPower: '180 83 9',      // Amber/Gold (amber-700)
        colNote: '113 63 18',      // Sepia (yellow-900)
        colDraft: '55 48 163'      // Indigo Ink (indigo-800)
      },
      dark: {
        colItem: '132 204 22',     // Bright Moss (lime-500)
        colCondition: '248 113 113', // Faded Red (red-400)
        colPower: '251 191 36',    // Bright Amber (amber-400)
        colNote: '250 204 21',     // Bright Sepia (yellow-400)
        colDraft: '129 140 248'    // Bright Indigo (indigo-400)
      }
    }
  }
};

// --- CONTEXT DEFINITIONS ---
export const AuthContext = React.createContext<{
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const ThemeContext = React.createContext<{
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  appTheme: AppThemeId;
  setAppTheme: (id: AppThemeId) => void;
}>({
  theme: 'system',
  setTheme: () => {},
  appTheme: 'modern', // Default to modern
  setAppTheme: () => {},
});

const App: React.FC = () => {
  // --- STATE INITIALIZATION ---
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('voiddex_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [token, setToken] = useState<string | null>(() => {
    const savedUser = localStorage.getItem('voiddex_user');
    if (!savedUser) return null; 
    return localStorage.getItem('voiddex_token');
  });
  
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as ThemeMode;
    }
    return 'system';
  });

  const [appTheme, setAppTheme] = useState<AppThemeId>(() => {
    const saved = localStorage.getItem('appTheme');
    if (saved === 'futura' || saved === 'modern' || saved === 'historic') {
      return saved as AppThemeId;
    }
    return 'modern'; // Default to modern if not set
  });

  // Track resolved dark mode state to apply correct RGB values
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- EFFECTS ---

  useEffect(() => {
    if (!user) {
        localStorage.removeItem('voiddex_user');
        localStorage.removeItem('voiddex_token');
        resetData(); 
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('voiddex_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('voiddex_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('voiddex_token', token);
    } else {
      localStorage.removeItem('voiddex_token');
    }
  }, [token]);

  // Apply Theme (Light/Dark)
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('theme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setIsDarkMode(isDark);
    };

    applyTheme();

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  // Apply App Theme (Fonts, Colors, Radii)
  useEffect(() => {
    const root = document.documentElement;
    const props = THEME_PRESETS[appTheme];
    
    localStorage.setItem('appTheme', appTheme);

    // Update CSS Variables
    root.style.setProperty('--color-primary', props.primaryRgb);
    root.style.setProperty('--font-display', props.fontDisplay);
    root.style.setProperty('--font-body', props.fontBody);
    root.style.setProperty('--radius-btn', props.radiusBtn);
    root.style.setProperty('--btn-px', props.btnPx);
    root.style.setProperty('--btn-py', props.btnPy);
    root.style.setProperty('--app-scale', props.appScale);
    
    // Select color set based on resolved mode
    const colors = isDarkMode ? props.colors.dark : props.colors.light;

    // Update Entity Colors
    root.style.setProperty('--color-item', colors.colItem);
    root.style.setProperty('--color-condition', colors.colCondition);
    root.style.setProperty('--color-power', colors.colPower);
    root.style.setProperty('--color-note', colors.colNote);
    root.style.setProperty('--color-draft', colors.colDraft);

    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', props.primaryHex);
    }
  }, [appTheme, isDarkMode]);

  // --- ACTIONS ---

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('voiddex_user');
    localStorage.removeItem('voiddex_token');
    resetData();
    setUser(null);
    setToken(null);
  }, []);

  // --- INACTIVITY TIMER ---
  useEffect(() => {
    if (!user) return; 

    const TIMEOUT_MS = 5 * 60 * 1000; 
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleInactive = () => {
      logout();
      alert("You have been logged out due to inactivity (5 minutes).");
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleInactive, TIMEOUT_MS);
    };

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, appTheme, setAppTheme }}>
      <AuthContext.Provider value={{ user, token, login, logout }}>
        <div className="min-h-screen flex flex-col transition-colors duration-200 font-serif">
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-2">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/scan" element={user ? <Scanner /> : <Navigate to="/login" />} />
              <Route path="/stored-changes" element={user ? <StoredChanges /> : <Navigate to="/login" />} />
              <Route path="/my-notes" element={user ? <MyNotes /> : <Navigate to="/login" />} />
              <Route path="/create-note" element={user ? <CreateNote /> : <Navigate to="/login" />} />
              <Route path="/create-item" element={user ? <CreateItem /> : <Navigate to="/login" />} />
              <Route path="/recharge-item" element={user ? <RechargeItem /> : <Navigate to="/login" />} />
              <Route path="/assign-item" element={user ? <AssignItem /> : <Navigate to="/login" />} />
              <Route path="/create-condition" element={user ? <CreateCondition /> : <Navigate to="/login" />} />
              <Route path="/extend-condition" element={user ? <ExtendCondition /> : <Navigate to="/login" />} />
              <Route path="/assign-condition" element={user ? <AssignCondition /> : <Navigate to="/login" />} />
              <Route path="/create-power" element={user ? <CreatePower /> : <Navigate to="/login" />} />
              <Route path="/extend-power" element={user ? <ExtendPower /> : <Navigate to="/login" />} />
              <Route path="/assign-power" element={user ? <AssignPower /> : <Navigate to="/login" />} />
              <Route path="/items/:id" element={user ? <DeepLinkHandler type="item" /> : <Navigate to="/login" />} />
              <Route path="/conditions/:id" element={user ? <DeepLinkHandler type="condition" /> : <Navigate to="/login" />} />
              <Route path="/powers/:id" element={user ? <DeepLinkHandler type="power" /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;