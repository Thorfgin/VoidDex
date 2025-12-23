import {fireEvent, waitFor, screen} from '@testing-library/react';
import AssignItem from './AssignItem';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import {renderWithRouter} from '../utils/testUtils';

/**
 * Centralized mapping of all data-testid attributes and common selectors.
 */
const SELECTORS = {
  ITIN_SEARCH_INPUT: 'itin-search-input',
  FIND_ITEM_BUTTON: 'find-item-button',
  SEARCH_ERROR_MESSAGE: 'search-error-message',
  OWNER_PLIN_INPUT: 'owner-plin-input',
  ASSIGN_UNASSIGN_BUTTON: 'assign-unassign-button',
  SAVE_DRAFT_BUTTON: 'save-draft-button',
  STATUS_MESSAGE_SUCCESS: 'status-message-success',
  STATUS_MESSAGE_ERROR: 'status-message-error',
  UNASSIGN_CONFIRM_MESSAGE: 'unassign-confirmation-message',
  ITEM_NAME_DISPLAY: 'item-name-display',
  DRAFT_TIMESTAMP_DISPLAY: 'draft-timestamp-display',
};

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

/**
 * Test suite for the AssignItem component.
 */
describe('AssignItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Performs a successful item search and waits for the details to load.
   */
  const setupWithSearchResult = async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    renderWithRouter(<AssignItem/>, '/assign-item');

    fireEvent.change(screen.getByTestId(SELECTORS.ITIN_SEARCH_INPUT), {target: {value: '1234'}});
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_ITEM_BUTTON));

    await screen.findByDisplayValue('Test Item');
  };

  /**
   * Tests searching and successful loading of item data.
   */
  test('searches and loads item data', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });

    renderWithRouter(<AssignItem/>, '/assign-item');

    fireEvent.change(screen.getByTestId(SELECTORS.ITIN_SEARCH_INPUT), {
      target: {value: '1234'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_ITEM_BUTTON));

    await waitFor(() => {
      expect(apiMock.searchItemByItin).toHaveBeenCalledWith('1234');
    });

    expect(await screen.findByDisplayValue('Test Item')).toBeTruthy();
    expect(screen.getByDisplayValue(/1234#12/i)).toBeTruthy();
  });

  /**
   * Tests that the "Item not found" message is shown for unsuccessful search.
   */
  test('shows "Item not found" when item is not found', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: false,
      data: null,
    } as any);

    renderWithRouter(<AssignItem/>, '/assign-item');

    fireEvent.change(screen.getByTestId(SELECTORS.ITIN_SEARCH_INPUT), {
      target: {value: '9999'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_ITEM_BUTTON));

    // Use test ID to search for an error message
    expect(await screen.findByTestId(SELECTORS.SEARCH_ERROR_MESSAGE)).toBeTruthy();
  });

  /**
   * Tests that a generic error message is shown when the search API call fails.
   */
  test('shows "Error" when search throws', async () => {
    apiMock.searchItemByItin.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<AssignItem/>, '/assign-item');

    fireEvent.change(screen.getByTestId(SELECTORS.ITIN_SEARCH_INPUT), {
      target: {value: '1234'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_ITEM_BUTTON));

    // Use test ID to search an error message
    expect(await screen.findByTestId(SELECTORS.SEARCH_ERROR_MESSAGE)).toBeTruthy();
  });

  /**
   * Tests that unsaved changes are correctly saved to local draft storage.
   */
  test('saves draft correctly', async () => {
    await setupWithSearchResult();

    const ownerInput = screen.getByDisplayValue(/1234#12/i);
    fireEvent.change(ownerInput, {target: {value: '9999#11'}});

    fireEvent.click(screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON));

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

  /**
   * Tests that the update is blocked, and an error is shown for invalid PLIN format.
   */
  test('prevents invalid PLIN format on update', async () => {
    await setupWithSearchResult();

    const ownerInput = screen.getByDisplayValue(/1234#12/i);
    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_UNASSIGN_BUTTON);

    fireEvent.change(ownerInput, {target: {value: '1234'}});
    fireEvent.click(assignBtn);

    // Use test ID for a status error message and check content
    expect(
      await screen.findByTestId(SELECTORS.STATUS_MESSAGE_ERROR),
    ).toHaveTextContent('Player PLIN must be format 1234#12');

    expect(apiMock.updateItem).not.toHaveBeenCalled();
  });


  /**
   * Tests a successful reassignment process without relying on a draft.
   */
  test('handles successful assignment (reassign) without draft', async () => {
    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: mockItemData,
    });
    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: {...mockItemData, owner: '9999#11'},
    });

    renderWithRouter(<AssignItem/>, '/assign-item');

    fireEvent.change(screen.getByTestId(SELECTORS.ITIN_SEARCH_INPUT), {
      target: {value: '1234'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_ITEM_BUTTON));
    await screen.findByDisplayValue('Test Item');

    const ownerInput = screen.getByDisplayValue(/1234#12/i);
    fireEvent.change(ownerInput, {target: {value: '9999#11'}});

    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_UNASSIGN_BUTTON);
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', {
        owner: '9999#11',
      });
    });

    // Use test ID to search an error message and check content. Using findByTestId
    // ensures we wait for the element to appear after the async update.
    expect(
      await screen.findByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)
    ).toHaveTextContent('Reassigned from 1234#12 to 9999#11.');

    expect(screen.queryByTestId(SELECTORS.SAVE_DRAFT_BUTTON)).toBeNull();
    expect(screen.queryByTestId(SELECTORS.ASSIGN_UNASSIGN_BUTTON)).toBeNull();
  });

  /**
   * Tests that unassigning the item requires a two-click confirmation process.
   */
  test('requires confirmation to unassign (clear owner)', async () => {
    await setupWithSearchResult();

    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: {...mockItemData, owner: ''},
    });

    const ownerInput = screen.getByDisplayValue(/1234#12/i);

    fireEvent.change(ownerInput, {target: {value: ''}});

    const unassignBtn = screen.getByTestId(SELECTORS.ASSIGN_UNASSIGN_BUTTON);
    fireEvent.click(unassignBtn);

    expect(screen.getByText('Confirm Unassign')).toBeTruthy();
    expect(
      screen.getByTestId(SELECTORS.UNASSIGN_CONFIRM_MESSAGE),
    ).toBeTruthy();

    const confirmBtn = screen.getByText('Confirm Unassign');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', {owner: ''});
    });
  });

  /**
   * Tests that an existing draft is processed via a confirmation modal and deleted upon successful update.
   */
  test('processes existing draft via confirmation modal', async () => {
    apiMock.updateItem.mockResolvedValue({
      success: true,
      data: {...mockItemData, owner: '9999#11'},
    });

    renderWithRouter(<AssignItem/>, '/assign-item', {
      initialData: {
        item: mockItemData,
        owner: '1234#12',
      },
      draftId: 'draft-1',
      draftTimestamp: Date.now(),
    });

    const ownerInput = screen.getByDisplayValue(/1234#12/i);
    fireEvent.change(ownerInput, {target: {value: '9999#11'}});
    fireEvent.click(screen.getByTestId(SELECTORS.ASSIGN_UNASSIGN_BUTTON));

    expect(screen.getByText('Process Draft?')).toBeTruthy();
    expect(
      screen.getByText(
        'The object may have been changed since this draft was stored. Proceed with the draft assignment?',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByText('Process Draft'));

    await waitFor(() => {
      expect(apiMock.updateItem).toHaveBeenCalledWith('1234', {
        owner: '9999#11',
      });
      expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith('draft-1');
    });
  });
});