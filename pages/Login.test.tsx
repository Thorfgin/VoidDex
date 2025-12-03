import { fireEvent, render } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import Login from './Login';
// @ts-ignore
import { authService } from '../services/auth';
import { MemoryRouter } from 'react-router-dom';
import { ThemeContext } from '../App';

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

  const renderWithContext = (component: React.ReactElement, themeContext: any) => {
    return render(
        <ThemeContext.Provider value={themeContext}>
          <MemoryRouter>
            {component}
          </MemoryRouter>
        </ThemeContext.Provider>
    );
  };

  test('renders login button and title', () => {
    const { getByText } = renderWithContext(<Login />, { theme: 'system', setTheme: jest.fn() });
    expect(getByText('VoidDex')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  test('navigates to auth url on click', () => {
    const mockAuthUrl = '/auth/callback?code=mock';
    (authService.getGoogleAuthUrl as any).mockReturnValue(mockAuthUrl);

    const { getByText } = renderWithContext(<Login />, { theme: 'system', setTheme: jest.fn() });

    fireEvent.click(getByText('Sign in with Google'));

    expect(authService.getGoogleAuthUrl).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(mockAuthUrl);
  });

  test('toggles theme on button click', () => {
    const mockSetTheme = jest.fn();
    const { getByTitle } = renderWithContext(<Login />, { theme: 'light', setTheme: mockSetTheme });

    const themeBtn = getByTitle('Theme: Light');
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});