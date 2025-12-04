import { waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import Scanner from './Scanner';
import { renderWithRouter } from '../testUtils';

const mockNavigate = jest.fn();

// Mock react-router-dom navigate hook
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

describe('Scanner Page', () => {
  let scanSuccessCallback: ((decodedText: string) => void) | undefined;

  const mockStart = jest.fn(
      (
          _cameraConfig: unknown,
          _config: unknown,
          onSuccess: (decodedText: string) => void
          // _onFailure?: (error: unknown) => void
      ) => {
        // The 3rd arg is the success callback in our component
        scanSuccessCallback = onSuccess;
        return Promise.resolve();
      }
  );
  const mockStop = jest.fn(() => Promise.resolve());
  const mockClear = jest.fn();

  const setupHtml5QrcodeSuccessMock = () => {
    (globalThis as any).Html5Qrcode = jest.fn().mockImplementation(() => ({
      start: mockStart,
      stop: mockStop,
      clear: mockClear,
      isScanning: true,
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scanSuccessCallback = undefined;
    setupHtml5QrcodeSuccessMock();
  });

  test('renders scanner container', () => {
    const { getByText } = renderWithRouter(<Scanner />, '/scan');

    expect(getByText('Scan Code')).toBeTruthy();
    const reader = document.getElementById('reader');
    expect(reader).toBeTruthy();
  });

  test('navigates on successful item scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    // Wait until the scanner has started and callback is registered
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
      expect(scanSuccessCallback).toBeDefined();
    });

    // Simulate a successful scan of an item URL
    scanSuccessCallback?.('https://voiddex.app/items/1234');
    expect(mockNavigate).toHaveBeenCalledWith('/items/1234');
  });

  test('displays permission error if camera fails to start', async () => {
    // Override Html5Qrcode to simulate failure on start
    const failingStart = jest.fn(() =>
        Promise.reject(new Error('Permission denied'))
    );

    (globalThis as any).Html5Qrcode = jest.fn().mockImplementation(() => ({
      start: failingStart,
      stop: mockStop,
      clear: mockClear,
      isScanning: false,
    }));

    const { findByText } = renderWithRouter(<Scanner />, '/scan');

    // The component maps permission errors to a friendly message
    const msg = await findByText(/Camera permission denied/i);
    expect(msg).toBeTruthy();
  });

  test('navigates on successful condition scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    scanSuccessCallback!("https://voiddex.app/conditions/9999");
    expect(mockNavigate).toHaveBeenCalledWith('/conditions/9999');
  });

  test('navigates on successful power scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    scanSuccessCallback!("https://voiddex.app/powers/6000");
    expect(mockNavigate).toHaveBeenCalledWith('/powers/6000');
  });

  test('ignores QR codes that do not match the expected pattern', async () => {
    const { queryByText } = renderWithRouter(<Scanner />, '/scan');

    // Wait until the scanner has started and callback has been registered
    await waitFor(() => {
      expect(scanSuccessCallback).toBeDefined();
    });

    // This string does NOT match the regex (no "item/condition/power" segment)
    scanSuccessCallback!("https://example.com/foo/1234");

    // We should NOT navigate anywhere
    expect(mockNavigate).not.toHaveBeenCalled();

    // And we should NOT show the "Scanner Error" overlay caused by setError()
    expect(queryByText(/Scanner Error/i)).toBeNull();
    expect(queryByText(/Unknown type in QR/i)).toBeNull();
  });

  test('ignores completely invalid QR text (no regex match)', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    scanSuccessCallback!("hello world");

    // No navigation should happen
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
