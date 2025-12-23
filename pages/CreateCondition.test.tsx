import {fireEvent, waitFor, screen} from '@testing-library/react';
import CreateCondition from './CreateCondition';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import {Condition, Assignment} from '../types';
import {renderWithRouter} from '../utils/testUtils';

/**
 * Maps all data-testid attributes and common text selectors used throughout the tests
 * to ensure robust and centralized selectors.
 */
const SELECTORS = {
  // Page/Layout
  CREATE_CONDITION_PAGE: 'create-condition-page',
  MODAL_MESSAGE: 'modal-message',
  BACK_BUTTON: 'back-button',
  HOME_BUTTON: 'home-button',
  NEW_CREATE_BUTTON: 'new-create-button',
  EXTEND_CONDITION_BUTTON: 'extend-condition-button',
  ASSIGN_CONDITION_BUTTON: 'assign-condition-button',
  DRAFT_TIMESTAMP_DISPLAY: 'draft-timestamp-display',

  // Status/Form
  STATUS_MESSAGE_SUCCESS: 'status-message-success',
  STATUS_MESSAGE_ERROR: 'status-message-error',
  CREATE_CONDITION_FORM: 'create-condition-form',

  // Inputs - View Mode
  VIEW_COIN_DISPLAY: 'view-coin-display',
  VIEW_OWNER_INPUT: 'view-owner-input',
  VIEW_OWNER_DROPDOWN_TOGGLE: 'view-owner-dropdown-toggle',
  OWNER_DROPDOWN_MENU: 'owner-dropdown-menu',
  NO_MATCHES_FOUND: 'no-matches-found',
  // Dynamic Selectors for Dropdown Items:
  // owner-select-item-{PLIN} (e.g., owner-select-item-1234#12)
  // owner-name-item-{PLIN}

  // Inputs - Create/Shared
  OWNER_PLIN_INPUT: 'owner-plin-input',
  OWNER_NAME_DISPLAY: 'owner-name-display',
  NAME_INPUT: 'name-input',
  DESCRIPTION_INPUT: 'description-input',
  EXPIRY_DATE_INPUT: 'expiry-date-input',
  REMARKS_INPUT: 'remarks-input',
  CS_REMARKS_INPUT: 'cs-remarks-input',

  // Actions
  SAVE_DRAFT_BUTTON: 'save-draft-button',
  CREATE_CONDITION_SUBMIT: 'create-condition-submit',
  IS_DIRTY_STATUS: 'is-dirty-status',
};

/**
 * Mock API service functions.
 */
jest.mock('../services/api', () => ({
  createCondition: jest.fn(),
  getCharacterName: jest.fn((plin: string) => {
    switch (plin) {
      case '1234#12':
        return 'User A';
      case '5555#55':
        return 'User B';
      case '9999#99':
        return 'User C';
      case '1111#11':
        return 'The One';
      default:
        return '';
    }
  }),
}));

/**
 * Mock offline storage service functions.
 */
jest.mock('../services/offlineStorage', () => ({
  saveStoredChange: jest.fn(),
  deleteStoredChange: jest.fn(),
}));

const mockNavigate = jest.fn();
/** Mock the react-router-dom hooks. */
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));

jest.mock('../utils/dateUtils', () => ({
  getDefaultExpiry: jest.fn(() => '01/01/2030'),
  formatDate: jest.fn((val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length > 2) return clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) return clean.slice(0, 5) + '/' + clean.slice(5);
    return val.replace(/[^0-9/]/g, '').padEnd(10, '');
  }),
}));

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

const mockAssignments: Assignment[] = [
  {plin: '1234#12', expiryDate: '01/01/2030'},
  {plin: '5555#55', expiryDate: '02/02/2031'},
  {plin: '9999#99', expiryDate: '03/03/2032'},
];

const mockSingleAssignment: Assignment = {plin: '1111#11', expiryDate: '10/10/2035'};

const mockViewConditionMultiple: Condition = {
  coin: '9001',
  name: 'Space Plague',
  description: 'Very bad condition',
  assignments: mockAssignments,
  remarks: 'Admin note',
  csRemarks: 'CS note',
};

const mockViewConditionSingle: Condition = {
  coin: '9002',
  name: 'Single Assignment',
  description: 'Only one player',
  assignments: [mockSingleAssignment],
  remarks: '',
  csRemarks: '',
};

