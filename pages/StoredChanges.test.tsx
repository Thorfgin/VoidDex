import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import StoredChanges from './StoredChanges';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/offlineStorage', () => ({
  getStoredChanges: jest.fn(),
  deleteStoredChange: jest.fn(),
  saveStoredChange: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

const mockChanges = [
  {
    id: 'draft-1',
    type: 'item',
    action: 'create',
    data: { name: 'Draft Rifle' },
    timestamp: 1620000000000,
    title: 'Draft Rifle',
    subtitle: 'Create Item',
    isPinned: false
  },
  {
    id: 'draft-2',
    type: 'condition',
    action: 'assign',
    data: { condition: { coin: '9000' } },
    timestamp: 1610000000000,
    title: 'Space Flu',
    subtitle: 'Assign COIN: 9000',
    isPinned: false
  },
  {
    id: 'draft-3',
    type: 'power',
    action: 'create',
    data: { name: 'Biotic Push', power: { poin: '7000' } },
    timestamp: 1630000000000,
    title: 'Alpha Power',
    subtitle: 'Create Power',
    isPinned: true
  }
];

describe('StoredChanges Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue([]);
    const { getByText } = renderWithRouter(<StoredChanges />, '/stored-changes');
    expect(getByText('No stored changes found.')).toBeTruthy();
  });

  test('renders list of drafts with correct badge logic', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText } = renderWithRouter(<StoredChanges />, '/stored-changes');

    expect(getByText('Draft Rifle')).toBeTruthy();
    expect(getByText('Space Flu')).toBeTruthy();
    expect(getByText('(New ITIN)')).toBeTruthy();
    expect(getByText(/COIN 9000/)).toBeTruthy();
  });

  test('filters drafts by type', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText, queryByText } = renderWithRouter(<StoredChanges />, '/stored-changes');

    fireEvent.click(getByText('POIN', { selector: 'button' }));

    expect(getByText('Alpha Power')).toBeTruthy();
    expect(queryByText('Draft Rifle')).toBeNull();
    expect(getByText('1 Drafts')).toBeTruthy();
  });

  test('sorts drafts by title', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText, getAllByText } = renderWithRouter(<StoredChanges />, '/stored-changes');

    const titleSortBtn = getByText('Title', { selector: 'button' });
    fireEvent.click(titleSortBtn);

    const items = getAllByText(/Draft Rifle|Space Flu|Alpha Power/);
    expect(items[0].textContent).toContain('Alpha Power');
    expect(items[1].textContent).toContain('Draft Rifle');
  });

  test('bulk deletes drafts', async () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText } = renderWithRouter(<StoredChanges />, '/stored-changes');

    jest.useFakeTimers();
    const card = getByText('Draft Rifle').closest('div');
    if (!card) throw new Error("Card not found");

    fireEvent.mouseDown(card);

    // Simulate long press without act wrapper
    jest.advanceTimersByTime(600);

    fireEvent.mouseUp(card);

    // Wait for the UI to reflect the selection state
    await waitFor(() => {
      expect(getByText('1 Selected')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('button[title="Delete Selected"]')!);
    fireEvent.click(getByText(/Remove 1 Drafts/));

    expect(offlineStorage.deleteStoredChange).toHaveBeenCalledWith('draft-1');

    jest.useRealTimers();
  });
});