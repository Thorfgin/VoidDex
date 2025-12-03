import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import AssignItem from './AssignItem';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

// Mock API
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
  expiryDate: '01/01/2025',
  remarks: '',
  csRemarks: ''
};

describe('AssignItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saves draft correctly', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue } = renderWithRouter(<AssignItem />, '/assign-item');

    // Load item
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    // Change owner
    const ownerInput = getByDisplayValue('1234#12');
    fireEvent.change(ownerInput, { target: { value: '9999#11' } });

    // Save Draft
    fireEvent.click(getByText('Save Draft'));

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'item',
      action: 'assign',
      data: expect.objectContaining({ owner: '9999#11' })
    }));
  });

  test('handles successful assignment (reassign) and clears draft', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    (api.updateItem as any).mockResolvedValue({ success: true, data: { ...mockItemData, owner: '9999#11' } });

    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue } = renderWithRouter(<AssignItem />, '/assign-item', { draftId: 'd1' });

    // Load item
    fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '1234' } });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    // Change owner
    fireEvent.change(getByDisplayValue('1234#12'), { target: { value: '9999#11' } });

    // Click Assign
    fireEvent.click(getByText('Assign'));

    await waitFor(() => {
      expect(api.updateItem).toHaveBeenCalledWith('1234', { owner: '9999#11' });
    });
    expect(offlineStorage.deleteStoredChange).toHaveBeenCalledWith('d1');
  });

  test('requires confirmation to unassign (clear owner)', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItemData });
    (api.updateItem as any).mockResolvedValue({ success: true, data: { ...mockItemData, owner: '' } });

    const { getByText, findByDisplayValue, getByDisplayValue } = renderWithRouter(<AssignItem />, '/assign-item');

    // Load item
    const input = document.querySelector('input[placeholder="4-digit ID"]');
    if(input) {
      fireEvent.change(input, { target: { value: '1234' } });
      fireEvent.click(getByText('Find'));
    }

    await findByDisplayValue('Test Item');

    // Clear owner
    fireEvent.change(getByDisplayValue('1234#12'), { target: { value: '' } });

    // First Click: Should trigger confirm state
    fireEvent.click(getByText('Unassign'));

    expect(getByText(/Confirm Unassign/)).toBeTruthy();
    expect(getByText(/Are you sure you want to remove the player/)).toBeTruthy();

    // Second Click: Actually executes
    fireEvent.click(getByText('Confirm Unassign'));

    await waitFor(() => {
      expect(api.updateItem).toHaveBeenCalledWith('1234', { owner: '' });
    });
  });
});