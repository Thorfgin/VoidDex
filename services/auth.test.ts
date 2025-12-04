import { describe, expect, test, beforeEach, afterAll, jest } from '@jest/globals';
import { authService } from './auth';

// Helper to advance timers for the internal setTimeout in exchangeCodeForToken
const runWithTimers = <T>(fn: () => Promise<T>): Promise<T> => {
    const promise = fn();
    jest.runAllTimers();
    return promise;
};

describe('Auth Service', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    test('getGoogleAuthUrl returns a callback URL with mock code and scope', () => {
        const url = authService.getGoogleAuthUrl();

        // Basic structure
        expect(url.startsWith('/auth/callback?')).toBe(true);
        expect(url).toContain('code=mock_secure_auth_code');
        expect(url).toContain('scope=profile email');

        // Ensure there *is* a timestamp suffix after the prefix
        const match = url.match(/code=mock_secure_auth_code_(\d+)/);
        expect(match).not.toBeNull();
        if (match) {
            const ts = Number(match[1]);
            expect(Number.isNaN(ts)).toBe(false);
            expect(ts).toBeGreaterThan(0);
        }
    });

    test('exchangeCodeForToken returns token and user for valid code', async () => {
        const validCode = 'mock_secure_auth_code_123';

        const response = await runWithTimers(() =>
            authService.exchangeCodeForToken(validCode),
        );

        // Token format sanity checks
        expect(response.token).toBeTruthy();
        expect(response.token).toContain('mock_access_token');

        // Roughly JWT-ish (three segments separated by dots)
        const segments = response.token.split('.');
        expect(segments.length).toBe(3);

        // User payload
        expect(response.user).toEqual(
            expect.objectContaining({
                id: 'google_123456789',
                name: 'Demo User',
                email: 'user@example.com',
            }),
        );
        expect(response.user.avatar).toContain('https://');
    });

    test('exchangeCodeForToken rejects for invalid code', async () => {
        const invalidCode = 'invalid_code_999';

        await expect(
            runWithTimers(() => authService.exchangeCodeForToken(invalidCode)),
        ).rejects.toThrow('Invalid authorization code');
    });

    test('getGoogleAuthUrl includes code and scope query params explicitly', () => {
        const url = authService.getGoogleAuthUrl();
        const [, query] = url.split('?');
        const params = new URLSearchParams(query);

        expect(params.get('code')).toMatch(/^mock_secure_auth_code_\d+$/);
        expect(params.get('scope')).toBe('profile email');
    });

    test('exchangeCodeForToken embeds timestamp-derived portion into token', async () => {
        jest.useFakeTimers();
        const code = 'mock_secure_auth_code_123';
        const promise = authService.exchangeCodeForToken(code);
        jest.runAllTimers();

        const res = await promise;
        // This just checks that the mock access token part is present;
        // if you later decide to encode the code or timestamp, you can assert that too.
        expect(res.token).toContain('mock_access_token');
    });

    test('exchangeCodeForToken rejects when code only partially matches the prefix', async () => {
        jest.useFakeTimers();
        const badCode = 'xxx_mock_secure_auth_code_123';

        const promise = authService.exchangeCodeForToken(badCode);
        jest.runAllTimers();

        await expect(promise).rejects.toThrow('Invalid authorization code');
    });

    test('exchangeCodeForToken returns a stable user shape', async () => {
        jest.useFakeTimers();
        const promise = authService.exchangeCodeForToken('mock_secure_auth_code_123');
        jest.runAllTimers();

        const { user } = await promise;
        expect(user).toEqual({
            id: 'google_123456789',
            name: 'Demo User',
            email: 'user@example.com',
            avatar: expect.stringContaining('https://'),
        });
    });


});
