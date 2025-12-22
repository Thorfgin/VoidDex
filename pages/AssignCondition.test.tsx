import {fireEvent, waitFor, screen} from '@testing-library/react';
import AssignCondition from './AssignCondition';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import {Condition} from '../types';
import {renderWithRouter} from '../utils/testUtils';

/**
 * Maps all data-testid attributes and common text selectors used throughout the tests
 * to ensure robust and centralized selectors.
 */
const SELECTORS = {
  COIN_SEARCH_INPUT: 'coin-search-input',
  FIND_COIN_BUTTON: 'find-coin-button',
  SEARCH_ERROR_MESSAGE: 'search-error-message',
  CONDITION_NAME_DISPLAY: 'condition-name-display',
  ADD_PLAYER_PLIN_INPUT: 'add-player-plin-input',
  ADD_PLAYER_EXPIRY_INPUT: 'add-player-expiry-input',
  ASSIGN_BUTTON: 'assign-button',
  REMOVE_PLAYER_FILTER_INPUT: 'remove-player-filter-input',
  SELECT_ALL_BUTTON: 'select-all-button',
  REMOVE_SELECTED_BUTTON: 'remove-selected-button',
  STATUS_MESSAGE_SUCCESS: 'status-message-success',
  STATUS_MESSAGE_ERROR: 'status-message-error',
  SAVE_DRAFT_BUTTON: 'save-draft-button',
  DRAFT_INDICATOR: 'draft-indicator',
};

