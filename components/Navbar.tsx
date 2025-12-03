import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext, ThemeContext, THEME_PRESETS, AppThemeId } from '../App';
import { LogOut, Sun, Moon, Laptop, Palette, Check } from 'lucide-react';
import Logo from './Logo';

const Navbar: React.FC = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, setTheme, appTheme, setAppTheme } = useContext(ThemeContext);

    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const themeMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
                setShowThemeMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    // Tri-state toggle: System -> Light -> Dark
    const cycleTheme = () => {
        if (theme === 'system') setTheme('light');
        else if (theme === 'light') setTheme('dark');
        else setTheme('system');
    };

    const getThemeIcon = () => {
        switch (theme) {
            case 'light': return <Sun size={18} />;
            case 'dark': return <Moon size={18} />;
            case 'system': return <Laptop size={18} />;
        }
    };

    const getThemeLabel = () => {
        return theme.charAt(0).toUpperCase() + theme.slice(1);
    };

    return (
        <>
            {/* Main Header Area */}
            <header className="bg-white dark:bg-gray-800 pt-3 pb-3 px-4 border-b-0 border-gray-200 dark:border-gray-700 shadow-sm z-40 relative transition-colors duration-200">
                <div className="container mx-auto h-9 relative flex items-center">

                    {/* Logo & Title */}
                    {/* Mobile: Left Aligned (Default Flex) */}
                    {/* Desktop (md+): Absolute Centered */}
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 group z-10 md:absolute md:left-1/2 md:top-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2"
                    >
                        <div className="relative">
                            <Logo className="w-9 h-9 md:w-10 md:h-10 drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900 dark:text-white tracking-wide group-hover:text-brand-primary transition-colors">
                            VoidDex
                        </h1>
                    </Link>

                    {/* User Controls - Pinned to Right */}
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 z-20">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-200 dark:border-gray-600 transition-colors relative backdrop-blur-sm">

                            {/* Theme Preset Dropdown */}
                            <div ref={themeMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                                    title="Change App Style"
                                >
                                    <Palette size={18} />
                                </button>

                                {showThemeMenu && (
                                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-2 z-50 w-40 flex flex-col gap-1">
                                        <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Style</div>
                                        {(Object.keys(THEME_PRESETS) as AppThemeId[]).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setAppTheme(key);
                                                    setShowThemeMenu(false);
                                                }}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold transition-colors text-left"
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full shadow-sm"
                                                    style={{ backgroundColor: THEME_PRESETS[key].primaryHex }}
                                                ></div>
                                                <span className="text-gray-700 dark:text-gray-200 flex-1">{THEME_PRESETS[key].label}</span>
                                                {appTheme === key && <Check size={12} className="text-brand-primary"/>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                            {/* Light/Dark Toggle */}
                            <button
                                type="button"
                                onClick={cycleTheme}
                                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                                title={`Theme: ${getThemeLabel()}`}
                            >
                                {getThemeIcon()}
                            </button>

                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                            {/* Logout */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    logout();
                                }}
                                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Navbar;