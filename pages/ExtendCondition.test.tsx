import { fireEvent, waitFor, screen } from '@testing-library/react';
import ExtendCondition from './ExtendCondition';
import { renderWithRouter } from '../utils/testUtils';
import * as api from '../services/api';

// --- Mock Constants ---
const MOCK_COIN_SUCCESS = '1234';
const MOCK_COIN_FAILURE = '9999';
const INPUT_EXPIRY_DATE = '31/12/2026';
const EXPECTED_EXPIRY_DATE = '31/12/2026';

const MOCK_CONDITION_DATA = {
  coin: MOCK_COIN_SUCCESS,
  name: 'Critical Condition Alpha',
  description: 'Patient requires immediate attention and extension approval.',
  assignments: [
    { plin: '1234#12', expiryDate: '01/01/2026' },
    { plin: '5678#01', expiryDate: '01/01/2026' },
    { plin: '7890#33', expiryDate: '12/31/2025' },
    { plin: '1111#11', expiryDate: 'until death' },
  ],
  remarks: 'Internal notes.',
  csRemarks: 'Customer notes.',
};

const MOCK_ASSIGNED_PLAYERS_EXPECTED = '1234#12 (Unknown), 5678#01 (Unknown), 7890#33 (Unknown), 1111#11 (Unknown)';

// --- Mock Setup ---

jest.mock('../services/api', () => ({
  searchConditionByCoin: jest.fn(),
  updateCondition: jest.fn(),
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

// --- Selectors ---
const SELECTOR = {
  COIN_SEARCH_INPUT: 'coin-search-input',
  FIND_BUTTON: 'find-coin-button',
  UPDATE_BUTTON: 'update-button',
  NEW_EXPIRY_INPUT: 'new-expiry-date-input',
  PLIN_FILTER_INPUT: 'plin-filter-input',
  PLIN_DROPDOWN_MENU: 'plin-dropdown-menu',
  SELECT_ALL_BUTTON: 'select-all-filtered-button',
  PLIN_OPTION_FIRST: 'plin-option-1234#12',
  PLIN_OPTION_SECOND: 'plin-option-5678#01',
  SELECTED_PLINS_COUNT: 'selected-plins-count',
  ADD_YEAR_BUTTON: 'add-year-button',
  SAVE_DRAFT_BUTTON: 'save-draft-button',
};

// --- Test Suite ---

describe('ExtendCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test case: Verifies that the component renders the initial state successfully
   * and displays the necessary search elements.
   */
  test('renders successfully and displays the initial search form', () => {
    renderWithRouter(<ExtendCondition />, '/extend-condition');

    expect(screen.getByRole('heading', { name: /Extend Condition/i })).toBeInTheDocument();
    expect(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT)).toBeInTheDocument();
    expect(screen.getByTestId(SELECTOR.FIND_BUTTON)).toBeInTheDocument();
  });

  /**
   * Test case: Verifies that the "Find" button is disabled when the COIN input is empty,
   * enforcing a basic input validation rule before the API call is made.
   */
  test('disables the Find button when the COIN input is empty', async () => {
    renderWithRouter(<ExtendCondition />, '/extend-condition');

    const findButton = screen.getByTestId(SELECTOR.FIND_BUTTON);

    expect(findButton).toBeDisabled();

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });

    expect(findButton).not.toBeDisabled();

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: '' } });

    expect(findButton).toBeDisabled();

    expect(apiMock.searchConditionByCoin).not.toHaveBeenCalled();
  });

  /**
   * Test case: Simulates entering a COIN that yields no result and checks for
   * the 'Not found' error message.
   */
  test('shows "Not found" error when COIN search fails', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: false,
      data: undefined,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_FAILURE } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    expect(apiMock.searchConditionByCoin).toHaveBeenCalledWith(MOCK_COIN_FAILURE);

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Simulates searching for a valid COIN, confirms the data loads,
   * and verifies that the component correctly renders all retrieved condition fields.
   */
  test('allows searching for a COIN and displays the condition data', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    expect(apiMock.searchConditionByCoin).toHaveBeenCalledWith(MOCK_COIN_SUCCESS);

    await waitFor(() => {
      expect(screen.getByTestId('condition-coin-input')).toHaveValue(MOCK_COIN_SUCCESS);
    });

    expect(screen.getByTestId('condition-coin-input')).toBeInTheDocument();
    expect(screen.getByTestId('condition-name-input')).toHaveValue(MOCK_CONDITION_DATA.name);

    const descriptionElement = screen.getByTestId('condition-description-input');
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveTextContent(MOCK_CONDITION_DATA.description);

    expect(screen.getByTestId('assigned-players-display')).toHaveTextContent(MOCK_ASSIGNED_PLAYERS_EXPECTED);
  });

  /**
   * Test case: Verifies the functionality of the player selection and filtering dropdown,
   * including the initial selection and the "Select All" feature.
   */
  test('handles player selection, filtering, and "Select All" correctly', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');
    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
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
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');
    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
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
  test('allows updating the condition with a new expiry date and shows success message', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });
    apiMock.updateCondition.mockResolvedValue({
      success: true,
      data: undefined,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeInTheDocument();
    });

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));
    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));

    fireEvent.change(screen.getByTestId(SELECTOR.NEW_EXPIRY_INPUT), { target: { value: INPUT_EXPIRY_DATE } });

    fireEvent.click(screen.getByTestId(SELECTOR.UPDATE_BUTTON));

    const expectedAssignments = MOCK_CONDITION_DATA.assignments.map(a =>
      a.plin === '1234#12' ? { ...a, expiryDate: EXPECTED_EXPIRY_DATE } : a
    );
    expect(apiMock.updateCondition).toHaveBeenCalledWith(MOCK_COIN_SUCCESS, {
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
  test('shows error message when condition update fails', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });
    apiMock.updateCondition.mockResolvedValue({
      success: false,
      error: 'Update failed due to server error',
      data: undefined,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
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
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });
    const { saveStoredChange } = require('../services/offlineStorage');

    renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));
    await waitFor(() => expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).toBeInTheDocument());

    expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).toBeDisabled();

    fireEvent.focus(screen.getByTestId(SELECTOR.PLIN_FILTER_INPUT));
    fireEvent.click(screen.getByTestId(SELECTOR.PLIN_OPTION_FIRST));

    expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).not.toBeDisabled();

    fireEvent.click(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON));

    await waitFor(() => {
      expect(saveStoredChange).toHaveBeenCalled();
      expect(screen.getByText('Draft saved successfully.')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Verifies that clicking the Update button without selecting any players
   * prevents the update API call.
   */
  test('prevents update when no players are selected', async () => {
    apiMock.searchConditionByCoin.mockResolvedValue({
      success: true,
      data: MOCK_CONDITION_DATA,
    });

    renderWithRouter(<ExtendCondition />, '/extend-condition');

    fireEvent.change(screen.getByTestId(SELECTOR.COIN_SEARCH_INPUT), { target: { value: MOCK_COIN_SUCCESS } });
    fireEvent.click(screen.getByTestId(SELECTOR.FIND_BUTTON));

    await waitFor(() => expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeInTheDocument());

    expect(screen.getByTestId(SELECTOR.UPDATE_BUTTON)).toBeDisabled();

    fireEvent.click(screen.getByTestId(SELECTOR.UPDATE_BUTTON));

    expect(apiMock.updateCondition).not.toHaveBeenCalled();
  });
});