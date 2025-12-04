// StoredChanges.test.tsx
// NOTE: no '@testing-library/jest-dom' import on purpose — we don't rely on its matchers.
import { fireEvent, waitFor, screen } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import StoredChanges from './StoredChanges';
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

// --- Mocks ---

jest.mock('../services/offlineStorage', () => ({
  getStoredChanges: jest.fn(),
  deleteStoredChange: jest.fn(),
  saveStoredChange: jest.fn(),
}));

const offlineMock = jest.mocked(offlineStorage, { shallow: false });

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as typeof import('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// --- Test data ---

const mockChanges = [
  {
    id: 'draft-1',
    type: 'item' as const,
    action: 'create' as const,
    data: { name: 'Draft Rifle' },
    timestamp: 1620000000000,
    title: 'Draft Rifle',
    subtitle: 'Create Item',
    isPinned: false,
  },
  {
    id: 'draft-2',
    type: 'condition' as const,
    action: 'assign' as const,
    data: { condition: { coin: '9000' } },
    timestamp: 1610000000000,
    title: 'Space Flu',
    subtitle: 'Assign COIN: 9000',
    isPinned: false,
  },
  {
    id: 'draft-3',
    type: 'power' as const,
    action: 'create' as const,
    data: { name: 'Biotic Push', power: { poin: '7000' } },
    timestamp: 1630000000000,
    title: 'Alpha Power',
    subtitle: 'Create Power',
    isPinned: true,
  },
];

describe('StoredChanges Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state', () => {
    offlineMock.getStoredChanges.mockReturnValue([]);

    renderWithRouter(<StoredChanges />, '/stored-changes');

    const emptyText = screen.getByText('No stored changes found.');
    expect(emptyText).toBeTruthy();
  });

  test('renders list of drafts with correct badge logic', () => {
    offlineMock.getStoredChanges.mockReturnValue(mockChanges);

    renderWithRouter(<StoredChanges />, '/stored-changes');

    // Titles
    expect(screen.getByText('Draft Rifle')).toBeTruthy();
    expect(screen.getByText('Space Flu')).toBeTruthy();
    expect(screen.getByText('Alpha Power')).toBeTruthy();

    // For item draft with no ITIN in data -> "(New ITIN)"
    expect(screen.getByText('(New ITIN)')).toBeTruthy();

    // Condition draft with coin in nested data -> "COIN 9000"
    expect(screen.getByText(/COIN 9000/)).toBeTruthy();
  });

  test('filters drafts by type (POIN/POWER)', () => {
    offlineMock.getStoredChanges.mockReturnValue(mockChanges);

    renderWithRouter(<StoredChanges />, '/stored-changes');

    // Filter button label "POIN" corresponds to FilterType 'POWER'
    const poinButton = screen.getByText('POIN', { selector: 'button' });
    fireEvent.click(poinButton);

    expect(screen.getByText('Alpha Power')).toBeTruthy();
    expect(screen.queryByText('Draft Rifle')).toBeNull();
    expect(screen.getByText('1 Drafts')).toBeTruthy();
  });

  test('sorts drafts by title (pinned stays on top)', () => {
    offlineMock.getStoredChanges.mockReturnValue(mockChanges);

    renderWithRouter(<StoredChanges />, '/stored-changes');

    const titleSortBtn = screen.getByText('Title', { selector: 'button' });
    fireEvent.click(titleSortBtn); // switch to TITLE ASC

    // Grab the title elements in DOM order
    const titles = screen.getAllByText(/Draft Rifle|Space Flu|Alpha Power/).map(
        el => el.textContent || ''
    );

    // Pinned "Alpha Power" should stay on top, then title ASC among the rest
    expect(titles[0]).toContain('Alpha Power');
    expect(titles[1]).toContain('Draft Rifle');
    expect(titles[2]).toContain('Space Flu');
  });

  test('toggles pin status and persists via saveStoredChange', () => {
    offlineMock.getStoredChanges.mockReturnValue(mockChanges);

    renderWithRouter(<StoredChanges />, '/stored-changes');

    // First pin button on an unpinned draft ("Draft Rifle")
    const pinButtons = screen.getAllByTitle('Pin');
    fireEvent.click(pinButtons[0]);

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'draft-1',
          isPinned: true,
        })
    );
  });

  test('navigates to correct page when clicking an item draft', () => {
    offlineMock.getStoredChanges.mockReturnValue(mockChanges);

    renderWithRouter(<StoredChanges />, '/stored-changes');

    fireEvent.click(screen.getByText('Draft Rifle'));

    expect(mockNavigate).toHaveBeenCalledWith(
        '/create-item',
        expect.objectContaining({
          state: expect.objectContaining({
            draftId: 'draft-1',
            draftTimestamp: mockChanges[0].timestamp,
            returnTo: '/stored-changes',
            initialData: mockChanges[0].data,
          }),
        })
    );
  });

  test('bulk deletes drafts via long-press selection', async () => {
    offlineMock.getStoredChanges.mockReturnValue(mockChanges);
    jest.useFakeTimers();

    try {
      renderWithRouter(<StoredChanges />, '/stored-changes');

      // Find the title element, then the card with handlers (div.flex-1)
      const titleEl = screen.getByText('Draft Rifle');
      const card = titleEl.closest('div.flex-1');
      if (!card) throw new Error('Card not found');

      // Start long-press
      fireEvent.mouseDown(card);
      jest.advanceTimersByTime(600); // > 500ms threshold
      fireEvent.mouseUp(card);

      // UI should enter selection mode
      await waitFor(() => {
        const selectionText = screen.getByText('1 Selected');
        expect(selectionText).toBeTruthy();
      });

      // Click bulk delete
      const bulkDeleteBtn = screen.getByTitle('Delete Selected');
      fireEvent.click(bulkDeleteBtn);

      // Confirm modal
      const confirmBtn = screen.getByText(/Remove 1 Drafts/i);
      fireEvent.click(confirmBtn);

      expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith('draft-1');
    } finally {
      jest.useRealTimers();
    }
  });
});
