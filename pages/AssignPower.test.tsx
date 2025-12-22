import {fireEvent, waitFor, screen} from '@testing-library/react';
import AssignPower from './AssignPower';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import {renderWithRouter} from '../utils/testUtils';

// --- Mocks ---

jest.mock('../services/api', () => ({
  searchPowerByPoin: jest.fn(),
  updatePower: jest.fn(),
  getCharacterName: jest.fn((plin: string) =>
    plin === '1234#12' ? 'User A' : ''
  ),
}));

jest.mock('../services/offlineStorage', () => ({
  saveStoredChange: jest.fn(),
  deleteStoredChange: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  // keep all real exports except we stub useNavigate
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

// Mock date utilities if used in validation/default values
jest.mock('../utils/dateUtils', () => ({
  getDefaultExpiry: jest.fn(() => '01/01/2030'), // Ensure default expiry is consistent
  formatDate: jest.fn(date => date),
}));

const mockPower = {
  poin: '6001',
  name: 'Flight',
  description: 'Fly',
  assignments: [
    {plin: '1234#12', expiryDate: '01/01/2030'},
    {plin: '9999#99', expiryDate: '01/01/2030'},
  ],
  remarks: '',
  csRemarks: '',
};

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

// -----------------------------------------------------------------

describe('AssignPower Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupWithSearchResult = async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    const utils = renderWithRouter(<AssignPower/>, '/assign-power');
    const poinInput = utils.getByPlaceholderText('4-digit ID');
    const findBtn = utils.getByText('Find');

    fireEvent.change(poinInput, {target: {value: '6001'}});
    fireEvent.click(findBtn);

    await utils.findByDisplayValue('Flight');

    return utils;
  };

  // --- Search Tests ---

  test('searches and finds power', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });

    const {getByPlaceholderText, getByText, findByDisplayValue} =
      renderWithRouter(<AssignPower/>, '/assign-power');

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: {value: '6001'},
    });
    fireEvent.click(getByText('Find'));

    await waitFor(() => {
      expect(apiMock.searchPowerByPoin).toHaveBeenCalledTimes(1);
      expect(apiMock.searchPowerByPoin).toHaveBeenCalledWith('6001');
    });

    expect(await findByDisplayValue('Flight')).toBeTruthy();
  });

  test('shows "Not found" when power is not found', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: false,
      data: null,
    } as any);

    const {getByPlaceholderText, getByText, findByText} = renderWithRouter(
      <AssignPower/>,
      '/assign-power',
    );

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: {value: '1111'},
    });
    fireEvent.click(getByText('Find'));

    expect(await findByText('Not found')).toBeTruthy();
  });

  test('shows "Error" when search throws', async () => {
    apiMock.searchPowerByPoin.mockRejectedValue(new Error('Network error'));

    const {getByPlaceholderText, getByText, findByText} = renderWithRouter(
      <AssignPower/>,
      '/assign-power',
    );

    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: {value: '6001'},
    });
    fireEvent.click(getByText('Find'));

    expect(await findByText('Error')).toBeTruthy();
  });

  // --- Assignment Tests ---

  test('validates and adds new player (empty, duplicate, success)', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: {
        ...mockPower,
        assignments: [
          ...mockPower.assignments,
          {plin: '8888#88', expiryDate: '01/01/2030'},
        ],
      },
    });

    const {
      getByPlaceholderText,
      getByText,
      findByDisplayValue,
      findByText,
    } = renderWithRouter(<AssignPower/>, '/assign-power');

    // Search
    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: {value: '6001'},
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    const assignBtn = getByText('Assign');
    const plinInput = getByPlaceholderText('1234#12');

    // Duplicate check
    fireEvent.change(plinInput, {target: {value: '1234#12'}});
    fireEvent.click(assignBtn);
    expect(
      await findByText('Player is already assigned.'),
    ).toBeTruthy();

    // Success flow
    fireEvent.change(plinInput, {target: {value: '8888#88'}});
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledWith(
        '6001',
        expect.objectContaining({
          assignments: expect.arrayContaining([
            expect.objectContaining({plin: '8888#88'}),
          ]),
        }),
      );
    });

    expect(await findByText('Assigned 8888#88')).toBeTruthy();
  });

  test('shows validation errors for invalid PLIN and expiry date', async () => {
    await setupWithSearchResult();

    const plinInput = screen.getByPlaceholderText('1234#12');
    const expiryInput = screen.getByPlaceholderText('dd/mm/yyyy');
    const assignBtn = screen.getByText('Assign');

    // Invalid PLIN
    fireEvent.change(plinInput, {target: {value: '123#'}});
    fireEvent.click(assignBtn);
    expect(
      await screen.findByText('PLIN format: 1234#12'),
    ).toBeTruthy();

    // Valid PLIN, invalid expiry
    fireEvent.change(plinInput, {target: {value: '7777#77'}});
    fireEvent.change(expiryInput, {target: {value: '01/01/20'}});
    fireEvent.click(assignBtn);

    expect(
      await screen.findByText('Invalid Expiry Date format.'),
    ).toBeTruthy();
  });

  // --- Removal Tests ---

  test('removes selected players', async () => {
    apiMock.searchPowerByPoin.mockResolvedValue({
      success: true,
      data: mockPower,
    });
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: {...mockPower, assignments: []},
    });

    const {getByPlaceholderText, getByText, findByDisplayValue} =
      renderWithRouter(<AssignPower/>, '/assign-power');

    // Search
    fireEvent.change(getByPlaceholderText('4-digit ID'), {
      target: {value: '6001'},
    });
    fireEvent.click(getByText('Find'));
    await findByDisplayValue('Flight');

    // Open remove dropdown and select all
    const filterInput = getByPlaceholderText('Filter players to remove...');
    fireEvent.focus(filterInput);
    await waitFor(() => getByText('Select All'));
    fireEvent.click(getByText('Select All'));

    const removeBtn = getByText(/Remove Selected/);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledWith('6001', {
        assignments: [],
      });
    });
  });

  test('remove button is disabled when no players are selected', async () => {
    await setupWithSearchResult();

    const removeBtn = screen.getByText(/Remove Selected/) as HTMLButtonElement;
    expect(removeBtn).toBeDisabled();
  });

  test('restores draft state correctly', () => {
    const DRAFT_ID = 'draft-test';
    const draftData = {
      power: mockPower,
      newOwner: '7777#77',
      newExpiry: '01/01/2099',
      selectedRemovePlins: ['1234#12'],
    };

    const {getByDisplayValue, getByText} = renderWithRouter(
      <AssignPower/>,
      '/assign-power',
      {
        initialData: draftData,
        draftId: DRAFT_ID,
        draftTimestamp: Date.now()
      },
    );

    expect(getByDisplayValue('Flight')).toBeTruthy();
    expect(getByDisplayValue('7777#77')).toBeTruthy();
    expect(getByText('1 Selected')).toBeTruthy();
    expect(screen.getByText('(Draft)')).toBeInTheDocument();
  });

  test('saving draft saves state to offlineStorage', async () => {
    const draftData = {
      power: mockPower,
      newOwner: '',
      newExpiry: '01/01/2030',
      selectedRemovePlins: [] as string[],
    };

    const {getByText} = renderWithRouter(
      <AssignPower/>,
      '/assign-power',
      {initialData: draftData},
    );

    const plinInput = screen.getByPlaceholderText('1234#12');
    fireEvent.change(plinInput, {target: {value: '9999#99'}});
    fireEvent.click(getByText('Save Draft'));

    await waitFor(() => {
      expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
    });

    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'power',
        action: 'assign',
        data: expect.objectContaining({
          power: mockPower,
          newOwner: '9999#99',
        }),
        title: mockPower.name,
        subtitle: `Assign POIN: ${mockPower.poin}`,
      }),
    );
  });

  test('successful assignment of a DRAFT deletes the draft from storage', async () => {
    const DRAFT_ID = 'power-draft-123';
    apiMock.updatePower.mockResolvedValue({
      success: true,
      data: {
        ...mockPower,
        assignments: [...mockPower.assignments, {plin: '7777#77', expiryDate: '01/01/2030'}]
      }
    });

    // Load the component with draft data
    const draftData = {
      power: mockPower,
      newOwner: '7777#77',
      newExpiry: '01/01/2030',
      selectedRemovePlins: [] as string[],
    };

    const {getByText, findByText, queryByText} = renderWithRouter(
      <AssignPower/>,
      '/assign-power',
      {
        initialData: draftData,
        draftId: DRAFT_ID,
        draftTimestamp: Date.now()
      }
    );

    expect(getByText('(Draft)')).toBeInTheDocument();

    fireEvent.click(getByText('Assign'));
    await waitFor(() => getByText('Process Draft?'));

    fireEvent.click(getByText('Process'));
    await waitFor(() => {
      expect(apiMock.updatePower).toHaveBeenCalledTimes(1);
    });
    expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith(DRAFT_ID);
    expect(await findByText('Assigned 7777#77')).toBeInTheDocument();
    expect(queryByText('(Draft)')).toBeNull();
  });
});