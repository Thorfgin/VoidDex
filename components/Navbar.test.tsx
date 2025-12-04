import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import Navbar from './Navbar';
import { AuthContext, ThemeContext, AppThemeId } from '../App';

type ThemeContextValue = {
  theme: 'system' | 'light' | 'dark';
  setTheme: (t: 'system' | 'light' | 'dark') => void;
  appTheme: AppThemeId;
  setAppTheme: (id: AppThemeId) => void;
};

type AuthContextValue = {
  user: { id: string; name: string; email: string; avatar: string } | null;
  token: string | null;
  login: jest.Mock;
  logout: jest.Mock;
};

describe('Navbar Component', () => {
  const mockLogout = jest.fn();
  const mockSetTheme = jest.fn();
  const mockSetAppTheme = jest.fn();

  const mockUser: NonNullable<AuthContextValue['user']> = {
    id: '1',
    name: 'Test',
    email: 't@t.com',
    avatar: '',
  };

  const baseThemeCtx: ThemeContextValue = {
    theme: 'light',
    setTheme: mockSetTheme,
    appTheme: 'modern' as AppThemeId,
    setAppTheme: mockSetAppTheme,
  };

  const baseAuthCtx: AuthContextValue = {
    user: mockUser,
    token: 'abc',
    login: jest.fn(),
    logout: mockLogout,
  };

  const renderNavbar = (
      authOverrides: Partial<AuthContextValue> = {},
      themeOverrides: Partial<ThemeContextValue> = {}
  ) => {
    const themeValue: ThemeContextValue = { ...baseThemeCtx, ...themeOverrides };
    const authValue: AuthContextValue = { ...baseAuthCtx, ...authOverrides };

    return render(
        <ThemeContext.Provider value={themeValue}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter>
              <Navbar />
            </MemoryRouter>
          </AuthContext.Provider>
        </ThemeContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render anything when no user is logged in', () => {
    const { queryByText, container } = renderNavbar({ user: null, token: null });

    // No title, effectively nothing from Navbar should show
    expect(queryByText('VoidDex')).toBeNull();
    // Container should be basically empty
    expect(container.firstChild).toBeNull();
  });

  test('renders logo and user controls when logged in', () => {
    const { getByText, getByTitle } = renderNavbar();

    expect(getByText('VoidDex')).toBeTruthy();
    expect(getByTitle('Sign Out')).toBeTruthy();
    expect(getByTitle(/Theme:/)).toBeTruthy();
    expect(getByTitle('Change App Style')).toBeTruthy();
  });

  test('calls logout on click of Sign Out button', () => {
    const { getByTitle } = renderNavbar();

    const logoutBtn = getByTitle('Sign Out');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('cycles theme from light → dark', () => {
    const { getByTitle } = renderNavbar(
        { user: mockUser },
        { theme: 'light' }
    );

    const themeBtn = getByTitle('Theme: Light');
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('cycles theme from dark → system', () => {
    const { getByTitle } = renderNavbar(
        { user: mockUser },
        { theme: 'dark' }
    );

    const themeBtn = getByTitle('Theme: Dark');
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });

  test('cycles theme from system → light', () => {
    const { getByTitle } = renderNavbar(
        { user: mockUser },
        { theme: 'system' }
    );

    const themeBtn = getByTitle('Theme: System');
    fireEvent.click(themeBtn);

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  test('opens theme preset menu and selects a style (calls setAppTheme)', () => {
    const { getByTitle, container } = renderNavbar();

    const paletteBtn = getByTitle('Change App Style');
    fireEvent.click(paletteBtn);

    // Find one of the preset buttons inside the menu (excluding the palette button itself)
    const presetButtons = Array.from(
        container.querySelectorAll('button')
    ).filter((btn) => btn !== paletteBtn);

    // There should be at least one preset option
    const firstPreset = presetButtons.find((btn) =>
        btn.textContent && btn.textContent.trim().length > 0
    );
    expect(firstPreset).toBeTruthy();

    if (!firstPreset) throw new Error('No preset button found');

    fireEvent.click(firstPreset);

    // We don't assert the exact theme ID here to avoid coupling to THEME_PRESETS contents;
    // just ensure it was called with *some* AppThemeId.
    expect(mockSetAppTheme).toHaveBeenCalledTimes(1);
    expect(typeof mockSetAppTheme.mock.calls[0][0]).toBe('string');
  });

  test('closes theme menu when clicking outside', () => {
    const { getByTitle, getByText, queryByText } = renderNavbar();

    const paletteBtn = getByTitle('Change App Style');
    fireEvent.click(paletteBtn);

    // The theme menu heading is a unique, stable string
    expect(getByText('Style')).toBeTruthy();

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    // Menu should disappear -> "Style" no longer present
    expect(queryByText('Style')).toBeNull();
  });
});
