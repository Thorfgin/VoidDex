import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import CreatePower from './CreatePower';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
    createPower: jest.fn(),
    getCharacterName: jest.fn(),
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

describe('CreatePower Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('validates required fields', async () => {
        const { getByText, findByText } = renderWithRouter(<CreatePower />, '/create-power');

        fireEvent.click(getByText('Create Power'));

        expect(await findByText('Name is required.')).toBeTruthy();
        expect(api.createPower).not.toHaveBeenCalled();
    });

    test('creates power successfully', async () => {
        (api.createPower as any).mockResolvedValue({ success: true, data: { poin: '7000' } });
        const { getByPlaceholderText, getByText, findByText } = renderWithRouter(<CreatePower />, '/create-power');

        fireEvent.change(getByPlaceholderText('Power Name'), { target: { value: 'Invisibility' } });
        fireEvent.change(getByPlaceholderText('Description'), { target: { value: 'Vanishes' } });

        fireEvent.click(getByText('Create Power'));

        await waitFor(() => {
            expect(api.createPower).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Invisibility',
                description: 'Vanishes'
            }));
        });
        expect(await findByText('Power Created! POIN: 7000')).toBeTruthy();
    });

    test('saves draft', async () => {
        const { getByPlaceholderText, getByText, findByText } = renderWithRouter(<CreatePower />, '/create-power');
        fireEvent.change(getByPlaceholderText('Power Name'), { target: { value: 'Draft Power' } });

        fireEvent.click(getByText('Save Draft'));

        expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
            type: 'power',
            title: 'Draft Power'
        }));
        expect(await findByText('Draft saved successfully.')).toBeTruthy();
    });

    test('renders view mode correctly', () => {
        const viewItem = {
            poin: '5555',
            name: 'View Only Power',
            description: 'Viewing',
            assignments: [{ plin: '1234#12', expiryDate: '01/01/2030' }],
            remarks: '',
            csRemarks: ''
        };

        const { getByDisplayValue, queryByText } = renderWithRouter(<CreatePower />, '/create-power', {
            mode: 'view',
            item: viewItem
        });

        expect(getByDisplayValue('5555')).toBeTruthy();
        expect(getByDisplayValue('View Only Power')).toBeTruthy();

        expect(queryByText('Create Power')).toBeNull();

        // Check if toolbar actions are present
        expect(document.querySelector('button[title="Extend Power"]')).toBeTruthy();
    });
});