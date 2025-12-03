import { fireEvent } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import Login from './Login';
// @ts-ignore
import { authService } from '../services/auth';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/auth', () => ({
  authService: {
    getGoogleAuthUrl: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login button and title', () => {
    const { getByText } = renderWithRouter(<Login />, '/login');
    expect(getByText('VoidDex')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  test('navigates to auth url on click', () => {
    const mockAuthUrl = '/auth/callback?code=mock';
    (authService.getGoogleAuthUrl as any).mockReturnValue(mockAuthUrl);

    const { getByText } = renderWithRouter(<Login />, '/login');

    fireEvent.click(getByText('Sign in with Google'));

    expect(authService.getGoogleAuthUrl).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(mockAuthUrl);
  });
});