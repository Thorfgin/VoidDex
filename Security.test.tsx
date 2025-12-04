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

// Local storage mock isolated to this test file
let store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => (key in store ? store[key] : null),
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
  configurable: true,
  value: mockLocalStorage,
});

describe('Security Controls', () => {
  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    (window.alert as jest.Mock).mockRestore();
  });

  test('Access Control: protected routes redirect to login if unauthenticated', () => {
    const { getByText } = render(
        <MemoryRouter initialEntries={['/create-item']}>
          <App />
        </MemoryRouter>
    );

    // Real Login page text; if you ever change copy, update this assertion
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  test('Inactivity Timeout: auto-logout after 5 minutes of idleness', () => {
    // Seed a valid session
    store['voiddex_user'] = JSON.stringify({ id: '1', name: 'User', email: 'u@u.com', avatar: '' });
    store['voiddex_token'] = 'valid-token';

    render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    // Session exists initially
    expect(store['voiddex_user']).toBeDefined();

    // Fast-forward past the inactivity timeout (5min + a little buffer)
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    // Session cleared by logout()
    expect(store['voiddex_user']).toBeUndefined();
    expect(store['voiddex_token']).toBeUndefined();

    // Alert called with inactivity message
    expect(window.alert).toHaveBeenCalled();
    const firstCallArg = (window.alert as jest.Mock).mock.calls[0][0] as string;
    expect(firstCallArg).toContain('logged out due to inactivity');
  });

  test('Input Sanitization: search queries are sanitized before calling API', async () => {
    const searchGlobalMock = api.searchGlobal as jest.MockedFunction<typeof api.searchGlobal>;
    searchGlobalMock.mockResolvedValue({ success: true, data: [] });

    const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
    );

    const input = getByPlaceholderText('Search...') as HTMLInputElement;
    const form = input.closest('form');

    const maliciousInput = '<script>alert(1)</script> OR 1=1';
    fireEvent.change(input, { target: { value: maliciousInput } });

    if (form) {
      fireEvent.submit(form);
    }

    // This expected value matches your Dashboard sanitization logic
    const expectedSanitized = 'scriptalert1script OR 11';

    expect(searchGlobalMock).toHaveBeenCalledWith(expectedSanitized);
  });
});
