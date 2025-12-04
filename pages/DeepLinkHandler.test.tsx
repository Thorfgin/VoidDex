
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import DeepLinkHandler from './DeepLinkHandler';
// @ts-ignore
import * as api from '../services/api';

// ---- Typed API mock ----
jest.mock('../services/api', () => ({
    searchItemByItin: jest.fn(),
    searchConditionByCoin: jest.fn(),
    searchPowerByPoin: jest.fn(),
}));

const apiMock = api as jest.Mocked<typeof api>;

// ---- React Router mocks with mutable params ----
const mockNavigate = jest.fn();

// mutable params object we can tweak per test
let mockParams: { id?: string } = { id: '1234' };

jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom') as any;
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => mockParams,
    };
});

describe('DeepLinkHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockParams = { id: '1234' }; // default for tests that don't override
    });

    test('redirects to dashboard if id is missing', async () => {
        mockParams = {}; // simulate no :id param

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    test('navigates to item page if item is found', async () => {
        mockParams = { id: '9999' };
        const mockItem = { itin: '9999', name: 'Deep Item' };

        apiMock.searchItemByItin.mockResolvedValue({
            success: true,
            data: mockItem,
        } as any);

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiMock.searchItemByItin).toHaveBeenCalledWith('9999');
            expect(mockNavigate).toHaveBeenCalledWith(
                '/create-item',
                expect.objectContaining({
                    replace: true,
                    state: expect.objectContaining({
                        item: mockItem,
                        mode: 'view',
                        returnQuery: '',
                    }),
                })
            );
        });
    });

    test('navigates to condition page if condition is found', async () => {
        mockParams = { id: '8000' };
        const mockCondition = { coin: '8000', name: 'Deep Cond' };

        apiMock.searchConditionByCoin.mockResolvedValue({
            success: true,
            data: mockCondition,
        } as any);

        render(
            <MemoryRouter>
                <DeepLinkHandler type="condition" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiMock.searchConditionByCoin).toHaveBeenCalledWith('8000');
            expect(mockNavigate).toHaveBeenCalledWith(
                '/create-condition',
                expect.objectContaining({
                    replace: true,
                    state: expect.objectContaining({
                        item: mockCondition,
                        mode: 'view',
                        returnQuery: '',
                    }),
                })
            );
        });
    });

    test('navigates to power page if power is found', async () => {
        mockParams = { id: '6000' };
        const mockPower = { poin: '6000', name: 'Deep Power' };

        apiMock.searchPowerByPoin.mockResolvedValue({
            success: true,
            data: mockPower,
        } as any);

        render(
            <MemoryRouter>
                <DeepLinkHandler type="power" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiMock.searchPowerByPoin).toHaveBeenCalledWith('6000');
            expect(mockNavigate).toHaveBeenCalledWith(
                '/create-power',
                expect.objectContaining({
                    replace: true,
                    state: expect.objectContaining({
                        item: mockPower,
                        mode: 'view',
                        returnQuery: '',
                    }),
                })
            );
        });
    });

    test('navigates to dashboard search if entity not found', async () => {
        mockParams = { id: '0000' };

        apiMock.searchItemByItin.mockResolvedValue({
            success: false,
            data: null,
        } as any);

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiMock.searchItemByItin).toHaveBeenCalledWith('0000');
            expect(mockNavigate).toHaveBeenCalledWith('/?q=0000', { replace: true });
        });
    });

    test('navigates to dashboard on error', async () => {
        mockParams = { id: '1234' };

        apiMock.searchItemByItin.mockRejectedValue(new Error('Boom'));

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
