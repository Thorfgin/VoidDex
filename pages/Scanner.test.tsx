import { waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import Scanner from './Scanner';
import { renderWithRouter } from '../utils/testUtils';

const mockNavigate = jest.fn();

/** Mock the react-router-dom useNavigate hook. */
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

/**
 * Test suite for the Scanner component.
 */
describe('Scanner Page', () => {
  let scanSuccessCallback: ((decodedText: string) => void) | undefined;

  /**
   * Mock implementation for Html5Qrcode.start. Captures the success callback.
   */
  const mockStart = jest.fn(
    (
      _cameraConfig: unknown,
      _config: unknown,
      onSuccess: (decodedText: string) => void
    ) => {
      scanSuccessCallback = onSuccess;
      return Promise.resolve();
    }
  );
  const mockStop = jest.fn(() => Promise.resolve());
  const mockClear = jest.fn();

  /**
   * Sets up the global mock for the Html5Qrcode library with successful implementations.
   */
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

  /** Tests that the necessary elements for the scanner are rendered. */
  test('renders scanner container', () => {
    const { getByText } = renderWithRouter(<Scanner />, '/scan');

    expect(getByText('SCAN CODE')).toBeTruthy();
    const reader = document.getElementById('reader');
    expect(reader).toBeTruthy();
  });

  /** Tests successful navigation after scanning an item URL. */
  test('navigates on successful item scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
      expect(scanSuccessCallback).toBeDefined();
    });

    scanSuccessCallback?.('https://voiddex.app/items/1234');
    expect(mockNavigate).toHaveBeenCalledWith('/items/1234');
  });

  /** Tests error handling when camera permissions are denied. */
  test('displays permission error if camera fails to start', async () => {
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

    const msg = await findByText(/Camera permission denied/i);
    expect(msg).toBeTruthy();
  });

  /** Tests successful navigation after scanning a condition URL. */
  test('navigates on successful condition scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    scanSuccessCallback!("https://voiddex.app/conditions/9999");
    expect(mockNavigate).toHaveBeenCalledWith('/conditions/9999');
  });

  /** Tests successful navigation after scanning a power URL. */
  test('navigates on successful power scan', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    scanSuccessCallback!("https://voiddex.app/powers/6000");
    expect(mockNavigate).toHaveBeenCalledWith('/powers/6000');
  });

  /** Tests that QR codes without the resource type pattern are ignored silently. */
  test('ignores QR codes that do not match the expected pattern', async () => {
    const { queryByText } = renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => {
      expect(scanSuccessCallback).toBeDefined();
    });

    scanSuccessCallback!("https://example.com/foo/1234");

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(queryByText(/Scanner Error/i)).toBeNull();
    expect(queryByText(/Unknown type in QR/i)).toBeNull();
  });

  /** Tests that completely random QR text is ignored. */
  test('ignores completely invalid QR text (no regex match)', async () => {
    renderWithRouter(<Scanner />, '/scan');

    await waitFor(() => expect(scanSuccessCallback).toBeDefined());

    scanSuccessCallback!("hello world");

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});