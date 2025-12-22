import { fireEvent, waitFor, screen } from '@testing-library/react';
import CreateNote from './CreateNote';
import * as offlineStorage from '../services/offlineStorage';
import * as api from '../services/api';
import { renderWithRouter } from '../utils/testUtils';

// Mock the offline storage services.
jest.mock('../services/offlineStorage', () => ({
  saveNote: jest.fn(),
  deleteNote: jest.fn(),
}));

// Mock the external API services for entity lookup.
jest.mock('../services/api', () => ({
  searchItemByItin: jest.fn(),
  searchConditionByCoin: jest.fn(),
  searchPowerByPoin: jest.fn(),
}));

const mockNavigate = jest.fn();
// Mock the react-router-dom useNavigate hook.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

/**
 * Maps all data-testid attributes and placeholder texts used throughout the tests.
 */
const SELECTORS = {
  TITLE_INPUT_PLACEHOLDER: 'Note Title',
  CONTENT_INPUT: 'note-content-input',
  SAVE_BUTTON: 'save-note-btn',
  PIN_BUTTON: 'pin-note-btn',
  PINNED_STATUS: 'is-pinned-status',
  DIRTY_STATUS: 'is-dirty-status',
  DELETE_BUTTON: 'delete-note-btn',
  LINK_INPUT: 'add-link-input',
  LINK_TYPE_DISPLAY: 'current-link-type-display',
  LINK_SELECTOR_OTHER: 'link-type-selector-other',
  LINK_SELECTOR_PLIN: 'link-type-selector-plin',
  ADD_LINK_BUTTON: 'add-link-btn',
  // Prefixes for dynamic test IDs
  LINK_BADGE_PREFIX: 'link-badge-',
  LINK_REMOVE_BTN_PREFIX: 'link-remove-btn-',
  LINK_NAVIGATE_BTN_PREFIX: 'link-navigate-btn-',
};

/**
 * Test suite for the CreateNote component.
 */
