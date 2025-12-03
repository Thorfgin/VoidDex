import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import StoredChanges from './StoredChanges';
import * as offlineStorage from '../services/offlineStorage';

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

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/stored-changes']}>
        <Routes>
          <Route path="/stored-changes" element={<StoredChanges />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('renders empty state', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue([]);
    const { getByText } = renderComponent();
    expect(getByText('No stored changes found.')).toBeTruthy();
  });

  test('renders list of drafts with correct badge logic', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText } = renderComponent();
    
    expect(getByText('Draft Rifle')).toBeTruthy();
    expect(getByText('Space Flu')).toBeTruthy();
    expect(getByText('create')).toBeTruthy();
    expect(getByText('assign')).toBeTruthy();
    expect(getByText('(New ITIN)')).toBeTruthy();
    // Use regex for partial text matches
    expect(getByText(/COIN 9000/)).toBeTruthy();
    expect(getByText(/POIN 7000/)).toBeTruthy();
  });

  test('filters drafts by type', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText, queryByText } = renderComponent();

    fireEvent.click(getByText('POIN', { selector: 'button' }));

    expect(getByText('Alpha Power')).toBeTruthy();
    expect(queryByText('Draft Rifle')).toBeNull();
    expect(queryByText('Space Flu')).toBeNull();
    expect(getByText('1 Drafts')).toBeTruthy();
  });

  test('sorts drafts by title', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText, getAllByText } = renderComponent();

    const titleSortBtn = getByText('Title', { selector: 'button' });
    fireEvent.click(titleSortBtn);

    const items = getAllByText(/Draft Rifle|Space Flu|Alpha Power/);
    
    // Check order by content
    expect(items[0].textContent).toContain('Alpha Power');
    expect(items[1].textContent).toContain('Draft Rifle');
    expect(items[2].textContent).toContain('Space Flu');
  });

  test('toggles pin state', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getAllByTitle } = renderComponent();

    const pinBtns = getAllByTitle('Pin');
    fireEvent.click(pinBtns[0]);

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
        id: 'draft-1',
        isPinned: true
    }));
  });

  test('navigates to create page with draft data on click', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText } = renderComponent();

    fireEvent.click(getByText('Draft Rifle'));

    expect(mockNavigate).toHaveBeenCalledWith('/create-item', expect.objectContaining({
        state: expect.objectContaining({
            draftId: 'draft-1',
            initialData: mockChanges[0].data
        })
    }));
  });

  test('deletes single draft', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText, getAllByTitle } = renderComponent();

    const deleteBtns = getAllByTitle('Remove');
    fireEvent.click(deleteBtns[0]);

    expect(getByText('Remove draft?')).toBeTruthy();

    fireEvent.click(getByText('Remove'));

    expect(offlineStorage.deleteStoredChange).toHaveBeenCalledWith('draft-1');
  });

  test('bulk deletes drafts', () => {
    (offlineStorage.getStoredChanges as any).mockReturnValue(mockChanges);
    const { getByText } = renderComponent();

    jest.useFakeTimers();
    const card = getByText('Draft Rifle').closest('div');
    if (!card) throw new Error("Card not found");

    fireEvent.mouseDown(card);
    act(() => { jest.advanceTimersByTime(600); });
    fireEvent.mouseUp(card);

    expect(getByText('1 Selected')).toBeTruthy();

    const card2 = getByText('Space Flu').closest('div');
    if (card2) fireEvent.click(card2);

    expect(getByText('2 Selected')).toBeTruthy();

    fireEvent.click(document.querySelector('button[title="Delete Selected"]')!);

    expect(getByText(/remove 2 selected draft/i)).toBeTruthy();

    fireEvent.click(getByText('Remove 2 Drafts'));

    expect(offlineStorage.deleteStoredChange).toHaveBeenCalledWith('draft-1');
    expect(offlineStorage.deleteStoredChange).toHaveBeenCalledWith('draft-2');

    jest.useRealTimers();
  });
});