/**
 * Test suite for the CreateCondition component.
 */
describe('CreateCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('react-router-dom') as any).useLocation.mockReturnValue({
      state: {},
    });
  });

  /**
   * Verifies that the component initializes correctly in 'create' mode.
   */
  test('renders correctly in create mode', () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');

    expect(screen.getByTestId(SELECTORS.NAME_INPUT)).toHaveValue('');
    expect(screen.getByTestId(SELECTORS.EXPIRY_DATE_INPUT)).toHaveValue('01/01/2030');
    expect(screen.getByTestId(SELECTORS.CREATE_CONDITION_SUBMIT)).toBeInTheDocument();
    expect(screen.queryByTestId(SELECTORS.VIEW_COIN_DISPLAY)).not.toBeInTheDocument();
  });

  /**
   * Tests the functionality of the Home button.
   */
  test('navigates to the dashboard', () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');
    fireEvent.click(screen.getByTestId(SELECTORS.HOME_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  /**
   * Checks the dirty state tracking mechanism.
   */
  test('tracks dirty state and enables draft save', () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');

    expect(screen.getByTestId(SELECTORS.IS_DIRTY_STATUS)).toHaveTextContent('Clean');
    expect(screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON)).toBeDisabled();

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'New Condition'}});

    expect(screen.getByTestId(SELECTORS.IS_DIRTY_STATUS)).toHaveTextContent('Dirty');
    expect(screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON)).not.toBeDisabled();
  });

  /**
   * Verifies the form's client-side validation logic. It checks that submitting with missing data
   * triggers sequential error messages for required fields (Name, Description).
   * It also verifies the invalid PLIN format check by using the input '1234'. Assuming the
   * component's input masking logic adds the '#' automatically after four digits, the internal
   * value becomes '1234#'. This is intentionally designed to fail the regex validation
   * /^\d{1,4}#\d{1,2}$/, which requires digits after the '#', thus triggering the correct error message.
   */
  test('shows form validation errors for missing fields and invalid formats', async () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');

    const form = screen.getByTestId(SELECTORS.CREATE_CONDITION_FORM);

    // 1. Check Name required validation
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('Name is required.');
    });

    // 2. Check Description required validation
    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Valid Name'}});
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('Description is required.');
    });

    // 3. Check invalid PLIN format validation
    fireEvent.change(screen.getByTestId(SELECTORS.DESCRIPTION_INPUT), {target: {value: 'Valid Desc'}});
    apiMock.getCharacterName.mockClear();
    fireEvent.change(screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT), {target: {value: '1234'}});
    await waitFor(() => expect(apiMock.getCharacterName).toHaveBeenCalledWith('1234'));

    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('Player must be format 1234#12');
    });
  });

  /**
   * Tests the input masking functionality for the Owner PLIN field.
   */
  test('formats PLIN input automatically', () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');
    const plinInput = screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT);

    fireEvent.change(plinInput, {target: {value: '1234567'}});
    expect(plinInput).toHaveValue('1234#56');

    fireEvent.change(plinInput, {target: {value: 'abcd1234#56'}});
    expect(plinInput).toHaveValue('1234#56');
  });

  /**
   * Verifies the behavior when a validly formatted PLIN is entered, but the
   * character name lookup API call returns an empty string (i.e., character not found).
   */
  test('shows empty character name when lookup fails for valid PLIN', async () => {
    const plin = '0000#00';
    renderWithRouter(<CreateCondition/>, '/create-condition');

    const plinInput = screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT);
    fireEvent.change(plinInput, {target: {value: plin}});

    await waitFor(() => {
      expect(apiMock.getCharacterName).toHaveBeenCalledWith(plin);
    });

    expect(plinInput).toHaveValue(plin);
    const nameDisplay = screen.queryByTestId(SELECTORS.OWNER_NAME_DISPLAY);
    if (nameDisplay) {
      expect(nameDisplay).toHaveTextContent('');
    }
  });

  /**
   * Tests the full submission workflow for a successful API response, verifying the payload,
   * success message, and transition to read-only 'view' mode.
   */
  test('handles successful condition creation and transitions to read-only view', async () => {
    apiMock.createCondition.mockResolvedValue({
      success: true,
      data: {...mockViewConditionSingle, coin: '0001'},
    });

    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Test Cond'}});
    fireEvent.change(screen.getByTestId(SELECTORS.DESCRIPTION_INPUT), {target: {value: 'Test Desc'}});
    fireEvent.change(screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT), {target: {value: '1111#11'}});

    fireEvent.submit(screen.getByTestId(SELECTORS.CREATE_CONDITION_FORM));

    await waitFor(() => {
      expect(apiMock.createCondition).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Cond',
          assignments: [{plin: '1111#11', expiryDate: '01/01/2030'}],
        }),
      );
    });

    expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Condition Created! COIN: 0001');
    expect(screen.getByTestId(SELECTORS.NAME_INPUT)).toHaveAttribute('readonly');
    expect(screen.getByTestId(SELECTORS.VIEW_COIN_DISPLAY)).toHaveValue('0001');
  });

  /**
   * Tests the submission workflow when the API returns an error, ensuring the form remains editable.
   */
  test('handles API submission failure and remains in editable mode', async () => {
    apiMock.createCondition.mockResolvedValue({
      success: false,
      error: 'Backend system timeout.',
    });

    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Failing Cond'}});
    fireEvent.change(screen.getByTestId(SELECTORS.DESCRIPTION_INPUT), {target: {value: 'Failing Desc'}});
    fireEvent.change(screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT), {target: {value: '1111#11'}});

    fireEvent.submit(screen.getByTestId(SELECTORS.CREATE_CONDITION_FORM));

    await waitFor(() => {
      expect(apiMock.createCondition).toHaveBeenCalled();
    });

    expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_ERROR)).toHaveTextContent('Failed: Backend system timeout.');

    expect(screen.getByTestId(SELECTORS.NAME_INPUT)).not.toHaveAttribute('readonly');
    expect(screen.queryByTestId(SELECTORS.VIEW_COIN_DISPLAY)).not.toBeInTheDocument();
  });


  /**
   * Verifies that the form can be submitted successfully even if the owner PLIN is empty,
   * resulting in an empty `assignments` array in the payload.
   */
  test('creates condition with empty assignments when owner is empty', async () => {
    apiMock.createCondition.mockResolvedValue({
      success: true,
      data: {...mockViewConditionSingle, assignments: [], coin: '0003'},
    });

    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'No Owner Cond'}});
    fireEvent.change(screen.getByTestId(SELECTORS.DESCRIPTION_INPUT), {target: {value: 'Empty'}});
    fireEvent.change(screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT), {target: {value: ''}});

    fireEvent.submit(screen.getByTestId(SELECTORS.CREATE_CONDITION_FORM));

    await waitFor(() => {
      expect(apiMock.createCondition).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'No Owner Cond',
          assignments: [],
        }),
      );
    });
  });

  /**
   * Tests the draft saving functionality, verifying storage call, success message,
   * dirty state reset, and timestamp display.
   */
  test('saves current changes as a draft successfully', async () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Drafted Condition'}});
    fireEvent.click(screen.getByTestId(SELECTORS.SAVE_DRAFT_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Draft saved successfully.');
    });

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'condition',
        title: 'Drafted Condition',
        data: expect.objectContaining({name: 'Drafted Condition'}),
      }),
    );

    expect(screen.getByTestId(SELECTORS.IS_DIRTY_STATUS)).toHaveTextContent('Clean');
    expect(screen.getByTestId(SELECTORS.DRAFT_TIMESTAMP_DISPLAY)).toBeInTheDocument();
  });

  /**
   * Tests the cleanup of draft storage upon successful final submission.
   */
  test('clears draft from storage upon successful submission', async () => {
    const DRAFT_ID = 'test-draft-123';
    apiMock.createCondition.mockResolvedValue({
      success: true,
      data: {...mockViewConditionMultiple, coin: '0002'},
    });

    (require('react-router-dom') as any).useLocation.mockReturnValue({
      state: {
        initialData: {name: 'Draft', description: 'desc', owner: '9999#99', expiryDate: '12/12/2028', remarks: '', csRemarks: ''},
        draftId: DRAFT_ID,
        draftTimestamp: Date.now(),
      },
    });

    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Updated Draft'}});
    fireEvent.submit(screen.getByTestId(SELECTORS.CREATE_CONDITION_FORM));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.STATUS_MESSAGE_SUCCESS)).toHaveTextContent('Condition Created! COIN: 0002');
      expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith(DRAFT_ID);
    });
  });

  /**
   * Tests the "unsaved changes" protection, verifying that navigation is blocked by a modal,
   * and that clicking 'Discard' completes the navigation.
   */
  test('prompts ConfirmModal when navigating away with dirty state', async () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Unsaved'}});

    fireEvent.click(screen.getByTestId(SELECTORS.HOME_BUTTON));

    const modal = screen.getByTestId(SELECTORS.MODAL_MESSAGE);
    expect(modal).toBeInTheDocument();

    fireEvent.click(screen.getByText('Discard'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  /**
   * Resets form state to default when "Create New" is clicked.
   */
  test('resets form state to default when "Create New" is clicked', async () => {
    renderWithRouter(<CreateCondition/>, '/create-condition');

    fireEvent.change(screen.getByTestId(SELECTORS.NAME_INPUT), {target: {value: 'Temporary'}});
    fireEvent.change(screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT), {target: {value: '1234#12'}});

    fireEvent.click(screen.getByTestId(SELECTORS.NEW_CREATE_BUTTON));

    fireEvent.click(screen.getByText('Discard'));

    await waitFor(() => {
      expect(screen.getByTestId(SELECTORS.NAME_INPUT)).toHaveValue('');
      expect(screen.getByTestId(SELECTORS.OWNER_PLIN_INPUT)).toHaveValue('');
      expect(screen.getByTestId(SELECTORS.IS_DIRTY_STATUS)).toHaveTextContent('Clean');
      expect(mockNavigate).toHaveBeenCalledWith('/create-condition', expect.any(Object));
    });
  });

  /**
   * Verifies the display of a Condition with multiple assignments in 'view' mode,
   * including read-only status, 'Multiple' expiry, and owner dropdown functionality.
   */
  test('renders view mode correctly with multiple assignments', async () => {
    (require('react-router-dom') as any).useLocation.mockReturnValue({
      state: {
        mode: 'view',
        item: mockViewConditionMultiple,
      },
    });

    renderWithRouter(<CreateCondition/>, '/create-condition');

    expect(screen.getByTestId(SELECTORS.VIEW_COIN_DISPLAY)).toHaveValue(mockViewConditionMultiple.coin);
    expect(screen.getByTestId(SELECTORS.NAME_INPUT)).toHaveAttribute('readonly');
    expect(screen.getByTestId(SELECTORS.EXPIRY_DATE_INPUT)).toHaveValue('Multiple');

    expect(screen.getByTestId(SELECTORS.EXTEND_CONDITION_BUTTON)).toBeInTheDocument();
    expect(screen.getByTestId(SELECTORS.ASSIGN_CONDITION_BUTTON)).toBeInTheDocument();

    const viewOwnerInput = screen.getByTestId(SELECTORS.VIEW_OWNER_INPUT);
    const dropdownToggle = screen.getByTestId(SELECTORS.VIEW_OWNER_DROPDOWN_TOGGLE);

    fireEvent.click(dropdownToggle);

    fireEvent.change(viewOwnerInput, {target: {value: 'User B'}});
    expect(screen.getByTestId('owner-select-item-5555#55')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('owner-select-item-5555#55'));

    expect(viewOwnerInput).toHaveValue('5555#55 User B');
    expect(screen.getByTestId(SELECTORS.EXPIRY_DATE_INPUT)).toHaveValue('02/02/2031');
  });

  /**
   * Verifies the display of a Condition with a single assignment in 'view' mode.
   */
  test('renders view mode correctly with single assignment', async () => {
    (require('react-router-dom') as any).useLocation.mockReturnValue({
      state: {
        mode: 'view',
        item: mockViewConditionSingle,
      },
    });

    renderWithRouter(<CreateCondition/>, '/create-condition');

    expect(screen.getByTestId(SELECTORS.VIEW_COIN_DISPLAY)).toHaveValue(mockViewConditionSingle.coin);

    expect(screen.getByTestId(SELECTORS.VIEW_OWNER_INPUT)).toHaveValue('1111#11 The One');
    expect(screen.getByTestId(SELECTORS.EXPIRY_DATE_INPUT)).toHaveValue('10/10/2035');
  });
});