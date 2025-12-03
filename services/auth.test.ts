import { describe, expect, test } from '@jest/globals';
import { authService } from './auth';

describe('Auth Service', () => {
    const originalWindowLocation = window.location;

    beforeAll(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { origin: 'http://localhost:3000' },
        });
    });

    afterAll(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalWindowLocation,
        });
    });

    test('getGoogleAuthUrl returns correct format', () => {
        const url = authService.getGoogleAuthUrl();
        expect(url).toContain('/auth/callback');
        expect(url).toContain('code=mock_secure_auth_code');
        expect(url).toContain('scope=profile email');
    });

    test('exchangeCodeForToken returns token and user for valid code', async () => {
        const validCode = 'mock_secure_auth_code_123';
        const response = await authService.exchangeCodeForToken(validCode);

        expect(response.token).toBeTruthy();
        expect(response.token).toContain('mock_access_token');
        expect(response.user).toEqual(expect.objectContaining({
            name: 'Demo User',
            email: 'user@example.com'
        }));
    });

    test('exchangeCodeForToken throws error for invalid code', async () => {
        const invalidCode = 'invalid_code_999';
        await expect(authService.exchangeCodeForToken(invalidCode)).rejects.toThrow('Invalid authorization code');
    });
});