import { fireEvent } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import AssignCondition from './AssignCondition';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { Condition } from '../types';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
  searchConditionByCoin: jest.fn(),
  updateCondition: jest.fn(),
  getCharacterName: jest.fn((plin) => plin === '1234#12' ? 'User A' : ''),
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

const mockCondition: Condition = {
  coin: '9001',
  name: 'Space Plague',
  description: 'Very bad',
  assignments: [
      { plin: '1234#12', expiryDate: '01/01/2030' },
      { plin: '5555#55', expiryDate: '01/01/2030' },
      { plin: '9999#99', expiryDate: '01/01/2030' }
  ],
  remarks: '',
  csRemarks: ''
};

describe('AssignCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads draft state with pending additions', () => {
    const draftData = {
        condition: mockCondition,
        newOwner: '5555#55',
        newExpiry: '31/12/2099',
        selectedRemovePlins: [] as string[]
    };

    const { getByDisplayValue } = renderWithRouter(<AssignCondition />, '/assign-condition', { initialData: draftData });

    expect(getByDisplayValue('Space Plague')).toBeTruthy();
    expect(getByDisplayValue('5555#55')).toBeTruthy();
    expect(getByDisplayValue('31/12/2099')).toBeTruthy();
  });

  test('saving draft saves state', () => {
    const draftData = {
        condition: mockCondition,
        newOwner: '',
        newExpiry: '',
        selectedRemovePlins: [] as string[]
    };
    const { getAllByPlaceholderText, getByText } = renderWithRouter(<AssignCondition />, '/assign-condition', { initialData: draftData });

    // The Add Player input has this placeholder
    const inputs = getAllByPlaceholderText('1234#12'); 
    fireEvent.change(inputs[0], { target: { value: '9999#99' } });

    fireEvent.click(getByText('Save Draft'));

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
        type: 'condition',
        data: expect.objectContaining({ newOwner: '9999#99' })
    }));
  });

  test('filters and selects multiple players for removal', () => {
    const { getByPlaceholderText, getByText } = renderWithRouter(<AssignCondition />, '/assign-condition', { 
        item: mockCondition, 
        mode: 'view' 
    });

    const filterInput = getByPlaceholderText('Filter players to remove...');
    fireEvent.focus(filterInput); // Open dropdown

    // Check if dropdown shows players (mocked getCharacterName returns 'User A' for 1234#12)
    expect(getByText('1234#12')).toBeTruthy();
    expect(getByText('5555#55')).toBeTruthy();

    // Filter
    fireEvent.change(filterInput, { target: { value: '1234' } });
    
    // Select All Filtered
    const selectAllBtn = getByText('Select All');
    fireEvent.click(selectAllBtn);

    expect(getByText('1 Selected')).toBeTruthy();

    // Clear filter
    fireEvent.change(filterInput, { target: { value: '' } });
    
    // Dropdown might need refocus to ensure "Select All" is for the new full list?
    // In component logic, changing input opens dropdown.
    
    fireEvent.click(getByText('Select All')); 
    // Now it should select the remaining unselected ones (total 3)
    expect(getByText('3 Selected')).toBeTruthy();
  });
});