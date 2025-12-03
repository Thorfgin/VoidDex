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
  const mockStart = jest.fn((onSuccess: (decodedText: string, decodedResult: any) => void) => {
    scanSuccessCallback = onSuccess;
    return Promise.resolve();
  });
  const mockStop = jest.fn(() => Promise.resolve());
  const mockClear = jest.fn();

  beforeAll(() => {
    (window as any).Html5Qrcode = class {
      constructor() {}
      start = mockStart;
      stop = mockStop;
      clear = mockClear;
      isScanning = false;
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations if needed, but keeping simple references is usually safer here
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

  test('displays error if camera fails', async () => {
    // Override start to fail
    const originalStart = (window as any).Html5Qrcode.prototype.start;
    (window as any).Html5Qrcode.prototype.start = jest.fn(() => Promise.reject(new Error("Permission denied")));

    const { findByText } = renderWithRouter(<Scanner />, '/scan');

    expect(await findByText((content) => content.includes('Permission denied'))).toBeTruthy();

    // Restore
    (window as any).Html5Qrcode.prototype.start = originalStart;
  });
});