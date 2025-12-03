import { AuthResponse } from '../types';

// Simulating a Backend Auth Service
// In a real application, these functions would call your backend API endpoints.

export const authService = {
  /**
   * Generates the Google OAuth URL.
   * In a real app, this returns https://accounts.google.com/o/oauth2/v2/auth?...
   * For this demo, we simulate a redirect to our own callback route.
   */
  getGoogleAuthUrl: (): string => {
    const SCOPE = "profile email";
    
    // Simulating the Google Redirect logic by sending the user to our callback
    // with a mock authorization code.
    return `/auth/callback?code=mock_secure_auth_code_${Date.now()}&scope=${SCOPE}`;
  },

  /**
   * Exchanges the temporary authorization code for a secure access token.
   * This MUST happen on the backend in a real app to keep the Client Secret secure.
   */
  exchangeCodeForToken: async (code: string): Promise<AuthResponse> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!code.startsWith('mock_secure_auth_code')) {
      throw new Error('Invalid authorization code');
    }

    // Return a mock JWT (Access Token) and User Profile
    // The token is a secure string that should be sent in the Authorization header.
    return {
      token: `eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_access_token_${Date.now()}.signature`,
      user: {
        id: 'google_123456789',
        name: 'Demo User',
        email: 'user@example.com',
        avatar: 'https://picsum.photos/100/100'
      }
    };
  }
};