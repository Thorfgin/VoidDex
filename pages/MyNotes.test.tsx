import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import MyNotes from './MyNotes';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
// @ts-ignore
import * as api from '../services/api';
import { renderWithRouter } from '../testUtils';

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
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

const mockNotes = [
  {
    id: 'note-1',
    title: 'Alpha Note',
    content: 'Content A',
    linkedIds: ['ITIN:1234'],
    timestamp: 1000,
    isPinned: false
  },
  {
    id: 'note-2',
    title: 'Beta Note',
    content: 'Content B',
    linkedIds: ['COIN:9999'],
    timestamp: 2000,
    isPinned: false
  },
  {
    id: 'note-3',
    title: 'Gamma Note',
    content: 'Content C',
    linkedIds: [],
    timestamp: 3000,
    isPinned: true
  }
];

describe('MyNotes Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state', () => {
    (offlineStorage.getNotes as any).mockReturnValue([]);
    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');
    expect(getByText("You haven't created any notes yet.")).toBeTruthy();
  });

  test('renders list of notes with pinned item at top', () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    expect(getByText('Gamma Note')).toBeTruthy();
  });

  test('toggles sorting order', () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    const { getByText, getAllByText } = renderWithRouter(<MyNotes />, '/my-notes');

    const titleSortBtn = getByText('Title', { selector: 'button' });
    fireEvent.click(titleSortBtn); // Becomes Title ASC

    const visibleNotes = getAllByText(/Alpha Note|Beta Note|Gamma Note/);
    expect(visibleNotes[0].textContent).toContain('Gamma Note'); // Pinned first
    expect(visibleNotes[1].textContent).toContain('Alpha Note');
    expect(visibleNotes[2].textContent).toContain('Beta Note');
  });

  test('toggles pin status', () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    const { getAllByTitle } = renderWithRouter(<MyNotes />, '/my-notes');

    const pinButtons = getAllByTitle('Pin');
    fireEvent.click(pinButtons[0]);

    expect(offlineStorage.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      isPinned: true
    }));
  });

  test('filters notes by type', () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    const { getByText, queryByText } = renderWithRouter(<MyNotes />, '/my-notes');

    fireEvent.click(getByText('ITIN'));

    expect(getByText('Alpha Note')).toBeTruthy();
    expect(queryByText('Beta Note')).toBeNull();
    expect(getByText('1 Found')).toBeTruthy();
  });

  test('navigates to create note', () => {
    (offlineStorage.getNotes as any).mockReturnValue([]);
    const { getByTitle } = renderWithRouter(<MyNotes />, '/my-notes');
    fireEvent.click(getByTitle('New Note'));
    expect(mockNavigate).toHaveBeenCalledWith('/create-note');
  });

  test('opens note detail on click', () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');
    fireEvent.click(getByText('Alpha Note'));
    expect(mockNavigate).toHaveBeenCalledWith('/create-note', expect.objectContaining({
      state: expect.objectContaining({ note: mockNotes[0] })
    }));
  });

  test('handles single deletion', () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    const { getAllByTitle, getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    const deleteBtns = getAllByTitle('Delete Note');
    fireEvent.click(deleteBtns[0]);

    expect(getByText('Delete Note?')).toBeTruthy();

    fireEvent.click(getByText('Delete'));

    expect(offlineStorage.deleteNote).toHaveBeenCalled();
  });

  test('handles bulk selection and deletion', async () => {
    (offlineStorage.getNotes as any).mockReturnValue(mockNotes);
    jest.useFakeTimers();

    const { getByText } = renderWithRouter(<MyNotes />, '/my-notes');

    const alphaNote = getByText('Alpha Note').closest('div')?.parentElement;
    if(!alphaNote) throw new Error("Card not found");

    const touchTarget = alphaNote.querySelector('div.flex-1');
    if(!touchTarget) throw new Error("Touch target not found");

    fireEvent.mouseDown(touchTarget);

    // Simulate long press
    jest.advanceTimersByTime(600);

    fireEvent.mouseUp(touchTarget);

    // Wait for the UI to update to selection mode
    await waitFor(() => {
      expect(getByText('1 Selected')).toBeTruthy();
    });

    const bulkTrash = document.querySelector('button[title="Delete Selected"]');
    if (bulkTrash) fireEvent.click(bulkTrash);

    const confirmBtn = getByText(/Delete 1 Notes/i);
    fireEvent.click(confirmBtn);

    expect(offlineStorage.deleteNote).toHaveBeenCalledWith('note-1');

    jest.useRealTimers();
  });
});