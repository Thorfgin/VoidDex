import { fireEvent, waitFor, screen } from '@testing-library/react';
import CreatePower from './CreatePower';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../utils/testUtils';

jest.mock('../services/api', () => ({
  createPower: jest.fn(),
  getCharacterName: jest.fn(),
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
  ...jest.requireActual('../utils/dateUtils'),
  getDefaultExpiry: jest.fn(() => '31/12/2099'),
}));

const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

/**
 * Test selectors exported from the CreatePower component for stable selector access.
 */
const SELECTOR = {
  // Buttons
  BACK_BUTTON: 'back-button',
  DASHBOARD_BUTTON: 'dashboard-button',
  NEW_CREATE_BUTTON: 'new-create-button',
  EXTEND_POWER_BUTTON: 'extend-power-button',
  ASSIGN_POWER_BUTTON: 'assign-power-button',
  SAVE_DRAFT_BUTTON: 'save-draft-button',
  SUBMIT_BUTTON: 'create-power-submit-button',
  OWNER_SEARCH_TOGGLE_BUTTON: 'owner-search-toggle-button',

  // Display / Status
  STATUS_MESSAGE: 'status-message',
  POIN_DISPLAY: 'poin-display',
  OWNER_DROPDOWN_MENU: 'owner-dropdown-menu',

  // Inputs
  POWER_NAME_INPUT: 'power-name-input',
  POWER_DESCRIPTION_INPUT: 'power-description-input',
  OWNER_INPUT: 'owner-input',
  OWNER_SEARCH_INPUT: 'owner-search-input',
  EXPIRY_DATE_INPUT: 'expiry-date-input',
  REMARKS_INPUT: 'remarks-input',
  CS_REMARKS_INPUT: 'cs-remarks-input',

  /** Dynamic Items prefix for assignment dropdown options (e.g., owner-select-item-1234#12). */
  PLIN_OPTION_PREFIX: 'owner-select-item',
};

/**
 * Test suite for the CreatePower Component.
 */
