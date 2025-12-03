import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import CreateCondition from './CreateCondition';
// @ts-ignore
import * as api from '../services/api';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/api', () => ({
  createCondition: jest.fn(),
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

describe('CreateCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates required fields', async () => {
    const { getByText, findByText } = renderWithRouter(<CreateCondition />, '/create-condition');
    
    fireEvent.click(getByText('Create Condition'));

    expect(await findByText('Name is required.')).toBeTruthy();
    expect(api.createCondition).not.toHaveBeenCalled();
  });

  test('successfully creates a condition', async () => {
    (api.createCondition as any).mockResolvedValue({ 
        success: true, 
        data: { coin: '8888', name: 'New Plague' } 
    });

    const { getByPlaceholderText, getByText, findByText } = renderWithRouter(<CreateCondition />, '/create-condition');

    fireEvent.change(getByPlaceholderText('Condition Name'), { target: { value: 'New Plague' } });
    fireEvent.change(getByPlaceholderText('Description'), { target: { value: 'Coughing' } });

    fireEvent.click(getByText('Create Condition'));

    await waitFor(() => {
        expect(api.createCondition).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Plague',
            description: 'Coughing'
        }));
    });
    expect(await findByText('Condition Created! COIN: 8888')).toBeTruthy();
  });

  test('saves draft condition', async () => {
    const { getByPlaceholderText, getByText } = renderWithRouter(<CreateCondition />, '/create-condition');

    fireEvent.change(getByPlaceholderText('Condition Name'), { target: { value: 'Draft Cond' } });
    
    const draftBtn = getByText('Save Draft');
    fireEvent.click(draftBtn);

    expect(offlineStorage.saveStoredChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'condition',
      title: 'Draft Cond'
    }));
  });

  test('populates from draft', () => {
    const draftData = {
        name: 'Loaded Condition',
        description: 'Loaded Desc',
        owner: '1111#11',
        expiryDate: '01/01/2026'
    };
    const { getByDisplayValue } = renderWithRouter(<CreateCondition />, '/create-condition', { initialData: draftData });

    expect(getByDisplayValue('Loaded Condition')).toBeTruthy();
    expect(getByDisplayValue('1111#11')).toBeTruthy();
  });
});