import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import ExtendCondition from './ExtendCondition';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
  searchConditionByCoin: jest.fn(),
  updateCondition: jest.fn(),
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

const mockCondition = {
  coin: '8888',
  name: 'Space Flu',
  description: 'Coughing',
  assignments: [
      { plin: '1234#12', expiryDate: '01/01/2025' },
      { plin: '5555#55', expiryDate: '01/01/2025' },
      { plin: '9999#99', expiryDate: '01/01/2025' }
  ],
  remarks: '',
  csRemarks: ''
};

describe('ExtendCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches and finds condition', async () => {
    (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCondition });
    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));

    expect(await findByDisplayValue('Space Flu')).toBeTruthy();
  });

  test('filters players and selects all visible', async () => {
    (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCondition });
    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendCondition />, '/extend-condition');

    // Load
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Space Flu');

    // Open Dropdown
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);

    // Filter for '1234'
    fireEvent.change(filterInput, { target: { value: '1234' } });

    // Select All (Filtered)
    fireEvent.click(getByText('Select All'));

    expect(getByText('1 Selected')).toBeTruthy();

    // Clear filter and select remaining
    fireEvent.change(filterInput, { target: { value: '' } });
    fireEvent.click(getByText('Select All')); // Should select the rest

    expect(getByText('3 Selected')).toBeTruthy();
  });

  test('mass updates expiry date', async () => {
    (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCondition });
    (api.updateCondition as any).mockResolvedValue({ success: true, data: mockCondition });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<ExtendCondition />, '/extend-condition');

    // Load
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Space Flu');

    // Select All
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    // Change Date
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '31/12/2030' } });

    // Update
    fireEvent.click(getByText('Update'));

    await waitFor(() => {
        expect(api.updateCondition).toHaveBeenCalledWith('8888', expect.objectContaining({
            assignments: expect.arrayContaining([
                expect.objectContaining({ plin: '1234#12', expiryDate: '31/12/2030' }),
                expect.objectContaining({ plin: '5555#55', expiryDate: '31/12/2030' })
            ])
        }));
    });
  });
});