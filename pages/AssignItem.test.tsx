import { fireEvent, waitFor, screen } from '@testing-library/react';
import { describe, test, jest, beforeEach } from '@jest/globals';
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
  csRemarks: '',
};

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

describe('AssignItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupWithSearchResult = async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    const utils = renderWithRouter(<AssignItem />, '/assign-item');

    const itinInput = utils.getByPlaceholderText('4-digit ID');
    const findBtn = utils.getByText('Find');

    fireEvent.change(itinInput, { target: { value: '1234' } });
    fireEvent.click(findBtn);

    await utils.findByDisplayValue('Test Item');

    return utils;
  };

  test('searches and loads item data', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    const { getByPlaceholderText, getByText, findByDisplayValue } =
        renderWithRouter(<AssignItem />, '/assign-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));

    await waitFor(() => {
      expect(apiMock.searchItemByItin).toHaveBeenCalledWith('1234');
    });

    expect(await findByDisplayValue('Test Item')).toBeTruthy();
    expect(screen.getByDisplayValue('1234#12')).toBeTruthy();
  });

  test('shows "Not found" when item is not found', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: false,
      data: null,
    } as any);

    const { getByPlaceholderText, getByText, findByText } = renderWithRouter(
        <AssignItem />,
        '/assign-item',
    );

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '9999' },
    });
    fireEvent.click(getByText('Find'));

    expect(await findByText('Not found')).toBeTruthy();
  });

  test('shows "Error" when search throws', async () => {
    apiMock.searchItemByItin.mockRejectedValue(new Error('Network error'));

    const { getByPlaceholderText, getByText, findByText } = renderWithRouter(
        <AssignItem />,
        '/assign-item',
    );

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));

    expect(await findByText('Error')).toBeTruthy();
  });

  test('saves draft correctly', async () => {
    await setupWithSearchResult();

    const ownerInput = screen.getByDisplayValue('1234#12');
    fireEvent.change(ownerInput, { target: { value: '9999#11' } });

    fireEvent.click(screen.getByText('Save Draft'));

    expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'item',
          action: 'assign',
          data: expect.objectContaining({
            owner: '9999#11',
          }),
          title: mockItemData.name,
          subtitle: `Assign ITIN: ${mockItemData.itin}`,
        }),
    );
  });

  test('prevents invalid PLIN format on update', async () => {
    await setupWithSearchResult();

    const ownerInput = screen.getByDisplayValue('1234#12');
    const assignBtn = screen.getByText('Assign');

    // Use numeric value without # so it survives formatPLIN but fails the regex
    fireEvent.change(ownerInput, { target: { value: '1234' } });
    fireEvent.click(assignBtn);

    expect(
        await screen.findByText('Player PLIN must be format 1234#12 or 12#1'),
    ).toBeTruthy();

    expect(apiMock.updateItem).not.toHaveBeenCalled();
  });


  test('handles successful assignment (reassign) without draft', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });
    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: { ...mockItemData, owner: '9999#11' },
    });

    const { getByPlaceholderText, getByText, findByDisplayValue, getByDisplayValue } =
        renderWithRouter(<AssignItem />, '/assign-item');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: { value: '1234' },
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Test Item');

    const ownerInput = getByDisplayValue('1234#12');
    fireEvent.change(ownerInput, { target: { value: '9999#11' } });

    const assignBtn = getByText('Assign');
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', {
        owner: '9999#11',
      });
    });

    // Success message for reassign
    expect(
        screen.getByText('Unassigned 1234#12, Assigned 9999#11'),
    ).toBeTruthy();

    // After success, action buttons disappear (isSuccess === true)
    expect(screen.queryByText('Save Draft')).toBeNull();
    expect(screen.queryByText('Assign')).toBeNull();
    expect(screen.queryByText('Unassign')).toBeNull();
  });

  test('requires confirmation to unassign (clear owner)', async () => {
    await setupWithSearchResult();

    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: { ...mockItemData, owner: '' },
    });

    const ownerInput = screen.getByDisplayValue('1234#12');

    // Clear owner
    fireEvent.change(ownerInput, { target: { value: '' } });

    // First click: triggers confirmation state
    const unassignBtn = screen.getByText('Unassign');
    fireEvent.click(unassignBtn);

    expect(screen.getByText(/Confirm Unassign/)).toBeTruthy();
    expect(
        screen.getByText(/Are you sure you want to remove the player/i),
    ).toBeTruthy();

    // Second click: actually unassigns
    const confirmBtn = screen.getByText('Confirm Unassign');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', { owner: '' });
    });
  });

  test('processes existing draft via confirmation modal', async () => {
    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: { ...mockItemData, owner: '9999#11' },
    });

    // Load from a stored draft (no search required)
    renderWithRouter(<AssignItem />, '/assign-item', {
      initialData: {
        item: mockItemData,
        owner: '1234#12',
      },
      draftId: 'draft-1',
      draftTimestamp: Date.now(),
    });

    const ownerInput = screen.getByDisplayValue('1234#12');

    fireEvent.change(ownerInput, { target: { value: '9999#11' } });

    // First click triggers "Process Draft?" confirm modal
    fireEvent.click(screen.getByText('Assign'));

    expect(screen.getByText('Process Draft?')).toBeTruthy();
    expect(
        screen.getByText(
            'The object may have been changed since this draft was stored. Proceed?',
        ),
    ).toBeTruthy();
    expect(screen.getByText('Process')).toBeTruthy();

    // Confirm processing
    fireEvent.click(screen.getByText('Process'));

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', {
        owner: '9999#11',
      });
      expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith('draft-1');
    });
  });
});
