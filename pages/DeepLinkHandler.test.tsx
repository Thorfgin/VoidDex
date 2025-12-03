import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { describe, expect, test, jest } from '@jest/globals';
import DeepLinkHandler from './DeepLinkHandler';
// @ts-ignore
import * as api from '../services/api';

jest.mock('../services/api', () => ({
    searchItemByItin: jest.fn(),
    searchConditionByCoin: jest.fn(),
    searchPowerByPoin: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom') as any,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1234' }),
}));

describe('DeepLinkHandler', () => {
    test('redirects to dashboard if id is missing', async () => {
        jest.spyOn(ReactRouterDom, 'useParams').mockReturnValue({});

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    });

    test('navigates to item page if found', async () => {
        jest.spyOn(ReactRouterDom, 'useParams').mockReturnValue({ id: '9999' });
        const mockItem = { itin: '9999', name: 'Deep Item' };
        (api.searchItemByItin as any).mockResolvedValue({ success: true, data: mockItem });

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/create-item', expect.objectContaining({
                state: expect.objectContaining({ item: mockItem, mode: 'view' })
            }));
        });
    });

    test('navigates to condition page if found', async () => {
        jest.spyOn(ReactRouterDom, 'useParams').mockReturnValue({ id: '8000' });
        const mockCond = { coin: '8000', name: 'Deep Cond' };
        (api.searchConditionByCoin as any).mockResolvedValue({ success: true, data: mockCond });

        render(
            <MemoryRouter>
                <DeepLinkHandler type="condition" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/create-condition', expect.objectContaining({
                state: expect.objectContaining({ item: mockCond, mode: 'view' })
            }));
        });
    });

    test('navigates to dashboard search if not found', async () => {
        jest.spyOn(ReactRouterDom, 'useParams').mockReturnValue({ id: '0000' });
        (api.searchItemByItin as any).mockResolvedValue({ success: false });

        render(
            <MemoryRouter>
                <DeepLinkHandler type="item" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/?q=0000', { replace: true });
        });
    });
});