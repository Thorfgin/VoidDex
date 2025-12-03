import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, jest } from '@jest/globals';
import Navbar from './Navbar';
import { AuthContext, ThemeContext } from '../App';

describe('Navbar Component', () => {
  const mockLogout = jest.fn();
  const mockSetTheme = jest.fn();
  const mockSetAppTheme = jest.fn();
  const mockUser = { id: '1', name: 'Test', email: 't@t.com', avatar: '' };

  const renderNavbar = (user = mockUser, theme: any = 'light', appTheme: any = 'modern') => {
    return render(
      <ThemeContext.Provider value={{ theme, setTheme: mockSetTheme, appTheme, setAppTheme: mockSetAppTheme }}>
        <AuthContext.Provider value={{ user, token: 'abc', login: jest.fn(), logout: mockLogout }}>
          <MemoryRouter>
            <Navbar />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    );
  };

  test('does not render if no user', () => {
    const { queryByText } = renderNavbar();
    expect(queryByText('VoidDex')).toBeNull();
  });

  test('renders logo and user controls when logged in', () => {
    const { getByText, getByTitle } = renderNavbar();
    expect(getByText('VoidDex')).toBeTruthy();
    expect(getByTitle('Sign Out')).toBeTruthy();
  });

  test('calls logout on click', () => {
    const { getByTitle } = renderNavbar();
    fireEvent.click(getByTitle('Sign Out'));
    expect(mockLogout).toHaveBeenCalled();
  });

  test('toggles light/dark theme', () => {
    const { getByTitle } = renderNavbar(mockUser, 'light');
    const themeBtn = getByTitle('Theme: Light');
    fireEvent.click(themeBtn);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('opens theme preset menu and selects theme', () => {
    const { getByTitle, getByText } = renderNavbar();
    
    const paletteBtn = getByTitle('Change App Style');
    fireEvent.click(paletteBtn);

    expect(getByText('Futura')).toBeTruthy();
    expect(getByText('Historic')).toBeTruthy();

    fireEvent.click(getByText('Historic'));
    
    expect(mockSetAppTheme).toHaveBeenCalledWith('historic');
  });
});