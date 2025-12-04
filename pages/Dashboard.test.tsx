import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import Dashboard from './Dashboard';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
  searchGlobal: jest.fn(),
  getCharacterName: jest.fn((plin: string) => (plin === '1001#12' ? 'John Doe' : '')),
}));

jest.mock('../services/offlineStorage', () => ({
  getStoredChanges: jest.fn(() => []),
  getNotes: jest.fn(() => []),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
}));

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

const mockData = [
  {
    itin: '1111',
    name: 'Laser Pistol',
    description: 'A small energy weapon.',
    owner: '1001#12',
    expiryDate: '01/01/2025',
  },
  {
    coin: '9001',
    name: 'Radiation Sickness',
    description: 'Mild radiation poisoning.',
    assignments: [{ plin: '1001#12', expiryDate: '31/12/2030' }],
    remarks: '',
  },
  {
    poin: '6000',
    name: 'Super Strength',
    description: 'Lift heavy things',
    assignments: [{ plin: '1001#12', expiryDate: '01/01/2026' }],
    remarks: '',
  },
];

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders dashboard grid buttons initially', () => {
    const { getByText } = renderWithRouter(<Dashboard />);

    expect(getByText('Create Item')).toBeTruthy();
    expect(getByText('Create Condition')).toBeTruthy();
    expect(getByText('Create Power')).toBeTruthy();
  });

  test('navigates to specific pages when grid buttons clicked', () => {
    const { getByText } = renderWithRouter(<Dashboard />);

    fireEvent.click(getByText('Create Power'));
    expect(mockNavigate).toHaveBeenCalledWith('/create-power');

    fireEvent.click(getByText('Extend Power'));
    expect(mockNavigate).toHaveBeenCalledWith('/extend-power');

    fireEvent.click(getByText('Assign Power'));
    expect(mockNavigate).toHaveBeenCalledWith('/assign-power');
  });

  test('toggles between Grid and List view and persists in localStorage', () => {
    const { getByTitle } = renderWithRouter(<Dashboard />);

    const listBtn = getByTitle('List View');
    fireEvent.click(listBtn);
    expect(localStorage.getItem('dashboard_view_mode')).toBe('list');

    const gridBtn = getByTitle('Grid View');
    fireEvent.click(gridBtn);
    expect(localStorage.getItem('dashboard_view_mode')).toBe('grid');
  });

  test('navigates to My Notes', () => {
    const { getByTitle } = renderWithRouter(<Dashboard />);
    const notesBtn = getByTitle('My Notes');
    fireEvent.click(notesBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/my-notes');
  });

  test('shows draft and note badges based on offline storage', () => {
    offlineMock.getStoredChanges.mockReturnValue([
      {
        id: 'draft-1',
        type: 'item',
        action: 'create',
        data: {},
        timestamp: 0,
        title: 'Draft 1',
        subtitle: 'Draft Item',
      },
      {
        id: 'draft-2',
        type: 'item',
        action: 'create',
        data: {},
        timestamp: 0,
        title: 'Draft 2',
        subtitle: 'Draft Item',
      },
    ]);
    offlineMock.getNotes.mockReturnValue([
      {
        id: 'note-1',
        title: 'Note 1',
        content: '',
        linkedIds: [],
        timestamp: 0,
      },
      {
        id: 'note-2',
        title: 'Note 2',
        content: '',
        linkedIds: [],
        timestamp: 0,
      },
      {
        id: 'note-3',
        title: 'Note 3',
        content: '',
        linkedIds: [],
        timestamp: 0,
      },
    ]);

    const { getByTitle, getAllByText } = renderWithRouter(<Dashboard />);

    const draftsBtn = getByTitle('My Stored Changes');
    const notesBtn = getByTitle('My Notes');

    expect(draftsBtn).toBeTruthy();
    expect(notesBtn).toBeTruthy();

    // Badge text "2" for drafts and "3" for notes should exist
    expect(getAllByText('2').length).toBeGreaterThan(0);
    expect(getAllByText('3').length).toBeGreaterThan(0);
  });

  test('performs search and shows mixed results', async () => {
    apiMock.searchGlobal.mockResolvedValue({ success: true, data: mockData });

    const { findByText } = renderWithRouter(<Dashboard />, '/?q=1001');

    // Laser Pistol item
    expect(await findByText('Laser Pistol')).toBeTruthy();
    expect(apiMock.searchGlobal).toHaveBeenCalledWith('1001');

    // Condition and Power
    expect(await findByText('Radiation Sickness')).toBeTruthy();
    expect(await findByText('Super Strength')).toBeTruthy();
  });

  test('smart search: auto-filters when POIN prefix is used', async () => {
    apiMock.searchGlobal.mockResolvedValue({ success: true, data: mockData });

    const { getByPlaceholderText } = renderWithRouter(<Dashboard />);

    const searchInput = getByPlaceholderText('Search...') as HTMLInputElement;

    // Simulate typing "POIN 6000"
    fireEvent.change(searchInput, { target: { value: 'POIN 6000' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      // searchGlobal should be called with only the numeric part "6000"
      expect(apiMock.searchGlobal).toHaveBeenCalledWith('6000');
    });
  });

  test('displays "No results" when search returns empty', async () => {
    apiMock.searchGlobal.mockResolvedValue({ success: true, data: [] });

    const { findByText } = renderWithRouter(<Dashboard />, '/?q=nothing');

    expect(await findByText('No results match your search.')).toBeTruthy();
  });

  test('filters results to only powers when POIN filter chip is selected', async () => {
    // Local mock data for this test only – independent of any shared fixture
    const localData = [
      {
        itin: '1111',
        name: 'Test Item',
        description: 'Item desc',
        owner: '1001#12',
        expiryDate: '01/01/2025',
      },
      {
        coin: '9001',
        name: 'Test Condition',
        description: 'Cond desc',
        assignments: [{ plin: '1001#12', expiryDate: '31/12/2030' }],
        remarks: '',
      },
      {
        poin: '6666',
        name: 'Test Power',
        description: 'Power desc',
        assignments: [{ plin: '1001#12', expiryDate: '01/01/2026' }],
        remarks: '',
      },
    ];

    apiMock.searchGlobal.mockResolvedValue({
      success: true,
      data: localData,
    });

    const {
      getByPlaceholderText,
      getByText,
      queryByText,
      findByText,
    } = renderWithRouter(<Dashboard />);

    const searchInput = getByPlaceholderText('Search...') as HTMLInputElement;

    // Use the POIN from local data so this test only depends on its own data
    const poinQuery = localData[2].poin;

    // Trigger a search (full integration doesn’t matter; we’re mocking the API)
    fireEvent.change(searchInput, { target: { value: poinQuery } });
    fireEvent.submit(searchInput.closest('form')!);

    // Wait until the search results render
    await waitFor(() => {
      expect(apiMock.searchGlobal).toHaveBeenCalled();
    });

    // All three should be visible with the default "all" filter
    expect(await findByText(localData[0].name)).toBeTruthy();
    expect(await findByText(localData[1].name)).toBeTruthy();
    expect(await findByText(localData[2].name)).toBeTruthy();

    // Click the POIN filter chip (label for filter === 'power')
    const powerFilterChip = getByText('POIN', { selector: 'button' });
    fireEvent.click(powerFilterChip);

    // Now only the power result should remain
    expect(await findByText(localData[2].name)).toBeTruthy();
    expect(queryByText(localData[0].name)).toBeNull();
    expect(queryByText(localData[1].name)).toBeNull();
  });


  test('clears search and returns to dashboard grid', async () => {
    apiMock.searchGlobal.mockResolvedValue({ success: true, data: mockData });

    const { findByText, queryByText } = renderWithRouter(
        <Dashboard />,
        '/?q=test'
    );

    // ensure search mode is active
    expect(await findByText('Laser Pistol')).toBeTruthy();

    // Locate the clear "X" button inside search input (matches classnames from the component)
    const clearBtn = document.querySelector(
        'button.absolute.right-2'
    ) as HTMLButtonElement | null;

    if (clearBtn) {
      fireEvent.click(clearBtn);
    }

    // After clearing, the dashboard grid should be visible again
    await waitFor(() => {
      expect(queryByText('Create Item')).toBeTruthy();
    });
  });
});
