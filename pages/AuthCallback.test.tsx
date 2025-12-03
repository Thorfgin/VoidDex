import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import AuthCallback from './AuthCallback';
// @ts-ignore
import { authService } from '../services/auth';
import { AuthContext } from '../App';

jest.mock('../services/auth', () => ({
  authService: {
    exchangeCodeForToken: jest.fn(),
  },
}));

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
      <AuthContext.Provider value={{ user: null, token: null, login: mockLogin, logout: jest.fn() }}>
        <MemoryRouter initialEntries={[`/auth/callback${searchString}`]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  test('redirects to login if no code is present', () => {
    renderComponent('');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('exchanges code for token and logs in successfully', async () => {
    const mockUser = { id: '1', name: 'Test User' };
    const mockToken = 'abc-123';
    (authService.exchangeCodeForToken as any).mockResolvedValue({ user: mockUser, token: mockToken });

    const { getByText } = renderComponent('?code=valid_code');

    expect(getByText('Authenticating...')).toBeTruthy();

    await waitFor(() => {
        expect(authService.exchangeCodeForToken).toHaveBeenCalledWith('valid_code');
        expect(mockLogin).toHaveBeenCalledWith(mockUser, mockToken);
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  test('handles auth error and redirects to login', async () => {
    (authService.exchangeCodeForToken as any).mockRejectedValue(new Error('Invalid code'));
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    renderComponent('?code=bad_code');

    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});