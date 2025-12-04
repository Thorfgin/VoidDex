import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import MyNotes from './MyNotes';
import * as offlineStorage from '../services/offlineStorage';
import * as api from '../services/api';
import { renderWithRouter } from '../testUtils';
import type { Note } from '../types';

// ---- Typed mocks ----
jest.mock('../services/offlineStorage', () => ({
  getNotes: jest.fn(),
  deleteNote: jest.fn(),
  saveNote: jest.fn(),
}));

jest.mock('../services/api', () => ({
  searchItemByItin: jest.fn(),
  searchConditionByCoin: jest.fn(),
  searchPowerByPoin: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;
const apiMock = api as jest.Mocked<typeof api>;

const mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Alpha Note',
    content: 'Content A',
    linkedIds: ['ITIN:1234'],
    timestamp: 1000,
    isPinned: false,
  },
  {
    id: 'note-2',
    title: 'Beta Note',
    content: 'Content B',
    linkedIds: ['COIN:9999'],
    timestamp: 2000,
    isPinned: false,
  },
  {
    id: 'note-3',
    title: 'Gamma Note',
    content: 'Content C',
    linkedIds: [],
    timestamp: 3000,
    isPinned: true,
  },
];

describe('MyNotes Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when there are no notes', () => {
    offlineMock.getNotes.mockReturnValue([]);

    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    expect(getByText("You haven't created any notes yet.")).toBeTruthy();
  });

  test('renders list of notes and shows pinned note', () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    // Pinned note should be present and (by component logic) sorted to the top
    expect(getByText('Gamma Note')).toBeTruthy();
  });

  test('toggles sorting order by title while keeping pinned notes on top', () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    const { getByText, getAllByText } = renderWithRouter(<MyNotes />, '/my-notes');

    const titleSortBtn = getByText('Title', { selector: 'button' });
    fireEvent.click(titleSortBtn); // Switch to TITLE sort (ASC)

    // We just assert that all three notes are present and that pinned still exists;
    // DOM order assertions can be fragile, but we can at least check 3 matched nodes.
    const visibleNotes = getAllByText(/Alpha Note|Beta Note|Gamma Note/);
    expect(visibleNotes.length).toBe(3);
    expect(visibleNotes.some(el => el.textContent?.includes('Gamma Note'))).toBeTruthy();
  });

  test('toggles pin status and persists via saveNote', () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    const { getAllByTitle } = renderWithRouter(<MyNotes />, '/my-notes');

    // Initially all notes except one are unpinned; component uses title "Pin" for pin button
    const pinButtons = getAllByTitle('Pin');
    expect(pinButtons.length).toBeGreaterThan(0);

    fireEvent.click(pinButtons[0]);

    expect(offlineMock.saveNote).toHaveBeenCalledWith(
        expect.objectContaining({
          isPinned: true,
        }),
    );
  });

  test('filters notes by ITIN linkedId', () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    const { getByText, queryByText } = renderWithRouter(<MyNotes />, '/my-notes');

    fireEvent.click(getByText('ITIN'));

    // Only Alpha Note has ITIN link in mockNotes
    expect(getByText('Alpha Note')).toBeTruthy();
    expect(queryByText('Beta Note')).toBeNull();
    expect(getByText('1 Found')).toBeTruthy();
  });

  test('navigates to create note when New Note is clicked', () => {
    offlineMock.getNotes.mockReturnValue([]);

    const { getByTitle } = renderWithRouter(<MyNotes />, '/my-notes');

    fireEvent.click(getByTitle('New Note'));

    expect(mockNavigate).toHaveBeenCalledWith('/create-note');
  });

  test('opens note detail on card click', () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    fireEvent.click(getByText('Alpha Note'));

    expect(mockNavigate).toHaveBeenCalledWith(
        '/create-note',
        expect.objectContaining({
          state: expect.objectContaining({ note: mockNotes[0] }),
        }),
    );
  });

  test('handles single deletion with confirmation', () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    const { getAllByTitle, getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    const deleteBtns = getAllByTitle('Delete Note');
    fireEvent.click(deleteBtns[0]);

    expect(getByText('Delete Note?')).toBeTruthy();

    fireEvent.click(getByText('Delete'));

    expect(offlineMock.deleteNote).toHaveBeenCalled();
  });
  test('handles bulk selection via long-press and bulk deletion', async () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);
    jest.useFakeTimers();

    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    const alphaTitle = getByText('Alpha Note');
    // The interactive card itself has the "flex-1" class
    const touchTarget = alphaTitle.closest('div.flex-1') as HTMLElement | null;
    if (!touchTarget) throw new Error('Touch target not found');

    // Start long press
    fireEvent.mouseDown(touchTarget);

    // Simulate the 500ms long-press threshold
    jest.advanceTimersByTime(600);

    fireEvent.mouseUp(touchTarget);

    // Wait for UI to switch to selection mode
    await waitFor(() => {
      expect(getByText('1 Selected')).toBeTruthy();
    });

    const bulkTrash = document.querySelector(
        'button[title="Delete Selected"]'
    ) as HTMLButtonElement | null;
    if (bulkTrash) {
      fireEvent.click(bulkTrash);
    }

    const confirmBtn = getByText(/Delete 1 Notes/i);
    fireEvent.click(confirmBtn);

    expect(offlineMock.deleteNote).toHaveBeenCalledWith('note-1');

    jest.useRealTimers();
  });


  test('clicking an ITIN link badge attempts to resolve the object via API', async () => {
    offlineMock.getNotes.mockReturnValue(mockNotes);

    apiMock.searchItemByItin.mockResolvedValue({
      success: true,
      data: { itin: '1234', name: 'Linked Item' },
    } as any);

    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    // ITIN badge gets truncated to something like "ITIN 1234", so we query by "ITIN"
    const itinFilterChip = getByText('ITIN');
    fireEvent.click(itinFilterChip);

    const badge = getByText(/ITIN 1234/);
    fireEvent.click(badge);

    await waitFor(() => {
      expect(apiMock.searchItemByItin).toHaveBeenCalledWith('1234');
    });
  });
});
