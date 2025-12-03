import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, jest } from '@jest/globals';
import App from './App';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Page</div>);

describe('App Integration', () => {
  test('redirects to login when no user session exists', () => {
    localStorage.removeItem('voiddex_user');
    
    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(getByText('Login Page')).toBeTruthy();
  });

  test('renders dashboard when user session exists', async () => {
    localStorage.setItem('voiddex_user', JSON.stringify({ id: '123', name: 'Test' }));
    localStorage.setItem('voiddex_token', 'valid-token');

    const { findByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await findByText('Dashboard Page')).toBeTruthy();
  });
});