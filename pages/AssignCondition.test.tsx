import { fireEvent, waitFor, screen } from '@testing-library/react';
import { describe, test, jest, beforeEach } from '@jest/globals';

import AssignCondition from './AssignCondition';
// @ts-ignore – keep for Jest/TS interop
import * as api from '../services/api';
// @ts-ignore – keep for Jest/TS interop
import * as offlineStorage from '../services/offlineStorage';
import { Condition } from '../types';
import { renderWithRouter } from '../testUtils';

// --- Mocks ---

jest.mock('../services/api', () => ({
    searchConditionByCoin: jest.fn(),
    updateCondition: jest.fn(),
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

const mockCondition: Condition = {
    coin: '9001',
    name: 'Space Plague',
    description: 'Very bad',
    assignments: [
        { plin: '1234#12', expiryDate: '01/01/2030' },
        { plin: '5555#55', expiryDate: '01/01/2030' },
        { plin: '9999#99', expiryDate: '01/01/2030' },
    ],
    remarks: '',
    csRemarks: '',
};

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

describe('AssignCondition Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const setupWithSearchResult = async () => {
        apiMock.searchConditionByCoin.mockResolvedValue({
            success: true,
            data: mockCondition,
        });

        const utils = renderWithRouter(<AssignCondition />, '/assign-condition');
        const coinInput = utils.getByPlaceholderText('4-digit ID');
        const findButton = utils.getByText('Find');

        fireEvent.change(coinInput, { target: { value: '9001' } });
        fireEvent.click(findButton);

        await utils.findByDisplayValue('Space Plague');

        return utils;
    };

    test('searches and finds condition', async () => {
        apiMock.searchConditionByCoin.mockResolvedValue({
            success: true,
            data: mockCondition,
        });

        const { getByPlaceholderText, getByText, findByDisplayValue } =
            renderWithRouter(<AssignCondition />, '/assign-condition');

        fireEvent.change(getByPlaceholderText('4-digit ID'), {
            target: { value: '9001' },
        });
        fireEvent.click(getByText('Find'));

        // Assert API call
        await waitFor(() => {
            expect(apiMock.searchConditionByCoin).toHaveBeenCalledTimes(1);
            expect(apiMock.searchConditionByCoin).toHaveBeenCalledWith('9001');
        });

        // Assert UI updated
        expect(await findByDisplayValue('Space Plague')).toBeTruthy();
    });

    test('shows "Not found" when condition is not found', async () => {
        apiMock.searchConditionByCoin.mockResolvedValue({
            success: false,
            data: null,
        } as any);

        const { getByPlaceholderText, getByText, findByText } = renderWithRouter(
            <AssignCondition />,
            '/assign-condition',
        );

        fireEvent.change(getByPlaceholderText('4-digit ID'), {
            target: { value: '1111' },
        });
        fireEvent.click(getByText('Find'));

        expect(await findByText('Not found')).toBeTruthy();
    });

    test('shows "Error" when search throws', async () => {
        apiMock.searchConditionByCoin.mockRejectedValue(new Error('Network error'));

        const { getByPlaceholderText, getByText, findByText } = renderWithRouter(
            <AssignCondition />,
            '/assign-condition',
        );

        fireEvent.change(getByPlaceholderText('4-digit ID'), {
            target: { value: '9001' },
        });
        fireEvent.click(getByText('Find'));

        expect(await findByText('Error')).toBeTruthy();
    });

    test('validates and assigns new player (empty, duplicate, success)', async () => {
        apiMock.searchConditionByCoin.mockResolvedValue({
            success: true,
            data: mockCondition,
        });
        apiMock.updateCondition.mockResolvedValue({
            success: true,
            data: {
                ...mockCondition,
                assignments: [
                    ...mockCondition.assignments,
                    { plin: '8888#88', expiryDate: '01/01/2030' },
                ],
            },
        });

        const {
            getByPlaceholderText,
            getByText,
            findByDisplayValue,
            findByText,
        } = renderWithRouter(<AssignCondition />, '/assign-condition');

        // Search
        fireEvent.change(getByPlaceholderText('4-digit ID'), {
            target: { value: '9001' },
        });
        fireEvent.click(getByText('Find'));
        await findByDisplayValue('Space Plague');

        const assignBtn = getByText('Assign');
        const plinInput = getByPlaceholderText('1234#12');

        // Empty check
        fireEvent.click(assignBtn);
        expect(
            await findByText('Please enter a Player PLIN.'),
        ).toBeTruthy();

        // Duplicate check
        fireEvent.change(plinInput, { target: { value: '1234#12' } });
        fireEvent.click(assignBtn);
        expect(
            await findByText('Player is already assigned.'),
        ).toBeTruthy();

        // Success flow
        fireEvent.change(plinInput, { target: { value: '8888#88' } });
        fireEvent.click(assignBtn);

        await waitFor(() => {
            expect(apiMock.updateCondition).toHaveBeenCalledWith(
                '9001',
                expect.objectContaining({
                    assignments: expect.arrayContaining([
                        expect.objectContaining({ plin: '8888#88' }),
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

        // Invalid PLIN format (missing second part)
        fireEvent.change(plinInput, { target: { value: '123#' } });
        fireEvent.click(assignBtn);
        expect(
            await screen.findByText('PLIN format: 1234#12'),
        ).toBeTruthy();

        // Fix PLIN, but set invalid expiry date (yy instead of yyyy)
        fireEvent.change(plinInput, { target: { value: '7777#77' } });
        fireEvent.change(expiryInput, { target: { value: '01/01/20' } });
        fireEvent.click(assignBtn);

        expect(
            await screen.findByText('Invalid Expiry Date format.'),
        ).toBeTruthy();
    });

    test('removes selected players', async () => {
        apiMock.searchConditionByCoin.mockResolvedValue({
            success: true,
            data: mockCondition,
        });
        apiMock.updateCondition.mockResolvedValue({
            success: true,
            data: { ...mockCondition, assignments: [] },
        });

        const { getByPlaceholderText, getByText, findByDisplayValue } =
            renderWithRouter(<AssignCondition />, '/assign-condition');

        // Search
        fireEvent.change(getByPlaceholderText('4-digit ID'), {
            target: { value: '9001' },
        });
        fireEvent.click(getByText('Find'));
        await findByDisplayValue('Space Plague');

        // Select Player(s) to remove via dropdown
        const filterInput = getByPlaceholderText('Filter players to remove...');
        fireEvent.focus(filterInput);
        fireEvent.click(getByText('Select All')); // Selects currently filtered (all)

        const removeBtn = getByText(/Remove Selected/);
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(apiMock.updateCondition).toHaveBeenCalledWith('9001', {
                assignments: [],
            });
        });
    });

    test('remove button is disabled when no players are selected', async () => {
        await setupWithSearchResult();
        const removeBtn = screen.getByText(/Remove Selected/) as HTMLButtonElement;
        expect(removeBtn).toBeDisabled(); // ✅ should now be recognized
    });


    test('loads draft state from location.state.initialData', () => {
        const draftData = {
            condition: mockCondition,
            newOwner: '5555#55',
            newExpiry: '31/12/2099',
            selectedRemovePlins: [] as string[],
        };

        const { getByDisplayValue } = renderWithRouter(
            <AssignCondition />,
            '/assign-condition',
            { initialData: draftData },
        );

        expect(getByDisplayValue('Space Plague')).toBeTruthy();
        expect(getByDisplayValue('5555#55')).toBeTruthy();
        expect(getByDisplayValue('31/12/2099')).toBeTruthy();
    });

    test('saving draft saves state to offlineStorage', () => {
        const draftData = {
            condition: mockCondition,
            newOwner: '',
            newExpiry: '',
            selectedRemovePlins: [] as string[],
        };

        const { getAllByPlaceholderText, getByText } = renderWithRouter(
            <AssignCondition />,
            '/assign-condition',
            { initialData: draftData },
        );

        const inputs = getAllByPlaceholderText('1234#12');
        fireEvent.change(inputs[0], { target: { value: '9999#99' } });

        fireEvent.click(getByText('Save Draft'));

        expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
        expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'condition',
                action: 'assign',
                data: expect.objectContaining({
                    condition: mockCondition,
                    newOwner: '9999#99',
                }),
                title: mockCondition.name,
                subtitle: `Assign COIN: ${mockCondition.coin}`,
            }),
        );
    });
});
