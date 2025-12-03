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
  getCharacterName: jest.fn((plin) => plin === '1001#12' ? 'John Doe' : ''),
}));

jest.mock('../services/offlineStorage', () => ({
  getStoredChanges: jest.fn(() => []),
  getNotes: jest.fn(() => []),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

const mockData = [
  {
    itin: '1111',
    name: 'Laser Pistol',
    description: 'A small energy weapon.',
    owner: '1001#12',
    expiryDate: '01/01/2025'
  },
  {
    coin: '9001',
    name: 'Radiation Sickness',
    description: 'Mild radiation poisoning.',
    assignments: [{ plin: '1001#12', expiryDate: '31/12/2030' }],
    remarks: ''
  },
  {
    poin: '6000',
    name: 'Super Strength',
    description: 'Lift heavy things',
    assignments: [{ plin: '1001#12', expiryDate: '01/01/2026' }],
    remarks: ''
  }
];

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('toggles between Grid and List view', () => {
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

  test('performs search and shows mixed results', async () => {
    (api.searchGlobal as any).mockResolvedValue({ success: true, data: mockData });
    const { findByText } = renderWithRouter(<Dashboard />, '/?q=1001');

    expect(await findByText('Laser Pistol')).toBeTruthy();
    expect(api.searchGlobal).toHaveBeenCalledWith('1001');

    expect(await findByText('Radiation Sickness')).toBeTruthy();
    expect(await findByText('Super Strength')).toBeTruthy();
  });

  test('smart search: auto-filters when prefix is used', async () => {
    (api.searchGlobal as any).mockResolvedValue({ success: true, data: mockData });
    const { getByPlaceholderText } = renderWithRouter(<Dashboard />);

    const searchInput = getByPlaceholderText('Search...');

    // Simulate typing "POIN 6000"
    fireEvent.change(searchInput, { target: { value: 'POIN 6000' } });
    fireEvent.submit(searchInput.closest('form')!);

    // Should set filter to POIN (Power) and query to 6000
    // URL param check via mock logic is implicit, but we can check if results are filtered
    // searchGlobal called with "6000"
    await waitFor(() => {
      expect(api.searchGlobal).toHaveBeenCalledWith('6000');
    });
  });

  test('displays "No results" when search returns empty', async () => {
    (api.searchGlobal as any).mockResolvedValue({ success: true, data: [] });
    const { findByText } = renderWithRouter(<Dashboard />, '/?q=nothing');

    expect(await findByText('No results match your search.')).toBeTruthy();
  });

  test('handles filtering of results for Powers', async () => {
    (api.searchGlobal as any).mockResolvedValue({ success: true, data: mockData });
    const { getByText, findByText, queryByText } = renderWithRouter(<Dashboard />, '/?q=test');

    await findByText('Super Strength');

    const powerFilter = getByText('power', { selector: 'button' });
    fireEvent.click(powerFilter);

    expect(getByText('Super Strength')).toBeTruthy();
    expect(queryByText('Laser Pistol')).toBeNull();
    expect(queryByText('Radiation Sickness')).toBeNull();
  });

  test('clears search', async () => {
    (api.searchGlobal as any).mockResolvedValue({ success: true, data: mockData });
    const { findByText, queryByText } = renderWithRouter(<Dashboard />, '/?q=test');

    await findByText('Laser Pistol');

    const clearBtn = document.querySelector('button.absolute.right-2'); // X button
    if (clearBtn) {
      fireEvent.click(clearBtn);
    } else {
      // Fallback if icon changed, logic is "click X"
    }

    // After clear, we should see grid buttons again
    // "Create Item" is in grid
    await waitFor(() => {
      expect(queryByText('Create Item')).toBeTruthy();
    });
  });
});