import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import App, { THEME_PRESETS, AppThemeId } from './App';

// Mock resetData from services/api so we can assert calls & avoid touching real mock DB
jest.mock('./services/api', () => ({
  resetData: jest.fn(),
}));

const { resetData } = jest.requireMock('./services/api') as { resetData: jest.Mock };

// Simple localStorage mock (keeps it explicit and controllable per test file)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// matchMedia mock so the theme effect doesn't explode in jsdom
beforeAll(() => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),          // legacy API
    removeListener: jest.fn(),       // legacy API
    addEventListener: jest.fn(),     // modern API
    removeEventListener: jest.fn(),  // modern API
    dispatchEvent: jest.fn(),
  });
});

// Mock alert so inactivity timer doesn’t try to show a real alert
const originalAlert = window.alert;

jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Page</div>);

describe('App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    (resetData as jest.Mock).mockClear();
    window.alert = jest.fn();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  afterAll(() => {
    window.alert = originalAlert;
  });

  test('redirects to login when no user session exists', () => {
    localStorage.removeItem('voiddex_user');
    localStorage.removeItem('voiddex_token');

    const { getByText } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(getByText('Login Page')).toBeTruthy();
  });

  test('renders dashboard when user session exists', async () => {
    localStorage.setItem('voiddex_user', JSON.stringify({ id: '123', name: 'Test User' }));
    localStorage.setItem('voiddex_token', 'valid-token');

    const { findByText } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(await findByText('Dashboard Page')).toBeTruthy();
  });

  test('applies dark theme when localStorage theme is "dark"', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('voiddex_user', JSON.stringify({ id: '123', name: 'Test User' }));
    localStorage.setItem('voiddex_token', 'valid-token');

    render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('applies app theme CSS variables from localStorage appTheme', () => {
    const id: AppThemeId = 'historic';
    localStorage.setItem('appTheme', id);
    localStorage.setItem('voiddex_user', JSON.stringify({ id: '123', name: 'Test User' }));
    localStorage.setItem('voiddex_token', 'valid-token');

    render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    const preset = THEME_PRESETS[id];
    const rootStyle = getComputedStyle(document.documentElement);

    expect(rootStyle.getPropertyValue('--font-display').trim()).toBe(preset.fontDisplay);
    expect(rootStyle.getPropertyValue('--btn-px').trim()).toBe(preset.btnPx);
    expect(rootStyle.getPropertyValue('--btn-py').trim()).toBe(preset.btnPy);
  });

  test('logs out after inactivity and redirects to login', () => {
    jest.useFakeTimers();

    localStorage.setItem('voiddex_user', JSON.stringify({ id: '123', name: 'Active User' }));
    localStorage.setItem('voiddex_token', 'valid-token');

    const { getByText } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    // Initially we should see the dashboard
    expect(getByText('Dashboard Page')).toBeTruthy();

    // Advance time by 5 minutes + a tiny buffer
    jest.advanceTimersByTime(5 * 60 * 1000 + 100);

    // resetData should be called on logout due to inactivity
    expect(resetData).toHaveBeenCalled();

    // Alert should be shown
    expect(window.alert).toHaveBeenCalled();
    const alertMsg = (window.alert as jest.Mock).mock.calls[0][0] as string;
    expect(alertMsg).toContain('logged out due to inactivity');

    // User + token removed from storage
    expect(localStorage.getItem('voiddex_user')).toBeNull();
    expect(localStorage.getItem('voiddex_token')).toBeNull();

    jest.useRealTimers();
  });

  test('falls back to login when stored user JSON is invalid', () => {
    localStorage.setItem('voiddex_user', '{not-json}');
    localStorage.setItem('voiddex_token', 'some-token');

    const { getByText } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    // If JSON parse fails, user should initialize as null → login page
    expect(getByText('Login Page')).toBeTruthy();
  });
});
