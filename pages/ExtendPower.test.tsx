/**
 * @fileoverview Test suite for the ExtendPower component.
 *
 * This suite verifies the core functionality, including POIN search, player
 * selection, date manipulation, update submission, error handling, and draft
 * saving.
 */
import { fireEvent, waitFor, screen } from '@testing-library/react';
import ExtendPower from './ExtendPower';
import { renderWithRouter } from '../utils/testUtils';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';

// --- Mock Constants ---
const MOCK_POIN_SUCCESS = '5678';
const MOCK_POIN_FAILURE = '9999';
const INPUT_EXPIRY_DATE = '31/12/2026';
const EXPECTED_EXPIRY_DATE = '31/12/2026';

const MOCK_POWER_DATA = {
  poin: MOCK_POIN_SUCCESS, // Changed to poin
  name: 'Flight Power Alpha',
  description: 'Player requires power extension for continued flight authorization.',
  assignments: [
    { plin: '1234#12', expiryDate: '01/01/2026' },
    { plin: '5678#01', expiryDate: '01/01/2026' },
    { plin: '7890#33', expiryDate: '12/31/2025' },
    { plin: '1111#11', expiryDate: 'until death' },
  ],
  remarks: 'Internal notes about power usage.',
  csRemarks: 'Customer support notes.',
};

const MOCK_ASSIGNED_PLAYERS_EXPECTED = '1234#12 (Unknown), 5678#01 (Unknown), 7890#33 (Unknown), 1111#11 (Unknown)';

// --- Mock Setup ---

/**
 * Mock API functions, adjusting names for the 'Power' entity and using searchPowerByPoin.
 */
jest.mock('../services/api', () => ({
  searchPowerByPoin: jest.fn(), // Corrected function name
  updatePower: jest.fn(),
  getCharacterName: jest.fn(() => 'Unknown'),
}));

