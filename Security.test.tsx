import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import App from './App';
import Dashboard from './pages/Dashboard';
import * as api from './services/api';

jest.mock('./services/api', () => ({
  searchGlobal: jest.fn(),
  resetData: jest.fn(),
  getCharacterName: jest.fn(),
}));

jest.mock('./services/offlineStorage', () => ({
  getStoredChanges: jest.fn(() => []),
  getNotes: jest.fn(() => []),
}));

describe('Security Controls', () => {
  
  let store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Access Control: Protected routes redirect to login if unauthenticated', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/create-item']}>
        <App />
      </MemoryRouter>
    );
    
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  test('Session Management: Logout clears session tokens securely', async () => {
    store['voiddex_user'] = JSON.stringify({ id: '1', name: 'User' });
    store['voiddex_token'] = 'secure-token-123';

    const { getByTitle } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    const logoutBtn = getByTitle('Sign Out');
    
    fireEvent.click(logoutBtn);

    expect(store['voiddex_user']).toBeUndefined();
    expect(store['voiddex_token']).toBeUndefined();
  });

  test('Inactivity Timeout: Auto-logout after 5 minutes of idleness', async () => {
    store['voiddex_user'] = JSON.stringify({ id: '1', name: 'User' });
    
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(store['voiddex_user']).toBeDefined();

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    expect(store['voiddex_user']).toBeUndefined();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('logged out due to inactivity'));
  });

  test('Inactivity Timeout: User activity resets the timer', async () => {
    store['voiddex_user'] = JSON.stringify({ id: '1', name: 'User' });
    
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    act(() => {
      jest.advanceTimersByTime(4 * 60 * 1000);
    });

    fireEvent.click(document.body);

    act(() => {
      jest.advanceTimersByTime(4 * 60 * 1000);
    });

    expect(store['voiddex_user']).toBeDefined();
  });

  test('Input Sanitization: Search queries strip dangerous characters (XSS/SQLi vectors)', async () => {
    (api.searchGlobal as any).mockResolvedValue({ success: true, data: [] });
    
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
        await act(async () => {
            fireEvent.submit(form);
        });
    }

    const expectedSanitized = 'scriptalert1script OR 11'; 
    
    expect(api.searchGlobal).toHaveBeenCalledWith(expectedSanitized);
    expect(api.searchGlobal).not.toHaveBeenCalledWith(expect.stringContaining('<'));
    expect(api.searchGlobal).not.toHaveBeenCalledWith(expect.stringContaining('='));
  });
});