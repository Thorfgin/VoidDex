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
    const apiMock = api as jest.Mocked<typeof api>;
    const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders basic create form', () => {
        const { getByRole, getByPlaceholderText, getByText } = renderWithRouter(
            <CreatePower />,
            '/create-power'
        );

        // Heading and submit button both use "Create Power" but with different roles
        const heading = getByRole('heading', { name: 'Create Power' });
        expect(heading).toBeTruthy();

        const submitButton = getByRole('button', { name: 'Create Power' });
        expect(submitButton).toBeTruthy();

        // Name input is reliably detectable by placeholder
        expect(getByPlaceholderText('Power Name')).toBeTruthy();

        // Save Draft button
        expect(getByText('Save Draft')).toBeTruthy();
    });

    test('validates required fields', async () => {
        const { container, findByText } = renderWithRouter(
            <CreatePower />,
            '/create-power'
        );

        // Submit the form directly instead of clicking the button
        const form = container.querySelector('form');
        expect(form).toBeTruthy();

        fireEvent.submit(form as HTMLFormElement);

        // Use a regex matcher to be a bit more forgiving
        expect(await findByText(/Name is required\./i)).toBeTruthy();

        // And make sure the API was not called
        const apiMock = api as jest.Mocked<typeof api>;
        expect(apiMock.createPower).not.toHaveBeenCalled();
    });


    test('creates power successfully', async () => {
        apiMock.createPower.mockResolvedValue({
            success: true,
            data: { poin: '7000' },
        } as any);

        const { getByPlaceholderText, getByRole, findByText } = renderWithRouter(
            <CreatePower />,
            '/create-power'
        );

        fireEvent.change(getByPlaceholderText('Power Name'), {
            target: { value: 'Invisibility' },
        });
        fireEvent.change(getByPlaceholderText('Description'), {
            target: { value: 'Vanishes' },
        });

        const submitButton = getByRole('button', { name: 'Create Power' });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(apiMock.createPower).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Invisibility',
                    description: 'Vanishes',
                })
            );
        });

        expect(await findByText('Power Created! POIN: 7000')).toBeTruthy();
    });

    test('saves draft', async () => {
        const { getByPlaceholderText, getByText, findByText } = renderWithRouter(
            <CreatePower />,
            '/create-power'
        );

        fireEvent.change(getByPlaceholderText('Power Name'), {
            target: { value: 'Draft Power' },
        });

        fireEvent.click(getByText('Save Draft'));

        expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'power',
                title: 'Draft Power',
            })
        );

        expect(await findByText('Draft saved successfully.')).toBeTruthy();
    });

    test('creates power with owner + empty expiry as until death', async () => {
        apiMock.createPower.mockResolvedValue({
            success: true,
            data: { poin: '7001' },
        } as any);

        const { getByPlaceholderText, getByRole } = renderWithRouter(
            <CreatePower />,
            '/create-power'
        );

        fireEvent.change(getByPlaceholderText('Power Name'), {
            target: { value: 'Bound Power' },
        });
        fireEvent.change(getByPlaceholderText('Description'), {
            target: { value: 'Bound to life' },
        });
        fireEvent.change(getByPlaceholderText('1234#12'), {
            target: { value: '1234#12' },
        });
        // Clear expiry so it becomes "until death"
        fireEvent.change(
            getByPlaceholderText("dd/mm/yyyy (Empty = 'until death')"),
            {
                target: { value: '' },
            }
        );

        const submitButton = getByRole('button', { name: 'Create Power' });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(apiMock.createPower).toHaveBeenCalled();
        });

        type CreatePowerPayload = {
            name: string;
            description: string;
            owner: string;
            expiryDate: string;
            assignments: { plin: string; expiryDate: string }[];
            remarks?: string;
            csRemarks?: string;
        };

        const call = (apiMock.createPower.mock.calls[0][0] as CreatePowerPayload);
        expect(call.assignments).toEqual([
            { plin: '1234#12', expiryDate: 'until death' },
        ]);
    });

    test('renders view mode correctly, including owner display', () => {
        const viewItem = {
            poin: '5555',
            name: 'View Only Power',
            description: 'Viewing',
            assignments: [{ plin: '1234#12', expiryDate: '01/01/2030' }],
            remarks: '',
            csRemarks: '',
        };

        apiMock.getCharacterName.mockImplementation((plin: string) =>
            plin === '1234#12' ? 'Test User' : ''
        );

        const { getByDisplayValue, queryByText } = renderWithRouter(
            <CreatePower />,
            '/create-power',
            {
                mode: 'view',
                item: viewItem,
            }
        );

        // POIN field
        expect(getByDisplayValue('5555')).toBeTruthy();
        // Name field
        expect(getByDisplayValue('View Only Power')).toBeTruthy();

        // Assigned player search input should contain PLIN + name from mock getCharacterName
        expect(
            getByDisplayValue((value: string) =>
                value.includes('1234#12') && value.includes('Test User')
            )
        ).toBeTruthy();

        // Header should switch to view mode title
        expect(queryByText('Power Properties')).toBeTruthy();
        // No create button in view mode
        expect(queryByText('Create Power')).toBeNull();

        // Toolbar actions in view mode
        expect(
            document.querySelector('button[title="Extend Power"]')
        ).toBeTruthy();
        expect(
            document.querySelector('button[title="Assign Power"]')
        ).toBeTruthy();
    });
});
