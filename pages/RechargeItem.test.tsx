import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import RechargeItem from './RechargeItem';
// @ts-ignore – module is mocked below
import * as api from '../services/api';
// @ts-ignore – module is mocked below
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../utils/testUtils';

jest.mock('../services/api', () => ({
  searchItemByItin: jest.fn(),
  updateItem: jest.fn(),
  getCharacterName: jest.fn((plin: string) =>
      plin === '1234#12' ? 'Test User' : ''
  ),
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

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

const mockItemData = {
  itin: '1234',
  name: 'Test Item',
  description: 'Desc',
  owner: '1234#12',
  expiryDate: '01/01/2024',
  remarks: '',
  csRemarks: '',
};

describe('RechargeItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches and displays item details', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } =
        renderWithRouter(<RechargeItem />, '/recharge-item');

    const searchInput = getByPlaceholderText('4-digit ID');
    fireEvent.change(searchInput, { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));

    expect(await findByDisplayValue('Test Item')).toBeTruthy();
    expect(getByText('Save Draft')).toBeTruthy();
  });

  test('validates invalid expiry date (format)', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    const {
      getByPlaceholderText,
      getByText,
      findByDisplayValue,
      getByDisplayValue,
      findByText,
    } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    // The input currently has '01/01/2024' (length 10).
    // To bypass the masking logic and *not* get auto-clamped, we provide
    // a *shorter* string so handleDateChange takes the "raw" value branch.
    const dateInput = getByDisplayValue('01/01/2024');
    fireEvent.change(dateInput, { target: { value: 'invalid' } });

    fireEvent.click(getByText('Update'));

    // The validator should now catch this as an invalid format
    expect(await findByText(/Invalid date format/i)).toBeTruthy();
    expect(apiMock.updateItem).not.toHaveBeenCalled();
  });

  test('successfully updates expiry date', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });
    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: { ...mockItemData, expiryDate: '01/01/2025' },
    });

    const {
      getByPlaceholderText,
      getByText,
      findByDisplayValue,
      getByDisplayValue,
    } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    fireEvent.change(getByDisplayValue('01/01/2024'), {
      target: { value: '01/01/2025' },
    });

    fireEvent.click(getByText('Update'));

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', {
        expiryDate: '01/01/2025',
      });
    });

    expect(getByText(/Success! Expiry updated/i)).toBeTruthy();
  });

  test('saves draft with updated expiry date', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    const {
      getByPlaceholderText,
      getByText,
      findByDisplayValue,
      getByDisplayValue,
      findByText,
    } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    fireEvent.change(getByDisplayValue('01/01/2024'), {
      target: { value: '01/01/2025' },
    });

    fireEvent.click(getByText('Save Draft'));

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recharge',
          type: 'item',
          data: expect.objectContaining({
            expiryDate: '01/01/2025',
          }),
        })
    );

    expect(await findByText('Draft saved successfully.')).toBeTruthy();
  });

  test('adds 1 year and rounds to 1st of month', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    const {
      getByPlaceholderText,
      getByText,
      findByDisplayValue,
      getByDisplayValue,
      getByTitle,
    } = renderWithRouter(<RechargeItem />, '/recharge-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    const plusBtn = getByTitle('+1 Year (Round to 1st)');
    fireEvent.click(plusBtn);

    expect(getByDisplayValue('01/01/2025')).toBeTruthy();

    fireEvent.change(getByDisplayValue('01/01/2025'), {
      target: { value: '15/05/2025' },
    });
    fireEvent.click(plusBtn);

    // 15/05/2025 + 1 year -> 15/05/2026 -> round to 1st next month -> 01/06/2026
    expect(getByDisplayValue('01/06/2026')).toBeTruthy();
  });
});
