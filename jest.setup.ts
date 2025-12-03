import '@testing-library/jest-dom';

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
import { TextEncoder, TextDecoder } from 'util';
Object.assign(globalThis, { TextEncoder, TextDecoder });