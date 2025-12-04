import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { authService } from '../services/auth';
import { ThemeContext } from '../App';

jest.mock('../services/auth', () => ({
  authService: {
    getGoogleAuthUrl: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

// --- Simple local theme context type for tests ---
type ThemeName = 'light' | 'dark' | 'system';

type TestThemeContext = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const defaultThemeContext: TestThemeContext = {
  theme: 'system',
  setTheme: jest.fn(),
};

const renderWithContext = (
    component: React.ReactElement,
    override?: Partial<TestThemeContext>
) => {
  const value: TestThemeContext = {
    ...defaultThemeContext,
    ...override,
  };

  return render(
      <ThemeContext.Provider value={value as any}>
        <MemoryRouter>{component}</MemoryRouter>
      </ThemeContext.Provider>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login button and title', () => {
    const { getByText } = renderWithContext(<Login />);

    expect(getByText('VoidDex')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  test('navigates to auth url on click', () => {
    const mockAuthUrl = '/auth/callback?code=mock';

    const getGoogleAuthUrlMock =
        authService.getGoogleAuthUrl as jest.MockedFunction<
            typeof authService.getGoogleAuthUrl
        >;

    getGoogleAuthUrlMock.mockReturnValue(mockAuthUrl);

    const { getByText } = renderWithContext(<Login />);

    fireEvent.click(getByText('Sign in with Google'));

    expect(authService.getGoogleAuthUrl).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(mockAuthUrl);
  });

  test('cycles theme on button click (light → dark)', () => {
    const mockSetTheme = jest.fn();

    const { getByTitle } = renderWithContext(<Login />, {
      theme: 'light',
      setTheme: mockSetTheme,
    });

    const themeBtn = getByTitle('Theme: Light');
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('cycles theme on button click (system → light)', () => {
    const mockSetTheme = jest.fn();

    const { getByTitle } = renderWithContext(<Login />, {
      theme: 'system',
      setTheme: mockSetTheme,
    });

    const themeBtn = getByTitle('Theme: System');
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