// Mocks
jest.mock('../services/api', () => ({
  searchConditionByCoin: jest.fn(),
  updateCondition: jest.fn(),
  getCharacterName: jest.fn((plin: string) =>
    plin === '1234#12' ? 'User A' : ''
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

/**
 * Mock date utilities if used in validation/default values.
 */
jest.mock('../utils/dateUtils', () => ({
  getDefaultExpiry: jest.fn(() => '01/01/2030'),
  formatDate: jest.fn(date => date),
}));

const mockCondition: Condition = {
  coin: '9001',
  name: 'Space Plague',
  description: 'Very bad',
  assignments: [
    {plin: '1234#12', expiryDate: '01/01/2030'},
    {plin: '5555#55', expiryDate: '01/01/2030'},
    {plin: '9999#99', expiryDate: '01/01/2030'},
  ],
  remarks: '',
  csRemarks: '',
};

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

// -----------------------------------------------------------------

/**
 * Test suite for the AssignCondition component.
 */
describe('AssignCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Performs a successful COIN search setup and waits for the details to load.
   * This simplifies test setup by abstracting the search phase.
   * @returns {Promise<void>}
   */
  const setupWithSearchResult = async (): Promise<void> => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });

    renderWithRouter(<AssignCondition/>, '/assign-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {target: {value: '9001'}});
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));

    await screen.findByDisplayValue('Space Plague');
  };

  /**
   * Tests searching for a condition by COIN and successful display of details.
   */
  test('searches and finds condition', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });

    renderWithRouter(<AssignCondition/>, '/assign-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {
      target: {value: '9001'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));

    await waitFor(() => {
      expect(apiMock.searchConditionByCoin).toHaveBeenCalledTimes(1);
      expect(apiMock.searchConditionByCoin).toHaveBeenCalledWith('9001');
    });

    expect(await screen.findByDisplayValue('Space Plague')).toBeInTheDocument();
  });

  /**
   * Tests that the "Not found" message is displayed upon a failed search response.
   */
  test('shows "Not found" when condition is not found', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: false,
      data: null,
    } as any);

    renderWithRouter(
      <AssignCondition/>,
      '/assign-condition',
    );

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {
      target: {value: '1111'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));

    expect(await screen.findByTestId(SELECTORS.SEARCH_ERROR_MESSAGE)).toHaveTextContent('Not found');
  });

  /**
   * Tests that a generic "Error" message is displayed when the search API call fails.
   */
  test('shows "Error" when search throws', async () => {
    apiMock.searchConditionByCoin.mockRejectedValue(new Error('Network error'));

    renderWithRouter(
      <AssignCondition/>,
      '/assign-condition',
    );

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {
      target: {value: '9001'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));

    expect(await screen.findByTestId(SELECTORS.SEARCH_ERROR_MESSAGE)).toHaveTextContent('Error');
  });

  /**
   * Tests the assignment process, including validation for duplicates and successful update.
   */
  test('validates and assigns new player (duplicate, success)', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });
    apiMock.updateCondition.mockResolvedValue({
      success: true,
      data: {
        ...mockCondition,
        assignments: [
          ...mockCondition.assignments,
          {plin: '8888#88', expiryDate: '01/01/2030'},
        ],
      },
    });

    renderWithRouter(<AssignCondition/>, '/assign-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {
      target: {value: '9001'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));
    await screen.findByDisplayValue('Space Plague');

    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_BUTTON);
    const plinInput = screen.getByTestId(SELECTORS.ADD_PLAYER_PLIN_INPUT);

    fireEvent.change(plinInput, {target: {value: '1234#12'}});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('Player is already assigned.');
    });

    fireEvent.change(plinInput, {target: {value: '8888#88'}});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(apiMock.updateCondition).toHaveBeenCalledWith(
        '9001',
        expect.objectContaining({
          assignments: expect.arrayContaining([
            expect.objectContaining({plin: '8888#88'}),
          ]),
        }),
      );
    });

    expect(await screen.findByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Assigned 8888#88');
  });

  /**
   * Tests display of validation errors for invalid PLIN format and invalid expiry date format.
   */
  test('shows validation errors for invalid PLIN and expiry date', async () => {
    await setupWithSearchResult();

    const plinInput = screen.getByTestId(SELECTORS.ADD_PLAYER_PLIN_INPUT);
    const expiryInput = screen.getByTestId(SELECTORS.ADD_PLAYER_EXPIRY_INPUT);
    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_BUTTON);

    fireEvent.change(plinInput, {target: {value: '123#'}});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('PLIN format: 1234#12');
    });

    fireEvent.change(plinInput, {target: {value: '7777#77'}});
    fireEvent.change(expiryInput, {target: {value: '123'}});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('Invalid Expiry Date format.');
    });
  });

  /**
   * Tests the successful removal of all players using the 'Select All' functionality.
   */
  test('removes selected players', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: mockCondition,
    });
    apiMock.updateCondition.mockResolvedValue({
      success: true,
      data: {...mockCondition, assignments: []},
    });

    renderWithRouter(<AssignCondition/>, '/assign-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {
      target: {value: '9001'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));
    await screen.findByDisplayValue('Space Plague');

    const filterInput = screen.getByTestId(SELECTORS.REMOVE_PLAYER_FILTER_INPUT);
    fireEvent.focus(filterInput);

    await waitFor(() => screen.getByText('Select All'));
    fireEvent.click(screen.getByText('Select All'));

    const removeBtn = screen.getByTestId(SELECTORS.REMOVE_SELECTED_BUTTON);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(apiMock.updateCondition).toHaveBeenCalledWith('9001', {
        assignments: [],
      });
    });
  });

  /**
   * Verifies that the 'Remove Selected' button is disabled when no players have been selected for removal.
   */
  test('remove button is disabled when no players are selected', async () => {
    await setupWithSearchResult();
    const removeBtn = screen.getByTestId(SELECTORS.REMOVE_SELECTED_BUTTON) as HTMLButtonElement;
    expect(removeBtn).toBeDisabled();
  });


  /**
   * Tests the functionality for saving current unsaved changes to local draft storage.
   */
  test('saves unsaved changes as a draft', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({success: true, data: mockCondition});
    renderWithRouter(
      <AssignCondition/>, '/assign-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {target: {value: '9999'}});
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));
    await screen.findByDisplayValue(mockCondition.name);

    const plinInput = screen.getByTestId(SELECTORS.ADD_PLAYER_PLIN_INPUT);
    const expiryInput = screen.getByTestId(SELECTORS.ADD_PLAYER_EXPIRY_INPUT);
    const saveDraftBtn = screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON) as HTMLButtonElement;

    fireEvent.change(plinInput, {target: {value: '6666#66'}});
    fireEvent.change(expiryInput, {target: {value: '10/10/2025'}});

    expect(saveDraftBtn).not.toBeDisabled();

    fireEvent.click(saveDraftBtn);

    await waitFor(() => expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Draft saved successfully.'));

    await waitFor(() => {
      expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
    });

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          condition: mockCondition,
          newOwner: '6666#66',
          newExpiry: '10/10/2025',
          selectedRemovePlins: [],
        },
      }),
    );
  });


  /**
   * Tests that the Save Draft button correctly re-enables after a successful API call
   * if new, unsaved changes are introduced afterwards.
   */
  test('Save Draft re-enables after successful assignment and new input', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({success: true, data: mockCondition});
    apiMock.updateCondition.mockResolvedValue({
      success: true,
      data: {...mockCondition, assignments: [...mockCondition.assignments, {plin: '7777#77', expiryDate: '01/01/2030'}]}
    });

    renderWithRouter(<AssignCondition/>, '/assign-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.COIN_SEARCH_INPUT), {target: {value: '9001'}});
    fireEvent.click(screen.getByTestId(SELECTORS.FIND_COIN_BUTTON));
    await screen.findByDisplayValue('Space Plague');

    const plinInput = screen.getByTestId(SELECTORS.ADD_PLAYER_PLIN_INPUT);
    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_BUTTON);
    const saveDraftBtn = screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON) as HTMLButtonElement;

    fireEvent.change(plinInput, {target: {value: '7777#77'}});
    expect(saveDraftBtn).not.toBeDisabled();

    fireEvent.click(assignBtn);
    await waitFor(() => expect(screen.queryByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Assigned 7777#77'));

    expect(saveDraftBtn).toBeDisabled();

    fireEvent.change(plinInput, {target: {value: '6666#66'}});

    expect(saveDraftBtn).not.toBeDisabled();
  });

  /**
   * Tests that a successful assignment, executed from a loaded draft, results in the draft being deleted from storage.
   */
  test('successful assignment of a DRAFT deletes the draft from storage', async () => {
    const DRAFT_ID = 'test-draft-123';
    apiMock.updateCondition.mockResolvedValue({
      success: true,
      data: {
        ...mockCondition,
        assignments: [...mockCondition.assignments, {plin: '7777#77', expiryDate: '01/01/2030'}]
      }
    });

    const draftData = {
      condition: mockCondition,
      newOwner: '7777#77',
      newExpiry: '01/01/2030',
      selectedRemovePlins: [] as string[],
    };

    renderWithRouter(
      <AssignCondition/>,
      '/assign-condition',
      {
        initialData: draftData,
        draftId: DRAFT_ID,
        draftTimestamp: Date.now()
      }
    );

    expect(screen.getByText('(Draft)')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(SELECTORS.ASSIGN_BUTTON));

    await waitFor(() => screen.getByText('Process Draft?'));
    fireEvent.click(screen.getByText('Process'));

    await waitFor(() => {
      expect(apiMock.updateCondition).toHaveBeenCalledTimes(1);
    });

    expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith(DRAFT_ID);
    expect(await screen.findByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Assigned 7777#77');

    expect(screen.queryByText('(Draft)')).toBeNull();
  });
});