describe('CreateNote Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** Tests that the primary form elements are rendered (title input, content input, and save button). */
  test('renders create form', () => {
    renderWithRouter(<CreateNote />, '/create-note');

    expect(screen.getByPlaceholderText(SELECTORS.TITLE_INPUT_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByTestId(SELECTORS.CONTENT_INPUT)).toBeTruthy();
    expect(screen.getByTestId(SELECTORS.SAVE_BUTTON)).toBeTruthy();
  });

  /** Tests the title validation when attempting to save an empty note. */
  test('validates title requirement', async () => {
    renderWithRouter(<CreateNote />, '/create-note');

    fireEvent.click(screen.getByTestId(SELECTORS.SAVE_BUTTON));

    expect(await screen.findByText('Title is required.')).toBeTruthy();
    expect(offlineStorage.saveNote).not.toHaveBeenCalled();
  });

  /** Tests saving a new note, including setting the pinned status and ensuring the state is cleaned afterward. */
  test('saves new note with pinned status and cleans state', async () => {
    renderWithRouter(
      <CreateNote />,
      '/create-note'
    );

    fireEvent.change(screen.getByPlaceholderText(SELECTORS.TITLE_INPUT_PLACEHOLDER), {
      target: { value: 'Test Note' },
    });

    // Explicitly click the element to ensure focus/activation for custom input components.
    fireEvent.click(screen.getByTestId(SELECTORS.CONTENT_INPUT));

    // Simulate input for custom components/contentEditable elements.
    fireEvent.change(screen.getByPlaceholderText('Write your note here...'), {
      target: { value: 'Some content' },
    });

    fireEvent.click(screen.getByTestId(SELECTORS.PIN_BUTTON));
    expect(screen.getByTestId(SELECTORS.PINNED_STATUS)).toHaveTextContent('Pinned');

    fireEvent.click(screen.getByTestId(SELECTORS.SAVE_BUTTON));

    expect(offlineStorage.saveNote).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Note',
        content: 'Some content',
        isPinned: true,
      })
    );

    await waitFor(() => {
      expect(screen.findByText('Note Saved!')).toBeTruthy();
      expect(screen.getByTestId(SELECTORS.DIRTY_STATUS)).toHaveTextContent('Clean');
    });
  });

  /** Tests the component's dirty state status updates correctly based on input changes. */
  test('updates dirty state status correctly', () => {
    renderWithRouter(<CreateNote />, '/create-note');
    const dirtyStatus = screen.getByTestId(SELECTORS.DIRTY_STATUS);
    const titleInput = screen.getByPlaceholderText(SELECTORS.TITLE_INPUT_PLACEHOLDER);

    expect(dirtyStatus).toHaveTextContent('Clean');

    fireEvent.change(titleInput, { target: { value: 'D' } });
    expect(dirtyStatus).toHaveTextContent('Dirty');

    fireEvent.change(titleInput, { target: { value: '' } });
    expect(dirtyStatus).toHaveTextContent('Clean');
  });

  /** Tests deleting an existing note after confirmation. */
  test('deletes existing note after confirmation', async () => {
    const existingNote = {
      id: 'note-1',
      title: 'To Delete',
      content: '',
      linkedIds: [],
      timestamp: 123,
      isPinned: false,
    };

    renderWithRouter(
      <CreateNote />,
      '/create-note',
      { note: existingNote }
    );

    const deleteBtn = screen.getByTestId(SELECTORS.DELETE_BUTTON);
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Delete Note?')).toBeTruthy();

    fireEvent.click(screen.getByText('Delete'));

    expect(offlineStorage.deleteNote).toHaveBeenCalledWith('note-1');
    expect(mockNavigate).toHaveBeenCalledWith('/my-notes');
  });

  /** Tests the link input auto-formatting for PLIN and the automatic type detection (PLIN, ITIN, OTHER). */
  test('detects link type and formats input', () => {
    renderWithRouter(<CreateNote />, '/create-note');
    const linkInput = screen.getByTestId(SELECTORS.LINK_INPUT) as HTMLInputElement;
    const currentTypeDisplay = screen.getByTestId(SELECTORS.LINK_TYPE_DISPLAY);

    fireEvent.change(linkInput, { target: { value: '12345' } });
    expect(linkInput.value).toBe('1234#5');
    expect(currentTypeDisplay).toHaveTextContent('AUTO');

    fireEvent.change(linkInput, { target: { value: '1234' } });
    expect(currentTypeDisplay).toHaveTextContent('AUTO');

    fireEvent.click(screen.getByTestId(SELECTORS.LINK_SELECTOR_OTHER));
    expect(currentTypeDisplay).toHaveTextContent('OTHER');
  });

  /** Tests successful ITIN link addition with API verification. */
  test('verifies and adds ITIN link', async () => {
    (api.searchItemByItin as any).mockResolvedValue({
      success: true,
      data: { name: 'Item X' },
    });

    renderWithRouter(
      <CreateNote />,
      '/create-note'
    );

    fireEvent.change(screen.getByTestId(SELECTORS.LINK_INPUT), { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId(SELECTORS.ADD_LINK_BUTTON));

    await waitFor(() => {
      expect(api.searchItemByItin).toHaveBeenCalledWith('1234');
    });

    const itinBadgeId = SELECTORS.LINK_BADGE_PREFIX + 'ITIN-1234';
    expect(screen.getByText('ITIN 1234')).toBeTruthy();
    expect(screen.getByTestId(itinBadgeId)).toBeInTheDocument();
  });

  /** Tests prevention of ITIN linking if verification fails (ID not found). */
  test('prevents linking ITIN if verification fails', async () => {
    (api.searchItemByItin as any).mockResolvedValue({
      success: false,
      error: 'Not found',
    });

    renderWithRouter(<CreateNote />, '/create-note');
    const linkInput = screen.getByTestId(SELECTORS.LINK_INPUT);
    const addBtn = screen.getByTestId(SELECTORS.ADD_LINK_BUTTON);

    fireEvent.change(linkInput, { target: { value: '1234' } });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(api.searchItemByItin).toHaveBeenCalledWith('1234');
    });

    const errorMsg = await screen.findByText(/ITIN 1234 not found in database/i);
    expect(errorMsg).toBeTruthy();

    const itinBadgeId = SELECTORS.LINK_BADGE_PREFIX + 'ITIN-1234';
    expect(screen.queryByTestId(itinBadgeId)).toBeNull();
  });

  /** Tests that PLIN and OTHER links are added successfully without requiring API verification. */
  test('adds PLIN and OTHER links without API verification', async () => {
    renderWithRouter(<CreateNote />, '/create-note');
    const linkInput = screen.getByTestId(SELECTORS.LINK_INPUT);
    const addBtn = screen.getByTestId(SELECTORS.ADD_LINK_BUTTON);

    const plinBadgeId = SELECTORS.LINK_BADGE_PREFIX + 'PLIN-1234#5';
    const otherBadgeId = SELECTORS.LINK_BADGE_PREFIX + 'OTHER-Random Text Link';

    expect(screen.queryByTestId(plinBadgeId)).toBeNull();
    expect(screen.queryByTestId(otherBadgeId)).toBeNull();

    fireEvent.change(linkInput, { target: { value: '1234#5' } });
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByText('PLIN 1234#5')).toBeTruthy();
      expect(screen.getByTestId(plinBadgeId)).toBeInTheDocument();
    });
    expect(api.searchItemByItin).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId(SELECTORS.LINK_SELECTOR_OTHER));
    fireEvent.change(linkInput, { target: { value: 'Random Text Link' } });
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByText('Random Text Link')).toBeTruthy();

      expect(screen.getByTestId(plinBadgeId)).toBeInTheDocument();
      expect(screen.getByTestId(otherBadgeId)).toBeInTheDocument();
    });
  });

  /** Tests link removal functionality by clicking the remove button on a badge. */
  test('removes a linked object', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: { name: 'Item X' } });

    renderWithRouter(
      <CreateNote />,
      '/create-note'
    );

    fireEvent.change(screen.getByTestId(SELECTORS.LINK_INPUT), { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId(SELECTORS.ADD_LINK_BUTTON));

    await waitFor(() => screen.getByText('ITIN 1234'));

    const itinBadgeId = SELECTORS.LINK_BADGE_PREFIX + 'ITIN-1234';
    const removeBtnId = SELECTORS.LINK_REMOVE_BTN_PREFIX + 'ITIN-1234';

    expect(screen.getByTestId(itinBadgeId)).toBeInTheDocument();

    const removeBtn = screen.getByTestId(removeBtnId);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId(itinBadgeId)).toBeNull();
    });
  });

  /** Tests the navigation confirmation modal appears when clicking an ITIN link while the note has unsaved changes (is dirty). */
  test('prompts for confirmation before navigating to ITIN link if note is dirty', async () => {
    (api.searchItemByItin as any).mockResolvedValue({
      success: true,
      data: { id: '1234', name: 'Test Item' },
    });

    renderWithRouter(<CreateNote />, '/create-note');

    fireEvent.change(screen.getByPlaceholderText(SELECTORS.TITLE_INPUT_PLACEHOLDER), { target: { value: 'Dirty Note' } });

    fireEvent.change(screen.getByTestId(SELECTORS.LINK_INPUT), { target: { value: '1234' } });
    fireEvent.click(screen.getByTestId(SELECTORS.ADD_LINK_BUTTON));
    await waitFor(() => screen.getByText('ITIN 1234'));

    const navigateBtnId = SELECTORS.LINK_NAVIGATE_BTN_PREFIX + 'ITIN-1234';
    fireEvent.click(screen.getByTestId(navigateBtnId));

    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Discard'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/create-item',
        expect.objectContaining({
          state: expect.objectContaining({
            mode: 'view',
            returnTo: '/create-note',
            returnState: expect.objectContaining({
              note: expect.objectContaining({
                title: 'Dirty Note',
              }),
            }),
          }),
        })
      );
    });
  });

  /** Tests the navigation confirmation modal appears and correctly navigates to the dashboard search for PLIN links. */
  test('navigates to dashboard search for PLIN links after confirmation', async () => {
    renderWithRouter(<CreateNote />, '/create-note');

    fireEvent.change(screen.getByPlaceholderText(SELECTORS.TITLE_INPUT_PLACEHOLDER), { target: { value: 'Dirty Note' } });

    fireEvent.click(screen.getByTestId(SELECTORS.LINK_SELECTOR_PLIN));
    fireEvent.change(screen.getByTestId(SELECTORS.LINK_INPUT), { target: { value: '9876#99' } });
    fireEvent.click(screen.getByTestId(SELECTORS.ADD_LINK_BUTTON));
    await waitFor(() => screen.getByText('PLIN 9876#99'));

    const navigateBtnId = SELECTORS.LINK_NAVIGATE_BTN_PREFIX + 'PLIN-9876#99';
    fireEvent.click(screen.getByTestId(navigateBtnId));

    expect(screen.getByText('Discard')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Discard'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/?q=9876#99&filter=owner');
    });
  });

  /** Tests that the component registers the necessary `beforeunload` handler to warn the user about unsaved changes. */
  test('dirty check logic registers beforeUnload handler', () => {
    const addEventSpy = jest.spyOn(window, 'addEventListener');

    renderWithRouter(<CreateNote />, '/create-note');

    expect(addEventSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });
});