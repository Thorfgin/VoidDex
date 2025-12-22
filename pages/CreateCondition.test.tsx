import { fireEvent, waitFor, screen } from '@testing-library/react';
import { describe, test, jest, beforeEach } from '@jest/globals';
import CreateCondition from './CreateCondition';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../utils/testUtils';

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

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

describe('CreateCondition Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates required fields: name and description', async () => {
    const { getByPlaceholderText, findByText, container } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form element not found');

    // 1) All empty → Name required first
    fireEvent.submit(form);

    expect(await findByText('Name is required.')).toBeTruthy();
    expect(apiMock.createCondition).not.toHaveBeenCalled();

    // 2) Fill name only → Description required
    fireEvent.change(getByPlaceholderText('Condition Name'), {
      target: { value: 'Some Name' },
    });

    fireEvent.submit(form);

    expect(await findByText('Description is required.')).toBeTruthy();
    expect(apiMock.createCondition).not.toHaveBeenCalled();
  });

  test('validates owner PLIN format and expiry date format', async () => {
    const { getByPlaceholderText, findByText, container } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form element not found');

    // Fill minimal valid name & description
    const nameInput = getByPlaceholderText('Condition Name');
    const descInput = getByPlaceholderText('Description');
    fireEvent.change(nameInput, { target: { value: 'Invalid Test' } });
    fireEvent.change(descInput, { target: { value: 'Check validation' } });

    // Invalid PLIN: numeric but missing # / second part
    const ownerInput = screen.getByPlaceholderText('1234#12');
    fireEvent.change(ownerInput, { target: { value: '1234' } });

    fireEvent.submit(form);

    expect(
        await findByText('Player must be format 1234#12'),
    ).toBeTruthy();
    expect(apiMock.createCondition).not.toHaveBeenCalled();

    // Fix PLIN, break expiry format
    fireEvent.change(ownerInput, { target: { value: '1234#1' } });

    const expiryInput = screen.getByPlaceholderText(
        "dd/mm/yyyy (Empty = 'until death')",
    );
    fireEvent.change(expiryInput, { target: { value: '01012025' } });
    fireEvent.submit(form);

    expect(
      await findByText(/Expiry Date must be DD\/MM\/YYYY/),
    ).toBeTruthy();
    expect(apiMock.createCondition).not.toHaveBeenCalled();
  });

  test('successfully creates a condition without owner (no assignments)', async () => {
    apiMock.createCondition.mockResolvedValue({
      success: true,
      data: {
        coin: '8888',
        name: 'New Plague',
        description: 'Coughing',
        assignments: [],
      },
    });

    const { getByPlaceholderText, findByText, container } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form element not found');

    fireEvent.change(getByPlaceholderText('Condition Name'), {
      target: { value: 'New Plague' },
    });
    fireEvent.change(getByPlaceholderText('Description'), {
      target: { value: 'Coughing' },
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiMock.createCondition).toHaveBeenCalledTimes(1);
      expect(apiMock.createCondition).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Plague',
            description: 'Coughing',
            assignments: [],
            remarks: '',
            csRemarks: '',
          }),
      );
    });

    expect(
        await findByText('Condition Created! COIN: 8888'),
    ).toBeTruthy();

    // After success, form goes into view mode (read-only) and buttons disappear
    expect(screen.queryByText('Save Draft')).toBeNull();
    expect(
        screen.queryByText((content, element) =>
            element?.tagName.toLowerCase() === 'button' &&
            content === 'Create Condition',
        ),
    ).toBeNull();
  });

  test('creates condition with owner and empty expiry using "until death"', async () => {
    apiMock.createCondition.mockResolvedValue({
      success: true,
      data: {
        coin: '7777',
        name: 'Forever Plague',
        description: 'Eternal',
        assignments: [],
      },
    });

    const { getByPlaceholderText, container } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form element not found');

    fireEvent.change(getByPlaceholderText('Condition Name'), {
      target: { value: 'Forever Plague' },
    });
    fireEvent.change(getByPlaceholderText('Description'), {
      target: { value: 'Eternal' },
    });

    const ownerInput = screen.getByPlaceholderText('1234#12');
    fireEvent.change(ownerInput, { target: { value: '1111#11' } });

    const expiryInput = screen.getByPlaceholderText(
        "dd/mm/yyyy (Empty = 'until death')",
    );
    fireEvent.change(expiryInput, { target: { value: '' } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiMock.createCondition).toHaveBeenCalledTimes(1);
      expect(apiMock.createCondition).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Forever Plague',
            description: 'Eternal',
            assignments: [
              {
                plin: '1111#11',
                expiryDate: 'until death',
              },
            ],
          }),
      );
    });

    expect(
        screen.getByText('Condition Created! COIN: 7777'),
    ).toBeTruthy();
  });

  test('handles API failure and shows error message', async () => {
    apiMock.createCondition.mockResolvedValue({
      success: false,
      error: 'Bad things',
    } as any);

    const { getByPlaceholderText, findByText, container } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form element not found');

    fireEvent.change(getByPlaceholderText('Condition Name'), {
      target: { value: 'Failing Cond' },
    });
    fireEvent.change(getByPlaceholderText('Description'), {
      target: { value: 'Should fail' },
    });

    fireEvent.submit(form);

    expect(
        await findByText('Failed: Bad things'),
    ).toBeTruthy();
  });

  test('saves draft condition', async () => {
    const { getByPlaceholderText, getByText, findByText } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
    );

    fireEvent.change(getByPlaceholderText('Condition Name'), {
      target: { value: 'Draft Cond' },
    });

    const draftBtn = getByText('Save Draft');
    fireEvent.click(draftBtn);

    expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'condition',
          action: 'create',
          title: 'Draft Cond',
          data: expect.objectContaining({
            name: 'Draft Cond',
          }),
        }),
    );

    expect(
        await findByText('Draft saved successfully.'),
    ).toBeTruthy();
  });

  test('populates form from draft data on load', () => {
    const draftData = {
      name: 'Loaded Condition',
      description: 'Loaded Desc',
      owner: '1111#11',
      expiryDate: '01/01/2026',
      remarks: 'Some remarks',
      csRemarks: 'CS remarks',
    };

    const { getByDisplayValue } = renderWithRouter(
        <CreateCondition />,
        '/create-condition',
        { initialData: draftData },
    );

    expect(getByDisplayValue('Loaded Condition')).toBeTruthy();
    expect(getByDisplayValue('Loaded Desc')).toBeTruthy();
    expect(getByDisplayValue('1111#11')).toBeTruthy();
    expect(getByDisplayValue('01/01/2026')).toBeTruthy();
  });
});
