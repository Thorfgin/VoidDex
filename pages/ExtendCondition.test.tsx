import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import ExtendCondition from './ExtendCondition';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

// ---- Mocks ----
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
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

const mockCondition = {
  coin: '8888',
  name: 'Space Flu',
  description: 'Coughing',
  assignments: [
    { plin: '1234#12', expiryDate: '01/01/2025' },
    { plin: '5555#55', expiryDate: '01/01/2025' },
    { plin: '9999#99', expiryDate: '01/01/2025' },
  ],
  remarks: '',
  csRemarks: '',
};

describe('ExtendCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches and finds condition by COIN', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(
        <ExtendCondition />,
        '/extend-condition',
    );

    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));

    expect(await findByDisplayValue('Space Flu')).toBeTruthy();
    expect(apiMock.searchConditionByCoin).toHaveBeenCalledWith('8888');
  });

  test('filters players and toggles select all for filtered vs all', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(
        <ExtendCondition />,
        '/extend-condition',
    );

    // Load condition
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Space Flu');

    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');

    // Open dropdown
    fireEvent.focus(filterInput);

    // Filter for a single PLIN
    fireEvent.change(filterInput, { target: { value: '1234' } });

    // Select All (filtered)
    fireEvent.click(getByText('Select All'));

    // Badge should show 1 Selected
    expect(getByText('1 Selected')).toBeTruthy();

    // Clear filter and select all remaining
    fireEvent.change(filterInput, { target: { value: '' } });
    fireEvent.click(getByText('Select All'));

    // Now all three should be selected
    expect(getByText('3 Selected')).toBeTruthy();
  });

  test('validates invalid expiry date before updating', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });

    const {
      getByPlaceholderText,
      getByText,
      findByDisplayValue,
      queryByText,
    } = renderWithRouter(<ExtendCondition />, '/extend-condition');

    // Load condition
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Space Flu');

    // Open dropdown & select all players
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    // Enter an out-of-range date (still valid dd/mm/yyyy format)
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '99/99/2022' } });

    // Try to update
    fireEvent.click(getByText('Update'));

    await waitFor(() => {
      // validateExpiryDate should return "Day must be between 1 and 31"
      const errorNode = queryByText(/Day must be between 1 and 31/i);
      expect(errorNode).toBeTruthy();
      expect(apiMock.updateCondition).not.toHaveBeenCalled();
    });
  });


  test('updates expiry date for all selected players', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });
    apiMock.updateCondition.mockResolvedValue({
      success: true,
      data: mockCondition,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(
        <ExtendCondition />,
        '/extend-condition',
    );

    // Load condition
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '8888' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Space Flu');

    // Select all players via dropdown
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All'));

    // Change date to a valid future value
    const dateInput = getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')");
    fireEvent.change(dateInput, { target: { value: '31/12/2030' } });

    // Trigger update
    fireEvent.click(getByText('Update'));

    await waitFor(() => {
      expect(apiMock.updateCondition).toHaveBeenCalled();
    });

    const callArgs = (apiMock.updateCondition as jest.Mock).mock.calls[0];
    const [, payload] = callArgs as [string, { assignments: any[] }];

    expect(callArgs[0]).toBe('8888');
    expect(payload.assignments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ plin: '1234#12', expiryDate: '31/12/2030' }),
          expect.objectContaining({ plin: '5555#55', expiryDate: '31/12/2030' }),
          expect.objectContaining({ plin: '9999#99', expiryDate: '31/12/2030' }),
        ]),
    );
  });

  test('saves an extend draft for a loaded condition', async () => {
    const { getByPlaceholderText, getByText } = renderWithRouter(
        <ExtendCondition />,
        '/extend-condition',
        { item: mockCondition },
    );

    // At this point the condition is already loaded, so we can open the dropdown
    const filterInput = getByPlaceholderText('Filter by PLIN or Name...');
    fireEvent.focus(filterInput);
    fireEvent.click(getByText('Select All')); // select all 3

    // Expiry date will default to the first assignment's expiry; saving draft now
    fireEvent.click(getByText('Save Draft'));

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'condition',
          action: 'extend',
          title: 'Space Flu',
          subtitle: 'Extend COIN: 8888',
          data: expect.objectContaining({
            condition: mockCondition,
            expiryDate: '01/01/2025',
            selectedPlins: expect.arrayContaining(['1234#12', '5555#55', '9999#99']),
          }),
        }),
    );
  });
});
