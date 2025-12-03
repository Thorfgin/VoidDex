import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import AssignPower from './AssignPower';
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
  description: 'Fly',
  assignments: [
    { plin: '1234#12', expiryDate: '01/01/2030' },
    { plin: '9999#99', expiryDate: '01/01/2030' }
  ],
  remarks: '',
  csRemarks: ''
};

describe('AssignPower Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates and adds new player', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });
    (api.updatePower as any).mockResolvedValue({ success: true, data: mockPower });

    const { getByPlaceholderText, getByText, findByDisplayValue, findByText } = renderWithRouter(<AssignPower />, '/assign-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    const assignBtn = getByText('Assign');
    fireEvent.click(assignBtn);
    expect(await findByText('Please enter a Player PLIN.')).toBeTruthy();

    fireEvent.change(getByPlaceholderText('1234#12'), { target: { value: '1234#12' } });
    fireEvent.click(assignBtn);
    expect(await findByText('Player is already assigned.')).toBeTruthy();

    fireEvent.change(getByPlaceholderText('1234#12'), { target: { value: '8888#88' } });

    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(api.updatePower).toHaveBeenCalledWith('6001', expect.objectContaining({
        assignments: expect.arrayContaining([
          expect.objectContaining({ plin: '8888#88' })
        ])
      }));
    });
  });

  test('removes selected players', async () => {
    (api.searchPowerByPoin as any).mockResolvedValue({ success: true, data: mockPower });
    (api.updatePower as any).mockResolvedValue({ success: true, data: mockPower });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<AssignPower />, '/assign-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '6001' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    const removeInput = getByPlaceholderText('Filter players to remove...');
    fireEvent.focus(removeInput);

    fireEvent.click(getByText('Select All'));

    const removeBtn = getByText(/Remove Selected/);

    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(api.updatePower).toHaveBeenCalledWith('6001', { assignments: [] });
    });
  });

  test('restores draft state correctly', () => {
    const draftData = {
      power: mockPower,
      newOwner: '7777#77',
      newExpiry: '01/01/2099',
      selectedRemovePlins: ['1234#12']
    };

    const { getByDisplayValue, getByText } = renderWithRouter(<AssignPower />, '/assign-power', { initialData: draftData });

    expect(getByDisplayValue('Flight')).toBeTruthy();
    expect(getByDisplayValue('7777#77')).toBeTruthy();
    expect(getByText('1 Selected')).toBeTruthy();
  });
});