import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import CreateItem from './CreateItem';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
  createItem: jest.fn(),
  getCharacterName: jest.fn((plin) => {
    if (plin === '1234#12') return 'Test User';
    return '';
  }),
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

describe('CreateItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Create Item form correctly', () => {
    const { getByText, getByLabelText } = renderWithRouter(<CreateItem />, '/create-item');
    expect(getByText('Create Item')).toBeTruthy();
    expect(getByLabelText(/Name/i)).toBeTruthy();
    expect(getByText('Save Draft')).toBeTruthy();
  });

  test('formats PLIN input automatically', () => {
    const { getByLabelText } = renderWithRouter(<CreateItem />, '/create-item');
    const ownerInput = getByLabelText(/Player/i) as HTMLInputElement;

    fireEvent.change(ownerInput, { target: { value: '12345' } });
    expect(ownerInput.value).toBe('1234#5');

    fireEvent.change(ownerInput, { target: { value: '999912' } });
    expect(ownerInput.value).toBe('9999#12');
  });

  test('formats Date input automatically', () => {
    const { getByLabelText } = renderWithRouter(<CreateItem />, '/create-item');
    const dateInput = getByLabelText(/Expiry Date/i) as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '01012025' } });
    expect(dateInput.value).toBe('01/01/2025');
  });

  test('renders View Mode with action buttons and navigates', () => {
    const itemData = { itin: '9999', name: 'View Item', owner: '1111#11', expiryDate: '01/01/2030' };
    const { getByText, getByTitle, getByLabelText } = renderWithRouter(<CreateItem />, '/create-item', {
      mode: 'view',
      item: itemData
    });

    expect(getByText('Item Properties')).toBeTruthy();
    expect((getByLabelText('ITIN') as HTMLInputElement).value).toBe('9999');

    const rechargeBtn = getByTitle('Recharge');
    const assignBtn = getByTitle('Assign');
    expect(rechargeBtn).toBeTruthy();
    expect(assignBtn).toBeTruthy();

    fireEvent.click(rechargeBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/recharge-item', expect.objectContaining({
      state: expect.objectContaining({ item: expect.objectContaining({ itin: '9999' }) })
    }));
  });

  test('handles Back button logic with returnTo state', () => {
    const { getByTitle } = renderWithRouter(<CreateItem />, '/create-item', {
      returnTo: '/some-page',
      returnState: { someData: true }
    });

    const backBtn = getByTitle('Back');
    expect(backBtn).toBeTruthy();

    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/some-page', { state: { someData: true } });
  });

  test('validates required fields on submit', async () => {
    const { getByText, findByText } = renderWithRouter(<CreateItem />, '/create-item');

    const submitBtn = getByText('Create Item');
    fireEvent.click(submitBtn);

    expect(await findByText('Name is required.')).toBeTruthy();
    expect(api.createItem).not.toHaveBeenCalled();
  });

  test('handles successful item creation and clears draft', async () => {
    (api.createItem as any).mockResolvedValue({
      success: true,
      data: { itin: '9999' }
    });

    const { getByText, getByLabelText, findByText } = renderWithRouter(<CreateItem />, '/create-item', { draftId: 'draft-123' });

    fireEvent.change(getByLabelText(/Name/i), { target: { value: 'Laser Rifle' } });
    fireEvent.change(getByLabelText(/Description/i), { target: { value: 'High power' } });
    fireEvent.change(getByLabelText(/Player/i), { target: { value: '1234#12' } });
    fireEvent.change(getByLabelText(/Expiry Date/i), { target: { value: '31/12/2025' } });

    const submitBtn = getByText('Create Item');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createItem).toHaveBeenCalled();
    });
    expect(await findByText(/Item Created! ITIN: 9999/i)).toBeTruthy();
    expect(offlineStorage.deleteStoredChange).toHaveBeenCalledWith('draft-123');
  });

  test('saves draft successfully', async () => {
    const { getByText, getByLabelText, findByText } = renderWithRouter(<CreateItem />, '/create-item');

    fireEvent.change(getByLabelText(/Name/i), { target: { value: 'Draft Item' } });

    const draftBtn = getByText('Save Draft');
    fireEvent.click(draftBtn);

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'item',
      action: 'create',
      title: 'Draft Item'
    }));

    expect(await findByText('Draft saved successfully.')).toBeTruthy();
  });

  test('resets form when New Item is clicked', () => {
    const { getByTitle, getByLabelText } = renderWithRouter(<CreateItem />, '/create-item');

    fireEvent.change(getByLabelText(/Name/i), { target: { value: 'Dirty Input' } });
    fireEvent.click(getByTitle('New Item'));

    expect(getByTitle('New Item')).toBeTruthy();
  });
});