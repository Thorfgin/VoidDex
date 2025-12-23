import {fireEvent, waitFor, screen} from '@testing-library/react';
import AssignPower from './AssignPower';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import {renderWithRouter} from '../utils/testUtils';

/**
 * Defines the Test IDs used for selecting elements in the AssignPower component.
 * NOTE: These selectors are updated to match the data-testid attributes in AssignPower.tsx.
 */
const SELECTORS = {
  SEARCH_POIN_INPUT: 'input-poin-search', // Was 'search-poin-input'
  SEARCH_BUTTON: 'btn-find-power',       // Was 'search-button'
  POWER_NAME_DISPLAY: 'display-name',     // Was 'power-name-display'
  POWER_DESCRIPTION_DISPLAY: 'display-description', // Was 'power-description-display'
  ASSIGN_BUTTON: 'btn-assign-player',     // Was 'assign-button'
  NEW_PLIN_INPUT: 'input-new-owner-plin', // Was 'new-plin-input'
  NEW_EXPIRY_INPUT: 'input-new-owner-expiry', // Was 'new-expiry-input'
  REMOVE_FILTER_INPUT: 'input-remove-filter', // Was 'remove-filter-input'
  REMOVE_SELECT_ALL_BUTTON: 'btn-toggle-select-all-filtered', // Was 'remove-select-all-button'
  REMOVE_SELECTED_BUTTON: 'btn-remove-selected', // Was 'remove-selected-button'
  SAVE_DRAFT_BUTTON: 'btn-save-draft',    // Was 'save-draft-button'
  DRAFT_PROCESS_BUTTON: 'draft-process-button', // Still unused, keeping key
  STATUS_MESSAGE: 'status-message',
  DRAFT_STATUS: 'draft-info',             // Was 'draft-status' (actual component ID is 'draft-info')
};