jest.mock('../services/offlineStorage', () => ({
  saveStoredChange: jest.fn(),
  deleteStoredChange: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

const apiMock = api as jest.Mocked<typeof api>;
const storageMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

// --- Selectors ---
const SELECTOR = {
  // Updated selectors for POIN search
  POIN_SEARCH_INPUT: 'poin-search-input',
  FIND_BUTTON: 'find-poin-button',
  // Updated selector for update button
  UPDATE_BUTTON: 'update-expiry-button',
  NEW_EXPIRY_INPUT: 'new-expiry-date-input',
  PLIN_FILTER_INPUT: 'plin-filter-input',
  PLIN_DROPDOWN_MENU: 'plin-dropdown-menu',
  SELECT_ALL_BUTTON: 'select-all-filtered-button',
  PLIN_OPTION_FIRST: 'plin-select-item-1234#12', // Updated to match component logic
  PLIN_OPTION_SECOND: 'plin-select-item-5678#01', // Updated to match component logic
  SELECTED_PLINS_COUNT: 'selected-plin-count', // Updated selector
  ADD_YEAR_BUTTON: 'add-year-button',
  SAVE_DRAFT_BUTTON: 'save-draft-button',
};

// --- Test Suite ---

describe('ExtendPower Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test case: Verifies that the component renders the initial state successfully
   * and displays the necessary search elements.
   */
  test('renders successfully and displays the initial search form', () => {
    renderWithRouter(<ExtendPower />, '/extend-power');

    expect(screen.getByRole('heading', { name: /Extend Power/i })).toBeInTheDocument();
    expect(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT)).toBeInTheDocument();
    expect(screen.getByTestId(SELECTOR.FIND_BUTTON)).toBeInTheDocument();
  });

  /**
   * Test case: Verifies that the "Find" button is disabled when the POIN input is empty,
   * enforcing a basic input validation rule before the API call is made.
   */
  test('disables the Find button when the POIN input is empty', async () => {
    renderWithRouter(<ExtendPower />, '/extend-power');

    const findButton = screen.getByTestId(SELECTOR.FIND_BUTTON);

    expect(findButton).toBeDisabled();

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });

    expect(findButton).not.toBeDisabled();

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: '' } });

    expect(findButton).toBeDisabled();

    expect(apiMock.searchPowerByPoin).not.toHaveBeenCalled();
  });

  /**
   * Test case: Simulates entering a POIN that yields no result and checks for
   * the 'Not found' error message.
   */
  test('shows "Not found" error when POIN search fails', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: false,
      data: undefined,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_FAILURE } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    expect(apiMock.searchPowerByPoin).toHaveBeenCalledWith(MOCK_POIN_FAILURE);

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Simulates searching for a valid POIN, confirms the data loads,
   * and verifies that the component correctly renders all retrieved power fields.
   */
  test('allows searching for a POIN and displays the power data', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    expect(apiMock.searchPowerByPoin).toHaveBeenCalledWith(MOCK_POIN_SUCCESS);

    // Assertions using the correct data-testid attributes for Power entity
    await waitFor(() => {
      expect(screen.getByTestId('power-poin-display')).toHaveValue(MOCK_POIN_SUCCESS);
    });

    expect(screen.getByTestId('power-poin-display')).toBeInTheDocument();
    expect(screen.getByTestId('power-name-display')).toHaveValue(MOCK_POWER_DATA.name);

    const descriptionElement = screen.getByTestId('power-description-display');
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveTextContent(MOCK_POWER_DATA.description);

    expect(screen.getByTestId('assigned-players-display')).toHaveTextContent(MOCK_ASSIGNED_PLAYERS_EXPECTED);
  });

  /**
   * Test case: Verifies the functionality of the player selection and filtering dropdown,
   * including the initial selection and the "Select All" feature.
   */
  test('handles player selection, filtering, and "Select All" correctly', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');
    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT)).toBeInTheDocument();
    });

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTOR.PLIN_DROPDOWN_MENU)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));
    expect(screen.getByTestId(SELECTOR.SELECTED_PLINS_COUNT)).toHaveTextContent('1 Selected');
    expect(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST)).toHaveClass(/bg-blue-50/);

    expect(screen.getByTestId(SELECTOR.NEW_EXPIRY_INPUT)).toHaveValue('01/01/2026');

    fireEvent.change(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT), { target: { value: '5678' } });

    fireEvent.click(screen.getByTestId(SELECTOR.SELECT_ALL_BUTTON));
    expect(screen.getByTestId(SELECTOR.SELECTED_PLINS_COUNT)).toHaveTextContent('2 Selected');
  });

  /**
   * Test case: Verifies the functionality of the "+1 Year & Round Up" button.
   */
  test('adds one year and rounds up expiry date correctly', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');
    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));
    await waitFor(() => expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeInTheDocument());

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));
    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));

    fireEvent.change(screen.getByTestId(SELECTOR.NEW_EXPIRY_INPUT), { target: { value: '15/06/2024' } });

    fireEvent.click(screen.getByTestId(SELECTOR.ADD_YEAR_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTOR.NEW_EXPIRY_INPUT)).toHaveValue('01/07/2025');
    });
  });

  /**
   * Test case: Simulates entering a new expiry date (DD/MM/YYYY) and clicking Update,
   * verifying the API call with the expected date and displaying the success message.
   */
  test('allows updating the power with a new expiry date and shows success message', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: undefined,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeInTheDocument();
    });

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));
    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));

    fireEvent.change(screen.getByTestId(SELECTOR.NEW_EXPIRY_INPUT), { target: { value: INPUT_EXPIRY_DATE } });

    fireEvent.click(screen.getByTestId(SELECTOR.UPDATE_BUTTON));

    const expectedAssignments = MOCK_POWER_DATA.assignments.map(a =>
      a.plin === '1234#12' ? { ...a, expiryDate: EXPECTED_EXPIRY_DATE } : a
    );
    expect(apiMock.updatePower).toHaveBeenCalledWith(MOCK_POIN_SUCCESS, {
      assignments: expectedAssignments,
    });

    await waitFor(() => {
      expect(screen.getByText(/Updated expiry for 1234#12./i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Simulates a failed API call during the update process
   * and verifies that a general error message is displayed.
   */
  test('shows error message when power update fails', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });
    apiMock.updatePower.mockResolvedValue({
      success: false,
      error: 'Update failed due to server error',
      data: undefined,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeInTheDocument();
    });

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));
    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));
    fireEvent.change(screen.getByTestId(SELECTOR.NEW_EXPIRY_INPUT), { target: { value: INPUT_EXPIRY_DATE } });

    fireEvent.click(screen.getByTestId(SELECTOR.UPDATE_BUTTON));

    await waitFor(() => {
      expect(screen.getByText(/Update Failed: Update failed due to server error/i)).toBeInTheDocument();
    });
  });

  /**
   * Test case: Verifies that the "Save Draft" button is enabled only when there are unsaved changes
   * and then verifies the action.
   */
  test('allows saving a draft when changes are present', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));
    await waitFor(() => expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).toBeInTheDocument());

    expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).toBeDisabled();

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));
    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));

    expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).not.toBeDisabled();

    fireEvent.click(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON));

    await waitFor(() => {
      expect(storageMock.saveStoredChange).toHaveBeenCalled();
      expect(screen.getByText('Draft saved successfully.')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Verifies that clicking the Update button without selecting any players
   * prevents the update API call.
   */
  test('prevents update when no players are selected', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: MOCK_POWER_DATA,
    });

    renderWithRouter(<ExtendPower />, '/extend-power');

    fireEvent.change(screen.getByTestId(SELECTOR.POIN_SEARCH_INPUT), { target: { value: MOCK_POIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    await waitFor(() => expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeInTheDocument());

    expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeDisabled();

    fireEvent.click(screen.getByTestId(SELECTOR.UPDATE_BUTTON));

    expect(apiMock.updatePower).not.toHaveBeenCalled();
  });
});