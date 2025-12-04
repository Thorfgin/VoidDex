import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import ExtendPower from './ExtendPower';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

// --- Mocks ---

jest.mock('../services/api', () => ({
  searchPowerByPoin: jest.fn(),
  updatePower: jest.fn(),
  getCharacterName: jest.fn(),
}));

jest.mock('../services/offlineStorage', () => ({
  saveStoredChange: jest.fn(),
  deleteStoredChange: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

// Strongly-typed helpers for mocks
const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

// --- Test Data ---

const mockPower = {
  poin: '6001',
  name: 'Flight',
  description: 'Fly high',
  assignments: [
    { plin: '1001#01', expiryDate: '01/01/2025' },
    { plin: '1002#01', expiryDate: '01/01/2025' },
    { plin: '1003#01', expiryDate: '01/01/2025' },
    { plin: '1004#01', expiryDate: '01/01/2025' },
    { plin: '1005#01', expiryDate: '01/01/2025' },
  ],
  remarks: '',
  csRemarks: '',
};

describe('ExtendPower Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches and finds power', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } =
        renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '6001' },
    });
    fireEvent.click(getByText('Find'));

    const nameInput = await findByDisplayValue('Flight');
    expect(nameInput).toBeTruthy();
  });

  test('updates expiry for a single selected player', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: { ...mockPower },
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } =
        renderWithRouter(<ExtendPower />, '/extend-power');

    // Load power
    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '6001' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    // Filter and select one player (1001#01)
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.change(filterInput, { target: { value: '1001' } });
    fireEvent.click(getByText('Select All')); // selects only 1001#01 in filtered list

    // Change expiry date
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '01/01/2030' } });

    // Trigger update
    fireEvent.click(getByText('Update'));

    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledWith(
          '6001',
          expect.objectContaining({
            assignments: expect.arrayContaining([
              expect.objectContaining({
                plin: '1001#01',
                expiryDate: '01/01/2030',
              }),
            ]),
          }),
      );
    });
  });
  test('triggers confirmation modal for mass update (>= 5 players)', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } =
        renderWithRouter(<ExtendPower />, '/extend-power');

    // Load the power
    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '6001' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    // Select all 5 players
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    // Set a valid date
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '01/01/2030' } });

    // Click Update → should open confirmation modal
    fireEvent.click(getByText('Update'));

    // Check that the confirmation modal is shown
    expect(getByText(/Confirm Mass Update/i)).toBeTruthy();
    expect(
        getByText(/update the expiry date for 5 players/i)
    ).toBeTruthy();

    // And ensure the API has NOT been called yet (waiting flush in case of async)
    await waitFor(() => {
      expect(apiMock.updatePower).not.toHaveBeenCalled();
    });
  });

  test('validates invalid expiry date before updating', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue, queryByText } =
        renderWithRouter(<ExtendPower />, '/extend-power');

    // Load power
    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '6001' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    // Select all players
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    // Enter a syntactically valid but out-of-range date
    // (due to formatting, "invalid-date" becomes "", which is treated as no error)
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '99/99/2022' } });

    // Attempt update
    fireEvent.click(getByText('Update'));

    await waitFor(() => {
      const errorNode = queryByText(/Day must be between 1 and 31/i);
      expect(errorNode).toBeTruthy();
      expect(apiMock.updatePower).not.toHaveBeenCalled();
    });
  });

  test('loading draft restores selections and expiry', () => {
    const draftData = {
      power: mockPower,
      expiryDate: '01/01/2030',
      selectedPlins: ['1001#01'],
    };

    const { getByDisplayValue, getByText } = renderWithRouter(
        <ExtendPower />,
        '/extend-power',
        { initialData: draftData },
    );

    expect(getByDisplayValue('Flight')).toBeTruthy();
    expect(getByDisplayValue('01/01/2030')).toBeTruthy();
    expect(getByText('1 Selected')).toBeTruthy();
  });

  test('save draft persists current selections and expiry', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } =
        renderWithRouter(<ExtendPower />, '/extend-power');

    // Load power
    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '6001' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);

    // Select just one player via filter
    fireEvent.change(filterInput, { target: { value: '1001' } });
    fireEvent.click(getByText('Select All'));

    // Save draft
    fireEvent.click(getByText('Save Draft'));

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'power',
          action: 'extend',
          data: expect.objectContaining({
            power: mockPower,
            selectedPlins: ['1001#01'],
          }),
        }),
    );
  });
});
