import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import ExtendPower from './ExtendPower';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

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
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

const mockPower = {
  poin: '6001',
  name: 'Flight',
  description: 'Fly high',
  assignments: [
    { plin: '1001#01', expiryDate: '01/01/2025' },
    { plin: '1002#01', expiryDate: '01/01/2025' },
    { plin: '1003#01', expiryDate: '01/01/2025' },
    { plin: '1004#01', expiryDate: '01/01/2025' },
    { plin: '1005#01', expiryDate: '01/01/2025' }
  ],
  remarks: '',
  csRemarks: ''
};

describe('ExtendPower Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches and finds power', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });
    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));

    expect(await findByDisplayValue('Flight')).toBeTruthy();
  });

  test('updates expiry for selected player', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });
    (api.updatePower as any).mockResolvedValue({ success: true, data: { ...mockPower } });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    // Filter and select one
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.change(filterInput, { target: { value: '1001' } });
    fireEvent.click(getByText('Select All'));

    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '01/01/2030' } });

    fireEvent.click(getByText('Update'));

    await waitFor(() => {
      expect(api.updatePower).toHaveBeenCalledWith('6001', expect.objectContaining({
        assignments: expect.arrayContaining([
          expect.objectContaining({ plin: '1001#01', expiryDate: '01/01/2030' })
        ])
      }));
    });
  });

  test('triggers confirmation for mass update (>= 5 players)', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });
    (api.updatePower as any).mockResolvedValue({ success: true, data: { ...mockPower } });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendPower />, '/extend-power');

    // Load
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    // Select All (5 players)
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    // Set Date
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '01/01/2030' } });

    // Click Update
    fireEvent.click(getByText('Update'));

    // Should see confirmation modal first
    expect(getByText(/Confirm Mass Update/i)).toBeTruthy();
    expect(getByText(/update the expiry date for 5 players/i)).toBeTruthy();

    // Confirm
    const confirmBtn = getByText('Update', { selector: 'button.bg-brand-primary' }); // The modal button
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.updatePower).toHaveBeenCalled();
    });
  });

  test('validates invalid date', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });

    const { getByPlaceholderText, getByText, findByDisplayValue, findByText } = renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: 'invalid-date' } });

    fireEvent.click(getByText('Update'));

    expect(await findByText(/Invalid date format/i)).toBeTruthy();
    expect(api.updatePower).not.toHaveBeenCalled();
  });

  test('loading draft restores selections', async () => {
    const draftData = {
      power: mockPower,
      expiryDate: '01/01/2030',
      selectedPlins: ['1001#01']
    };

    const { getByDisplayValue, getByText } = renderWithRouter(<ExtendPower />, '/extend-power', { initialData: draftData });

    expect(getByDisplayValue('Flight')).toBeTruthy();
    expect(getByDisplayValue('01/01/2030')).toBeTruthy();
    expect(getByText('1 Selected')).toBeTruthy();
  });

  test('save draft saves selections', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });
    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);

    // Select just one
    fireEvent.change(filterInput, { target: { value: '1001' } });
    fireEvent.click(getByText('Select All'));

    fireEvent.click(getByText('Save Draft'));

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'power',
      data: expect.objectContaining({
        selectedPlins: ['1001#01']
      })
    }));
  });
});