import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, test, jest, beforeEach } from '@jest/globals';
import AuthCallback from './AuthCallback';
// @ts-ignore
import { authService } from '../services/auth';
import { AuthContext } from '../App';

jest.mock('../services/auth', () => ({
  authService: {
    exchangeCodeForToken: jest.fn(),
  },
}));

const exchangeMock = authService.exchangeCodeForToken as unknown as jest.MockedFunction<
    (code: string) => Promise<{ user: { id: string; name: string }; token: string }>
>;


const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

describe('AuthCallback Page', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (searchString = '') => {
    return render(
        <AuthContext.Provider
            value={{ user: null, token: null, login: mockLogin, logout: jest.fn() }}
        >
          <React.StrictMode>
            <MemoryRouter initialEntries={[`/auth/callback${searchString}`]}>
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/" element={<div>Dashboard</div>} />
              </Routes>
            </MemoryRouter>
          </React.StrictMode>
        </AuthContext.Provider>
    );
  };

  test('redirects to login if no code is present', () => {
    renderComponent('');

    // No API call
    expect(authService.exchangeCodeForToken).not.toHaveBeenCalled();
    // Redirect straight to login (no replace flag in this branch)
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('exchanges code for token and logs in successfully, calling API only once', async () => {
    const mockUser = { id: '1', name: 'Test User' };
    const mockToken = 'abc-123';
    exchangeMock.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });
    renderComponent('?code=valid_code');

    // Loader text should be visible while authenticating
    expect(screen.getByText('Authenticating...')).toBeTruthy();

    await waitFor(() => {
      // Code is exchanged exactly once, even with StrictMode double effect
      expect(authService.exchangeCodeForToken).toHaveBeenCalledWith('valid_code');
      expect(authService.exchangeCodeForToken).toHaveBeenCalledTimes(1);

      // Context login called with user & token
      expect(mockLogin).toHaveBeenCalledWith(mockUser, mockToken);

      // Redirect to dashboard with replace:true
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  test('handles auth error, alerts user and redirects to login', async () => {
    exchangeMock.mockRejectedValue(new Error('Invalid code'));
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent('?code=bad_code');

    await waitFor(() => {
      // API was called with the bad code
      expect(authService.exchangeCodeForToken).toHaveBeenCalledWith('bad_code');

      // User is informed
      expect(alertSpy).toHaveBeenCalledWith(
          'Authentication failed. Please try again.',
      );

      // Redirect to login with replace:true
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    alertSpy.mockRestore();
  });
});
