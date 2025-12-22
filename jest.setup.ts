import '@testing-library/jest-dom'; // Registers matchers like .toHaveClass, .toBeInTheDocument
import { TextEncoder, TextDecoder } from 'util';
import { configure } from '@testing-library/react';

// NOTE: The conflicting 'import { jest } from "@jest/globals";' has been removed.
// We rely on the global 'jest' object which is available in a Jest setup file context.

// ## ⚙️ Testing Library Configuration
// Configure RTL to not dump the whole DOM on errors
configure({
    getElementError: (message, container) => {
        const error = new Error(message ? message : 'Unknown error occurred @'+container.tagName);
        error.name = 'TestingLibraryElementError';
        return error;
    },
});

// ## 🌍 Global Mocks for JSDOM Environment

// Mock IntersectionObserver if used by any libraries (e.g., for lazy loading)
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

// Mock global TextEncoder/Decoder often needed by JSDOM for encoding/decoding operations
Object.assign(globalThis, { TextEncoder, TextDecoder });

// Mock matchMedia for ThemeContext or components relying on media queries
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        // Using the global 'jest' available in this context
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }),
});