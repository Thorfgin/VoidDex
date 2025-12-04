import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { configure } from '@testing-library/react';

// Configure RTL to not dump the whole DOM on errors
configure({
    getElementError: (message, container) => {
        const error = new Error(message ? message : 'Unknown error occurred @'+container.tagName);
        error.name = 'TestingLibraryElementError';
        return error;
    },
});

// Mock IntersectionObserver if used by any libraries
(globalThis as any).IntersectionObserver = class IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    constructor() {}

    disconnect() {}
    observe() {}
    takeRecords(): any[] { return []; }
    unobserve() {}
};

// Mock global TextEncoder/Decoder often needed by JSDOM
Object.assign(globalThis, { TextEncoder, TextDecoder });

// Mock matchMedia for ThemeContext
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }),
});