describe('CreatePower Component', () => {
  const apiMock = api as jest.Mocked<typeof api>;
  const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    apiMock.getCharacterName.mockReturnValue('');
    consoleError.mockClear();
  });

  /**
   * Helper function to fill the required Name and Description fields.
   */
  const fillRequiredFields = () => {
    fireEvent.change(screen.getByTestId(SELECTOR.POWER_NAME_INPUT), {
      target: { value: 'Test Power Name' },
    });
    fireEvent.change(screen.getByTestId(SELECTOR.POWER_DESCRIPTION_INPUT), {
      target: { value: 'Test Power Description' },
    });
  };

  /**
   * Test block for basic structure and initial state in Create Mode.
   */
  describe('A. Create Mode: Basic Rendering and State', () => {
    /**
     * Verifies that the component renders the create form with default input values and the correct
     * set of action buttons.
     */
    test('renders the create form with default values and correct structure', () => {
      renderWithRouter(<CreatePower />, '/create-power');

      expect(screen.getByRole('heading', { name: 'Create Power' })).toBeInTheDocument();
      expect(screen.getByTestId(SELECTOR.POWER_NAME_INPUT)).toHaveValue('');
      expect(screen.getByTestId(SELECTOR.OWNER_INPUT)).toHaveValue('');
      expect(screen.getByTestId(SELECTOR.EXPIRY_DATE_INPUT)).toHaveValue('31/12/2099');

      expect(screen.getByTestId(SELECTOR.SUBMIT_BUTTON)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTOR.POIN_DISPLAY)).not.toBeInTheDocument();
    });
  });

  /**
   * Test block for input change handlers, formatting, and client-side validation rules.
   */
  describe('B. Create Mode: Input Formatting and Validation', () => {
    beforeEach(() => {
      renderWithRouter(<CreatePower />, '/create-power');
    });

    /**
     * Validates the Player Login Identification Number (PLIN) format.
     */
    test('validates PLIN format correctly', async () => {
      fillRequiredFields();

      fireEvent.change(screen.getByTestId(SELECTOR.OWNER_INPUT), {
        target: { value: '1234' },
      });

      fireEvent.click(screen.getByTestId(SELECTOR.SUBMIT_BUTTON));

      await waitFor(() => {
        expect(screen.getByTestId(SELECTOR.STATUS_MESSAGE)).toHaveTextContent(
          "Player must be format 1234#12"
        );
      });
    });

    /**
     * Validates the Expiry Date format fails on incomplete date input.
     */
    test('validates expiry date format fails on incomplete date', async () => {
      fillRequiredFields();

      fireEvent.change(screen.getByTestId(SELECTOR.EXPIRY_DATE_INPUT), {
        target: { value: '01/01/20' },
      });
      fireEvent.click(screen.getByTestId(SELECTOR.SUBMIT_BUTTON));

      await waitFor(() => {
        expect(screen.getByTestId(SELECTOR.STATUS_MESSAGE)).toHaveTextContent(
          "Expiry Date must be DD/MM/YYYY or 'until death'"
        );
      });
    });

    /**
     * Checks that the input formatter correctly restricts and formats the PLIN
     * input to the maximum allowed length (4#2).
     */
    test('formats PLIN input to 4#2 max length', () => {
      const ownerInput = screen.getByTestId(SELECTOR.OWNER_INPUT);

      fireEvent.change(ownerInput, { target: { value: '123456789' } });
      expect(ownerInput).toHaveValue('1234#56');
    });

    /**
     * Checks that the date input mask automatically formats the entered date
     * string into the DD/MM/YYYY format.
     */
    test('formats Expiry Date input to DD/MM/YYYY', () => {
      const dateInput = screen.getByTestId(SELECTOR.EXPIRY_DATE_INPUT);

      fireEvent.change(dateInput, { target: { value: '01/01/2025' } });
      expect(dateInput).toHaveValue('01/01/2025');
    });

    /**
     * Confirms that the component calls the mock API to fetch the character name
     * for a valid PLIN and displays it.
     */
    test('displays character name for valid PLIN on change', () => {
      apiMock.getCharacterName.mockReturnValue('Test User Name');

      const ownerInput = screen.getByTestId(SELECTOR.OWNER_INPUT);
      fireEvent.change(ownerInput, { target: { value: '1234#12' } });

      expect(screen.getByText('Test User Name')).toBeInTheDocument();
    });
  });

  /**
   * Test block for form submission success/failure and offline draft management.
   */
  describe('C. Create Mode: Submission and Draft Management', () => {
    /**
     * Simulates a successful power creation, checks the API payload, and verifies draft deletion.
     */
    test('successfully creates power, checks payload, and deletes draft', async () => {
      apiMock.createPower.mockResolvedValue({
        success: true,
        data: { poin: '8000' },
      } as any);

      renderWithRouter(<CreatePower />, '/create-power', {
        draftId: 'test-draft-123',
      });
      fillRequiredFields();

      fireEvent.change(screen.getByTestId(SELECTOR.OWNER_INPUT), {
        target: { value: '1234#12' },
      });

      fireEvent.click(screen.getByTestId(SELECTOR.SUBMIT_BUTTON));

      await waitFor(() => {
        expect(apiMock.createPower).toHaveBeenCalledWith(
          expect.objectContaining({
            assignments: [
              { plin: '1234#12', expiryDate: '31/12/2099' },
            ],
          })
        );
      });

      expect(await screen.findByTestId(SELECTOR.STATUS_MESSAGE)).toHaveTextContent('Power Created! POIN: 8000');
      expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith('test-draft-123');
    });

    /**
     * Simulates an API failure during submission and verifies the error message.
     */
    test('handles API failure gracefully', async () => {
      apiMock.createPower.mockResolvedValue({
        success: false,
        error: 'Server unavailable',
      } as any);

      renderWithRouter(<CreatePower />, '/create-power');
      fillRequiredFields();

      fireEvent.click(screen.getByTestId(SELECTOR.SUBMIT_BUTTON));

      await waitFor(() => {
        expect(apiMock.createPower).toHaveBeenCalled();
      });

      expect(await screen.findByTestId(SELECTOR.STATUS_MESSAGE)).toHaveTextContent('Failed: Server unavailable');
    });

    /**
     * Checks that clicking the "Save Draft" button successfully calls the offline
     * storage service and updates the status message.
     */
    test('saves draft successfully', async () => {
      renderWithRouter(<CreatePower />, '/create-power');
      fireEvent.change(screen.getByTestId(SELECTOR.POWER_NAME_INPUT), {
        target: { value: 'Draft Power Title' },
      });

      fireEvent.click(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON));

      await waitFor(() => {
        expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Draft Power Title',
          })
        );
      });

      expect(await screen.findByTestId(SELECTOR.STATUS_MESSAGE)).toHaveTextContent('Draft saved successfully.');
    });
  });

  /**
   * Test block for the critical Navigation Guard functionality.
   */
  describe('D. Navigation Guard (Unsaved Changes)', () => {
    beforeEach(() => {
      renderWithRouter(<CreatePower />, '/create-power', {
        returnTo: '/dashboard',
      });

      fireEvent.change(screen.getByTestId(SELECTOR.POWER_NAME_INPUT), {
        target: { value: 'Dirty Power' },
      });
    });

    /**
     * Confirms that when the form is dirty, clicking the "Back" button triggers the
     * confirmation modal.
     */
    test('shows confirmation modal when clicking Back button', async () => {
      fireEvent.click(screen.getByTestId(SELECTOR.BACK_BUTTON));

      expect(await screen.findByText('Discard Changes?')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', expect.any(Object));
    });

    /**
     * Ensures that if the form is clean, clicking "Back" bypasses the modal and navigates immediately.
     */
    test('navigates immediately if form is not dirty', () => {
      fireEvent.click(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON));

      waitFor(() => expect(screen.getByTestId(SELECTOR.SAVE_DRAFT_BUTTON)).toBeDisabled());

      fireEvent.click(screen.getByTestId(SELECTOR.BACK_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', expect.any(Object));
    });
  });

  /**
   * Test block for View Mode, handling display and the multiple assignment dropdown.
   */
  describe('E. View Mode: Rendering and Assignment Dropdown', () => {
    const viewItem = {
      poin: '5555',
      name: 'View Only Power',
      description: 'Viewing',
      assignments: [
        { plin: '1234#12', expiryDate: '01/01/2030' },
        { plin: '5678#90', expiryDate: '01/01/2030' },
      ],
      remarks: 'view-remark',
      csRemarks: 'view-cs-remark',
    };

    /**
     * Verifies that the component renders in view mode with read-only inputs, POIN display,
     * and the correct action buttons.
     */
    test('E.1: renders view mode with read-only inputs and actions', () => {
      apiMock.getCharacterName.mockImplementation((plin) =>
        plin === '1234#12' ? 'Test User A' : ''
      );

      renderWithRouter(<CreatePower />, '/create-power', {
        mode: 'view',
        item: viewItem,
      });

      expect(screen.getByRole('heading', { name: 'Power Properties' })).toBeInTheDocument();
      expect(screen.getByTestId(SELECTOR.POIN_DISPLAY)).toHaveValue('5555');
      expect(screen.getByTestId(SELECTOR.POWER_NAME_INPUT)).toHaveAttribute('readonly');
      expect(screen.getByTestId(SELECTOR.EXPIRY_DATE_INPUT)).toHaveValue('Multiple');
      expect(screen.getByTestId(SELECTOR.EXTEND_POWER_BUTTON)).toBeInTheDocument();

      const ownerSearchInput = screen.getByTestId(SELECTOR.OWNER_SEARCH_INPUT);
      expect(ownerSearchInput).toHaveValue('');
    });

    /**
     * Verifies the owner combobox lists assignments, allows selection, and clears the form state.
     */
    test('E.2: owner combobox opens and selection works correctly', async () => {
      apiMock.getCharacterName.mockImplementation((plin) =>
        plin === '1234#12' ? 'Test User A' : 'Test User B'
      );

      renderWithRouter(<CreatePower />, '/create-power', {
        mode: 'view',
        item: viewItem,
      });

      const ownerSearchInput = screen.getByTestId(SELECTOR.OWNER_SEARCH_INPUT);
      const plinB = '5678#90';

      fireEvent.click(screen.getByTestId(SELECTOR.OWNER_SEARCH_TOGGLE_BUTTON));
      const plinOptionB = await screen.findByTestId(`${SELECTOR.PLIN_OPTION_PREFIX}-${plinB}`);
      fireEvent.click(plinOptionB);

      expect(ownerSearchInput).toHaveValue('5678#90 Test User B');
      expect(screen.getByTestId(SELECTOR.EXPIRY_DATE_INPUT)).toHaveValue('01/01/2030');

      fireEvent.click(screen.getByTestId(SELECTOR.OWNER_SEARCH_TOGGLE_BUTTON));

      expect(ownerSearchInput).toHaveValue('');
      expect(screen.getByTestId(SELECTOR.EXPIRY_DATE_INPUT)).toHaveValue('Multiple');
    });
  });
});