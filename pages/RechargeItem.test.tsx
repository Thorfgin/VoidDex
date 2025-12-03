import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import RechargeItem from './RechargeItem';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
  searchItemByItin: jest.fn(),
  updateItem: jest.fn(),
  getCharacterName: jest.fn((plin) => plin === '1234#12' ? 'Test User' : ''),
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

const mockItemData = {
  itin: '1234',
  name: 'Test Item',
  description: 'Desc',
  owner: '1234#12',
  expiryDate: '01/01/2024',
  remarks: '',
  csRemarks: ''
};

describe('RechargeItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches and displays item details', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<RechargeItem />, '/recharge-item');
    
    const searchInput = getByPlaceholderText('4-digit ID');
    fireEvent.change(searchInput, { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));

    expect(await findByDisplayValue('Test Item')).toBeTruthy();
    expect(getByText('Save Draft')).toBeTruthy();
  });

  test('validates invalid expiry date', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    const dateInput = getByDisplayValue('01/01/2024');
    fireEvent.change(dateInput, { target: { value: '99/99/2025' } });

    fireEvent.click(getByText('Update'));

    expect(getByText(/Invalid calendar date/i)).toBeTruthy();
    expect(api.updateItem).not.toHaveBeenCalled();
  });

  test('successfully updates expiry date', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    (api.updateItem as any).mockResolvedValue({ success: true, data: { ...mockItemData, expiryDate: '01/01/2025' } });

    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    fireEvent.change(getByDisplayValue('01/01/2024'), { target: { value: '01/01/2025' } });

    fireEvent.click(getByText('Update'));

    await waitFor(() => {
        expect(api.updateItem).toHaveBeenCalledWith('1234', { expiryDate: '01/01/2025' });
    });
    expect(getByText(/Success! Expiry updated/i)).toBeTruthy();
  });

  test('saves draft and updates baseline to prevent dirty warning', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue, findByText, getByTitle, queryByText } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    fireEvent.change(getByDisplayValue('01/01/2024'), { target: { value: '01/01/2025' } });

    fireEvent.click(getByText('Save Draft'));

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
      action: 'recharge',
      data: expect.objectContaining({ expiryDate: '01/01/2025' })
    }));

    await findByText('Draft saved successfully.');

    fireEvent.click(getByTitle('Dashboard'));
    expect(queryByText('Discard Changes?')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('adds 1 year and rounds to 1st of month', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue, getByTitle } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    const plusBtn = getByTitle('+1 Year (Round to 1st)');
    fireEvent.click(plusBtn);

    expect(getByDisplayValue('01/01/2025')).toBeTruthy();

    fireEvent.change(getByDisplayValue('01/01/2025'), { target: { value: '15/05/2025' } });
    fireEvent.click(plusBtn);

    expect(getByDisplayValue('01/06/2026')).toBeTruthy();
  });

  test('loads from draft state', () => {
    const draftState = {
      initialData: {
        item: mockItemData,
        expiryDate: '01/01/2030'
      },
      draftId: 'draft-99'
    };

    const { getByDisplayValue } = renderWithRouter(<RechargeItem />, '/recharge-item', draftState);

    expect(getByDisplayValue('Test Item')).toBeTruthy();
    expect(getByDisplayValue('01/01/2030')).toBeTruthy();
  });
});