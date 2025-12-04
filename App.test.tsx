import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, jest, beforeAll, beforeEach } from '@jest/globals';
import App from './App';

// matchMedia mock so the theme effect doesn't explode in jsdom
beforeAll(() => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    // legacy listeners for older code paths
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
});

// Simple in-memory localStorage mock isolated to this file
let store: Record<string, string> = {};
const localStorageMock = {
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
  value: localStorageMock,
});

// Keep App lean by mocking the heavy pages we care about
jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Page</div>);

describe('App Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('redirects to login when no user session exists', () => {
    // Ensure no session
    window.localStorage.removeItem('voiddex_user');
    window.localStorage.removeItem('voiddex_token');

    const { getByText } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(getByText('Login Page')).toBeTruthy();
  });

  test('renders dashboard when user session exists', async () => {
    window.localStorage.setItem(
        'voiddex_user',
        JSON.stringify({ id: '123', name: 'Test', email: 't@t.com', avatar: '' })
    );
    window.localStorage.setItem('voiddex_token', 'valid-token');

    const { findByText } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(await findByText('Dashboard Page')).toBeTruthy();
  });

  test('protected non-root route also redirects to login when unauthenticated', () => {
    // No session
    window.localStorage.clear();

    const { getByText } = render(
        <MemoryRouter initialEntries={['/stored-changes']}>
          <App />
        </MemoryRouter>
    );

    // We still end up on Login (via PrivateRoute + /login route)
    expect(getByText('Login Page')).toBeTruthy();
  });
});
