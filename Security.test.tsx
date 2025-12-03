import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import App from './App';
import Dashboard from './pages/Dashboard';
// @ts-ignore
import * as api from './services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';

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

  test('Inactivity Timeout: Auto-logout after 5 minutes of idleness', async () => {
    store['voiddex_user'] = JSON.stringify({ id: '1', name: 'User' });

    render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
    );

    expect(store['voiddex_user']).toBeDefined();

    // Advance timer to trigger logout which updates App state
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    expect(store['voiddex_user']).toBeUndefined();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('logged out due to inactivity'));
  });

  test('Input Sanitization: Search queries strip dangerous characters', async () => {
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
      fireEvent.submit(form);
    }

    const expectedSanitized = 'scriptalert1script OR 11';

    expect(api.searchGlobal).toHaveBeenCalledWith(expectedSanitized);
  });
});