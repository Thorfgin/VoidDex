import { fireEvent, waitFor, screen } from '@testing-library/react';
import CreateItem from './CreateItem';
import * as api from '../services/api';
import * as offlineStorage from '../services/offlineStorage';
import { renderWithRouter } from '../utils/testUtils';

jest.mock('../services/api', () => ({
  createItem: jest.fn(),
  getCharacterName: jest.fn((plin: string) => {
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

const apiMock = api as jest.Mocked<typeof api>;
const offlineMock = offlineStorage as jest.Mocked<typeof offlineStorage>;

describe('CreateItem Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Create Item form correctly', () => {
    renderWithRouter(<CreateItem />, '/create-item');

    // Heading "Create Item"
    const heading = screen.getByRole('heading', { name: /Create Item/i });
    expect(heading).toBeTruthy();

    // Submit button "Create Item"
    const submitButton = screen.getByRole('button', { name: /Create Item/i });
    expect(submitButton).toBeTruthy();

    // Save Draft button
    const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i });
    expect(saveDraftButton).toBeTruthy();

    // Name field via placeholder
    expect(screen.getByPlaceholderText('Item Name')).toBeTruthy();
  });

  test('formats PLIN input automatically', () => {
    const { getByPlaceholderText } = renderWithRouter(
        <CreateItem />,
        '/create-item',
    );
    const ownerInput = getByPlaceholderText('1234#12') as HTMLInputElement;

    fireEvent.change(ownerInput, { target: { value: '12345' } });
    expect(ownerInput.value).toBe('1234#5');

    fireEvent.change(ownerInput, { target: { value: '999912' } });
    expect(ownerInput.value).toBe('9999#12');
  });

  test('formats Date input automatically to dd/mm/yyyy', () => {
    const { getByPlaceholderText } = renderWithRouter(
        <CreateItem />,
        '/create-item',
    );

    const dateInput = getByPlaceholderText('dd/mm/yyyy') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.change(dateInput, { target: { value: '01012025' } });

    expect(dateInput.value).toBe('01/01/2025');
  });

  test('renders View Mode with action buttons and navigates', () => {
    const itemData = {
      itin: '9999',
      name: 'View Item',
      owner: '1234#12',
      expiryDate: '01/01/2030',
      description: 'Desc',
      remarks: '',
      csRemarks: '',
    };

    const { getByText, getByTitle, getByDisplayValue } = renderWithRouter(
        <CreateItem />,
        '/create-item',
        {
          mode: 'view',
          item: itemData,
        },
    );

    // We are in view mode
    expect(getByText('Item Properties')).toBeTruthy();

    // ITIN field shows the correct value
    expect(getByDisplayValue('9999')).toBeTruthy();

    // Action buttons are rendered
    const rechargeBtn = getByTitle('Recharge');
    const assignBtn = getByTitle('Assign');
    expect(rechargeBtn).toBeTruthy();
    expect(assignBtn).toBeTruthy();

    // Recharge navigates with the item in state
    fireEvent.click(rechargeBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
        '/recharge-item',
        expect.objectContaining({
          state: expect.objectContaining({
            item: expect.objectContaining({ itin: '9999' }),
          }),
        }),
    );

    // Assign and navigates to the item in state
    fireEvent.click(assignBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
        '/assign-item',
        expect.objectContaining({
          state: expect.objectContaining({
            item: expect.objectContaining({ itin: '9999' }),
          }),
        }),
    );
  });

  test('handles Back button logic with returnTo + state when not dirty', () => {
    const { getByTitle } = renderWithRouter(
        <CreateItem />,
        '/create-item',
        {
          returnTo: '/some-page',
          returnState: { someData: true },
        },
    );

    const backBtn = getByTitle('Back');
    expect(backBtn).toBeTruthy();

    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/some-page', {
      state: { someData: true },
    });
  });

  test('validates required fields: name and description, then PLIN and expiry', async () => {
    const {
      getByPlaceholderText,
      findByText,
      container,
    } = renderWithRouter(<CreateItem />, '/create-item');

    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');

    // 1) All empty -> "Name is required."
    fireEvent.submit(form);
    expect(await findByText('Name is required.')).toBeTruthy();
    expect(apiMock.createItem).not.toHaveBeenCalled();

    // 2) Name only -> "Description is required."
    fireEvent.change(getByPlaceholderText('Item Name'), {
      target: { value: 'Test Item' },
    });

    fireEvent.submit(form);
    expect(await findByText('Description is required.')).toBeTruthy();
    expect(apiMock.createItem).not.toHaveBeenCalled();

    // 3) Name + description, invalid PLIN -> PLIN error
    fireEvent.change(getByPlaceholderText('Description'), {
      target: { value: 'Some description' },
    });

    const ownerInput = getByPlaceholderText('1234#12') as HTMLInputElement;
    fireEvent.change(ownerInput, { target: { value: '1234' } });

    fireEvent.submit(form);
    expect(
        await findByText('Player must be format 1234#12'),
    ).toBeTruthy();
    expect(apiMock.createItem).not.toHaveBeenCalled();

    // 4) Fix PLIN, break expiry format -> expiry format error
    fireEvent.change(ownerInput, { target: { value: '1234#12' } });

    const expiryInput = getByPlaceholderText('dd/mm/yyyy') as HTMLInputElement;
    fireEvent.change(expiryInput, { target: { value: '010120' } });

    fireEvent.submit(form);
    expect(
      await findByText('Expiry Date must be DD/MM/YYYY.'),
    ).toBeTruthy();
    expect(apiMock.createItem).not.toHaveBeenCalled();

    // 5) Valid-looking but invalid calendar date: 31/04/2025
    fireEvent.change(expiryInput, { target: { value: '31/04/2025' } });

    fireEvent.submit(form);
    expect(await findByText('Invalid calendar date')).toBeTruthy();
    expect(apiMock.createItem).not.toHaveBeenCalled();
  });

  test('handles successful item creation and clears draft', async () => {
    apiMock.createItem.mockResolvedValue({
      success: true,
      data: {
        itin: '9999',
        name: 'Laser Rifle',
        description: 'High power',
        owner: '1234#12',
        expiryDate: '31/12/2025',
        remarks: '',
        csRemarks: '',
      },
    });

    const { getByPlaceholderText, findByText, container } = renderWithRouter(
        <CreateItem />,
        '/create-item',
        { draftId: 'draft-123' },
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');

    fireEvent.change(getByPlaceholderText('Item Name'), {
      target: { value: 'Laser Rifle' },
    });
    fireEvent.change(getByPlaceholderText('Description'), {
      target: { value: 'High power' },
    });
    fireEvent.change(getByPlaceholderText('1234#12'), {
      target: { value: '1234#12' },
    });
    fireEvent.change(getByPlaceholderText('dd/mm/yyyy'), {
      target: { value: '31/12/2025' },
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiMock.createItem).toHaveBeenCalledTimes(1);
      expect(apiMock.createItem).toHaveBeenCalledWith({
        name: 'Laser Rifle',
        description: 'High power',
        owner: '1234#12',
        expiryDate: '31/12/2025',
        remarks: '',
        csRemarks: '',
      });
    });

    expect(
        await findByText(/Item Created! ITIN: 9999/i),
    ).toBeTruthy();

    expect(offlineMock.deleteStoredChange).toHaveBeenCalledWith('draft-123');

    // After success -> read-only mode, no Save Draft or Create Item button
    expect(screen.queryByText('Save Draft')).toBeNull();
    expect(
        screen.queryByText((content, element) =>
            element?.tagName.toLowerCase() === 'button' &&
            content === 'Create Item',
        ),
    ).toBeNull();
  });

  test('handles API failure and shows error message', async () => {
    apiMock.createItem.mockResolvedValue({
      success: false,
      error: 'Bad things',
    } as any);

    const { getByPlaceholderText, findByText, container } = renderWithRouter(
        <CreateItem />,
        '/create-item',
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');

    fireEvent.change(getByPlaceholderText('Item Name'), {
      target: { value: 'Fail Item' },
    });
    fireEvent.change(getByPlaceholderText('Description'), {
      target: { value: 'Should fail' },
    });
    fireEvent.change(getByPlaceholderText('1234#12'), {
      target: { value: '1234#12' },
    });
    fireEvent.change(getByPlaceholderText('dd/mm/yyyy'), {
      target: { value: '31/12/2025' },
    });

    fireEvent.submit(form);

    expect(await findByText('Failed: Bad things')).toBeTruthy();
  });

  test('saves draft successfully', async () => {
    const { getByText, getByPlaceholderText, findByText } = renderWithRouter(
        <CreateItem />,
        '/create-item',
    );

    fireEvent.change(getByPlaceholderText('Item Name'), {
      target: { value: 'Draft Item' },
    });

    const draftBtn = getByText('Save Draft');
    fireEvent.click(draftBtn);

    expect(offlineMock.saveStoredChange).toHaveBeenCalledTimes(1);
    expect(offlineMock.saveStoredChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'item',
          action: 'create',
          title: 'Draft Item',
          data: expect.objectContaining({
            name: 'Draft Item',
          }),
        }),
    );

    expect(
        await findByText('Draft saved successfully.'),
    ).toBeTruthy();
  });

  test('populates form from draft data on load and can reset when not dirty', () => {
    const draftData = {
      name: 'Loaded Item',
      description: 'Loaded Desc',
      owner: '1234#12',
      expiryDate: '01/01/2026',
      remarks: 'Some r',
      csRemarks: 'CS r',
    };

    const { getByDisplayValue, getByTitle, getByPlaceholderText } =
        renderWithRouter(<CreateItem />, '/create-item', { initialData: draftData });

    expect(getByDisplayValue('Loaded Item')).toBeTruthy();
    expect(getByDisplayValue('Loaded Desc')).toBeTruthy();
    expect(getByDisplayValue('1234#12')).toBeTruthy();
    expect(getByDisplayValue('01/01/2026')).toBeTruthy();

    const newItemBtn = getByTitle('New Item');
    fireEvent.click(newItemBtn);

    const nameInput = getByPlaceholderText('Item Name') as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });
});
