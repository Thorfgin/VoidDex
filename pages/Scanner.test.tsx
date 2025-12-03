import { waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeAll, beforeEach } from '@jest/globals';
import Scanner from './Scanner';
import { renderWithRouter } from '../testUtils';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

describe('Scanner Page', () => {
  let scanSuccessCallback: (decodedText: string, decodedResult: any) => void;

  beforeAll(() => {
    (window as any).Html5Qrcode = class {
      constructor() {}
      start(_config: any, _settings: any, onSuccess: any) { 
          scanSuccessCallback = onSuccess;
          return Promise.resolve(); 
      }
      stop() { return Promise.resolve(); }
      clear() {}
    };
  });

  beforeEach(() => {
      jest.clearAllMocks();
  });

  test('renders scanner container', async () => {
    const { getByText } = renderWithRouter(<Scanner />, '/scan');

    expect(getByText('Scan Code')).toBeTruthy();
    const reader = document.getElementById('reader');
    expect(reader).toBeTruthy();
  });

  test('navigates on successful item scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    if (scanSuccessCallback) {
        scanSuccessCallback("https://voiddex.app/items/1234", {});
        expect(mockNavigate).toHaveBeenCalledWith('/items/1234');
    } else {
        throw new Error("Callback not registered");
    }
  });

  test('displays error if camera fails (simulated)', async () => {
    (window as any).Html5Qrcode = class {
      constructor() {}
      start() { return Promise.reject(new Error("Permission denied")); }
    };

    const { findByText } = renderWithRouter(<Scanner />, '/scan');

    expect(await findByText((content) => content.includes('Permission denied'))).toBeTruthy();
  });
});