jest.mock('../services/api', () => ({
  searchPowerByPoin: jest.fn(),
  updatePower: jest.fn(),
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

jest.mock('../utils/dateUtils', () => ({
  getDefaultExpiry: jest.fn(() => '01/01/2030'),
  formatDate: jest.fn(date => date),
}));

const mockPower = {
  poin: '6001',
  name: 'Flight',
  description: 'Fly',
  assignments: [
    {plin: '1234#12', expiryDate: '01/01/2030'},
    {plin: '9999#99', expiryDate: '01/01/2030'},
  ],
  remarks: '',
  csRemarks: '',
};

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

describe('AssignPower Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to perform a successful POIN search and wait for results to load.
   */
  const setupWithSearchResult = async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    renderWithRouter(<AssignPower/>, '/assign-power');

    fireEvent.change(screen.getByTestId(SELECTORS.SEARCH_POIN_INPUT), {target: {value: '6001'}});
    fireEvent.click(screen.getByTestId(SELECTORS.SEARCH_BUTTON));

    await screen.findByTestId(SELECTORS.POWER_NAME_DISPLAY);
  };

  /**
   * Test case to verify that the power search function is called and results are displayed.
   */
  test('searches and finds power', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    renderWithRouter(<AssignPower/>, '/assign-power');

    fireEvent.change(screen.getByTestId(SELECTORS.SEARCH_POIN_INPUT), {
      target: {value: '6001'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.SEARCH_BUTTON));

    await waitFor(() => {
      expect(apiMock.searchPowerByPoin).toHaveBeenCalledTimes(1);
      expect(apiMock.searchPowerByPoin).toHaveBeenCalledWith('6001');
    });

    expect(await screen.findByTestId(SELECTORS.POWER_NAME_DISPLAY)).toBeInTheDocument();
  });

  /**
   * Test case to verify the display of a "Not found" status when the API returns no data.
   */
  test('shows "Not found" when power is not found', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: false,
      data: null,
    } as any);

    renderWithRouter(
      <AssignPower/>,
      '/assign-power',
    );

    fireEvent.change(screen.getByTestId(SELECTORS.SEARCH_POIN_INPUT), {
      target: {value: '1111'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.SEARCH_BUTTON));

    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  /**
   * Test case to verify the display of an "Error" status when the API call fails.
   */
  test('shows "Error" when search throws', async () => {
    apiMock.searchPowerByPoin.mockRejectedValue(new Error('Network error'));

    renderWithRouter(
      <AssignPower/>,
      '/assign-power',
    );

    fireEvent.change(screen.getByTestId(SELECTORS.SEARCH_POIN_INPUT), {
      target: {value: '6001'},
    });
    fireEvent.click(screen.getByTestId(SELECTORS.SEARCH_BUTTON));

    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  /**
   * Test case to validate assignment functionality, including duplicate checks and success flow.
   */
  test('validates and adds new player (duplicate, success)', async () => {
    await setupWithSearchResult();

    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_BUTTON);
    const plinInput = screen.getByTestId(SELECTORS.NEW_PLIN_INPUT);

    // Test duplicate PLIN
    fireEvent.change(plinInput, {target: {value: '1234#12'}});
    fireEvent.click(assignBtn);
    expect(
      await screen.findByTestId(SELECTORS.STATUS_MESSAGE),
    ).toHaveTextContent('Player is already assigned.');

    // Set mock response for successful update
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: {
        ...mockPower,
        assignments: [
          ...mockPower.assignments,
          {plin: '8888#88', expiryDate: '01/01/2030'}, // Add the newly assigned player
        ],
      },
    } as any);

    // Test successful assignment
    fireEvent.change(plinInput, {target: {value: '8888#88'}});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledWith(
        '6001',
        expect.objectContaining({
          assignments: expect.arrayContaining([
            expect.objectContaining({plin: '8888#88'}),
          ]),
        }),
      );
    });

    expect(await screen.findByTestId(SELECTORS.STATUS_MESSAGE)).toHaveTextContent('Assigned 8888#88');
  });

  /**
   * Test case to check for validation errors on invalid PLIN and expiry date formats.
   */
  test('shows validation errors for invalid PLIN and expiry date', async () => {
    await setupWithSearchResult();

    const plinInput = screen.getByTestId(SELECTORS.NEW_PLIN_INPUT);
    const expiryInput = screen.getByTestId(SELECTORS.NEW_EXPIRY_INPUT);
    const assignBtn = screen.getByTestId(SELECTORS.ASSIGN_BUTTON);

    // Test invalid PLIN format
    fireEvent.change(plinInput, {target: {value: '123#'}});
    fireEvent.click(assignBtn);
    expect(
      await screen.findByTestId(SELECTORS.STATUS_MESSAGE),
    ).toHaveTextContent('PLIN format: 1234#12');

    // Test invalid Expiry Date format
    fireEvent.change(plinInput, {target: {value: '7777#77'}});
    fireEvent.change(expiryInput, {target: {value: '01/01/20'}});
    fireEvent.click(assignBtn);

    expect(
      await screen.findByTestId(SELECTORS.STATUS_MESSAGE),
    ).toHaveTextContent('Invalid Expiry Date format.');
  });

  /**
   * Test case to verify that selected players are correctly removed via the API.
   */
  test('removes selected players', async () => {
    await setupWithSearchResult();

    const filterInput = screen.getByTestId(SELECTORS.REMOVE_FILTER_INPUT);
    fireEvent.focus(filterInput);

    // Use SELECTORS for "Select All" button
    await waitFor(() => screen.getByTestId(SELECTORS.REMOVE_SELECT_ALL_BUTTON));
    fireEvent.click(screen.getByTestId(SELECTORS.REMOVE_SELECT_ALL_BUTTON));

    const removeBtn = screen.getByTestId(SELECTORS.REMOVE_SELECTED_BUTTON);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledWith('6001', {
        assignments: [],
      });
    });
  });

  /**
   * Test case to verify that the remove button is disabled when no players are selected for removal.
   */
  test('remove button is disabled when no players are selected', async () => {
    await setupWithSearchResult();

    const removeBtn = screen.getByTestId(SELECTORS.REMOVE_SELECTED_BUTTON) as HTMLButtonElement;
    expect(removeBtn).toBeDisabled();
  });

  /**
   * Test case to confirm that the draft state is correctly restored on load.
   */
  test('restores draft state correctly', async () => {
    const DRAFT_ID = 'draft-test';
    const draftData = {
      power: mockPower,
      newOwner: '7777#77',
      newExpiry: '01/01/2099',
      selectedRemovePlins: ['1234#12'],
    };

    renderWithRouter(
      <AssignPower/>,
      '/assign-power',
      {
        initialData: draftData,
        draftId: DRAFT_ID,
        draftTimestamp: Date.now()
      },
    );

    // Wait for the draft data to load and populate the fields
    await waitFor(() => {
      // POWER_NAME_DISPLAY (display-name) is an Input component, use toHaveValue
      expect(screen.getByTestId(SELECTORS.POWER_NAME_DISPLAY)).toHaveValue('Flight');
    });

    expect(screen.getByTestId(SELECTORS.NEW_PLIN_INPUT)).toHaveValue('7777#77');
    expect(screen.getByText('1 Selected')).toBeInTheDocument();
    // Using the corrected DRAFT_STATUS (draft-info) data-testid
    expect(screen.getByTestId(SELECTORS.DRAFT_STATUS)).toBeInTheDocument();
  });

  /**
   * Test case to verify that saving a draft calls the `saveStoredChange` offline storage function
   * with the correct payload.
   */
  test('saving draft saves state to offlineStorage', async () => {
    await setupWithSearchResult();

    const plinInput = screen.getByTestId(SELECTORS.NEW_PLIN_INPUT);
    fireEvent.change(plinInput, {target: {value: '9999#99'}});
    fireEvent.click(screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON));

    await waitFor(() => {
      expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
    });

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'power',
        action: 'assign',
        data: expect.objectContaining({
          power: mockPower,
          newOwner: '9999#99',
        }),
        title: mockPower.name,
        subtitle: `Assign POIN: ${mockPower.poin}`,
      }),
    );
  });

  /**
   * Test case to verify that a successful API update, initiated from a draft,
   * triggers the deletion of that draft from offline storage.
   */
  test('successful assignment of a DRAFT deletes the draft from storage', async () => {
    const DRAFT_ID = 'power-draft-123';
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: {
        ...mockPower,
        assignments: [...mockPower.assignments, {plin: '7777#77', expiryDate: '01/01/2030'}]
      }
    });

    const draftData = {
      power: mockPower,
      newOwner: '7777#77',
      newExpiry: '01/01/2030',
      selectedRemovePlins: [] as string[],
    };

    renderWithRouter(
      <AssignPower/>,
      '/assign-power',
      {
        initialData: draftData,
        draftId: DRAFT_ID,
        draftTimestamp: Date.now()
      }
    );

    expect(screen.getByTestId(SELECTORS.DRAFT_STATUS)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(SELECTORS.ASSIGN_BUTTON));

    await waitFor(() => screen.getByText('Process Draft?'));
    fireEvent.click(screen.getByText('Process'));

    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledTimes(1);
    });

    expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith(DRAFT_ID);
    expect(await screen.findByTestId(SELECTORS.STATUS_MESSAGE)).toHaveTextContent('Assigned 7777#77');
    expect(screen.queryByTestId(SELECTORS.DRAFT_STATUS)).toBeNull();
  });
});