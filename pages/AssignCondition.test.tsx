import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import AssignCondition from './AssignCondition';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { Condition } from '../types';
import { renderWithRouter } from '../testUtils';

// Mock API
jest.mock('../services/api', () => ({
    searchConditionByCoin: jest.fn(),
    updateCondition: jest.fn(),
    getCharacterName: jest.fn((plin) => plin === '1234#12' ? 'User A' : ''),
}));

jest.mock('../services/offlineStorage', () => ({
    saveStoredChange: jest.fn(),
    deleteStoredChange: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
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
        { plin: '9999#99', expiryDate: '01/01/2030' }
    ],
    remarks: '',
    csRemarks: ''
};

describe('AssignCondition Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('searches and finds condition', async () => {
        (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCondition });
        const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<AssignCondition />, '/assign-condition');

        fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '9001' } });
        fireEvent.click(getByText('Find'));

        expect(await findByDisplayValue('Space Plague')).toBeTruthy();
    });

    test('validates and assigns new player', async () => {
        (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCondition });
        // Return updated data
        (api.updateCondition as any).mockResolvedValue({
            success: true,
            data: { ...mockCondition, assignments: [...mockCondition.assignments, { plin: '8888#88', expiryDate: '01/01/2030' }] }
        });

        const { getByPlaceholderText, getByText, findByDisplayValue, findByText } = renderWithRouter(<AssignCondition />, '/assign-condition');

        // Search
        fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '9001' } });
        fireEvent.click(getByText('Find'));
        await findByDisplayValue('Space Plague');

        const assignBtn = getByText('Assign');

        // Empty check
        fireEvent.click(assignBtn);
        expect(await findByText('Please enter a Player PLIN.')).toBeTruthy();

        // Duplicate check
        const plinInput = getByPlaceholderText('1234#12');
        fireEvent.change(plinInput, { target: { value: '1234#12' } });
        fireEvent.click(assignBtn);
        expect(await findByText('Player is already assigned.')).toBeTruthy();

        // Success flow
        fireEvent.change(plinInput, { target: { value: '8888#88' } });
        fireEvent.click(assignBtn);

        await waitFor(() => {
            expect(api.updateCondition).toHaveBeenCalledWith('9001', expect.objectContaining({
                assignments: expect.arrayContaining([
                    expect.objectContaining({ plin: '8888#88' })
                ])
            }));
        });

        expect(await findByText('Assigned 8888#88')).toBeTruthy();
    });

    test('removes selected players', async () => {
        (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCondition });
        (api.updateCondition as any).mockResolvedValue({ success: true, data: { ...mockCondition, assignments: [] } });

        const { getByPlaceholderText, getByText, findByDisplayValue } = renderWithRouter(<AssignCondition />, '/assign-condition');

        // Search
        fireEvent.change(getByPlaceholderText('4-digit ID'), { target: { value: '9001' } });
        fireEvent.click(getByText('Find'));
        await findByDisplayValue('Space Plague');

        // Select Player to remove
        const filterInput = getByPlaceholderText('Filter players to remove...');
        fireEvent.focus(filterInput);
        fireEvent.click(getByText('Select All')); // Selects currently filtered (all)

        const removeBtn = getByText(/Remove Selected/);
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(api.updateCondition).toHaveBeenCalledWith('9001', { assignments: [] });
        });
    });

    test('loads draft state', () => {
        const draftData = {
            condition: mockCondition,
            newOwner: '5555#55',
            newExpiry: '31/12/2099',
            selectedRemovePlins: [] as string[]
        };

        const { getByDisplayValue } = renderWithRouter(<AssignCondition />, '/assign-condition', { initialData: draftData });

        expect(getByDisplayValue('Space Plague')).toBeTruthy();
        expect(getByDisplayValue('5555#55')).toBeTruthy();
        expect(getByDisplayValue('31/12/2099')).toBeTruthy();
    });

    test('saving draft saves state', () => {
        const draftData = {
            condition: mockCondition,
            newOwner: '',
            newExpiry: '',
            selectedRemovePlins: [] as string[]
        };
        const { getAllByPlaceholderText, getByText } = renderWithRouter(<AssignCondition />, '/assign-condition', { initialData: draftData });

        const inputs = getAllByPlaceholderText('1234#12');
        fireEvent.change(inputs[0], { target: { value: '9999#99' } });

        fireEvent.click(getByText('Save Draft'));

        expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
            type: 'condition',
            data: expect.objectContaining({ newOwner: '9999#99' })
        }));
    });
});