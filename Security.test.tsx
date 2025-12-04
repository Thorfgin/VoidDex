import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import App from './App';
import Dashboard from './pages/Dashboard';
import * as api from './services/api';

// ---- Mocks ----

jest.mock('./services/api', () => ({
  searchGlobal: jest.fn(),
  resetData: jest.fn(),
  getCharacterName: jest.fn(),
}));

jest.mock('./services/offlineStorage', () => ({
  getStoredChanges: jest.fn(() => []),
  getNotes: jest.fn(() => []),
}));

// matchMedia mock so the theme effect in App doesn't explode in jsdom
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated but sometimes used
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

// Simple localStorage mock, isolated per test run
let store: Record<string, string> = {};
const mockLocalStorage = {
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
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
});

describe('Security Controls', () => {
  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  test('Access Control: protected route redirects unauthenticated user to login', () => {
    const { getByText } = render(
        <MemoryRouter initialEntries={['/create-item']}>
          <App />
        </MemoryRouter>
    );

    // Login page text (more stable than relying on URL)
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  test('Inactivity Timeout: auto-logout after 5 minutes of idleness', () => {
    jest.useFakeTimers();

    // Seed a "logged in" session
    store['voiddex_user'] = JSON.stringify({ id: '1', name: 'User' });
    store['voiddex_token'] = 'dummy-token';

    render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(store['voiddex_user']).toBeDefined();
    expect(store['voiddex_token']).toBeDefined();

    // Advance timers beyond the 5-minute inactivity window
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    // Session should be cleared
    expect(store['voiddex_user']).toBeUndefined();
    expect(store['voiddex_token']).toBeUndefined();

    // Security-relevant behaviour: backend state reset + user notified
    expect(api.resetData).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('logged out due to inactivity')
    );

    jest.useRealTimers();
  });

  test('Input Sanitization: search queries are sanitized before calling API', async () => {
    // Properly typed mock
    const searchGlobalMock = api.searchGlobal as jest.MockedFunction<
        typeof api.searchGlobal
    >;

    searchGlobalMock.mockResolvedValue({ success: true, data: [] });

    const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
    );

    const input = getByPlaceholderText('Search...');
    const form = input.closest('form');

    const maliciousInput = '<script>alert(1)</script> OR 1=1';

    fireEvent.change(input, { target: { value: maliciousInput } });

    if (form) {
      fireEvent.submit(form);
    }

    expect(searchGlobalMock).toHaveBeenCalledTimes(1);

    const [sanitizedQuery] = searchGlobalMock.mock.calls[0];

    // Core guarantees: dangerous characters are stripped out
    expect(typeof sanitizedQuery).toBe('string');
    expect(sanitizedQuery).not.toContain('<');
    expect(sanitizedQuery).not.toContain('>');
    expect(sanitizedQuery).not.toContain('"');
    expect(sanitizedQuery).not.toContain("'");

    // Still roughly preserves the intent of the original search
    expect(sanitizedQuery.toLowerCase()).toContain('scriptalert1script');
    expect(sanitizedQuery).toMatch(/OR\s*11/);
  });
});
