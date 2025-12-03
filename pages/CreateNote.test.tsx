import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import CreateNote from './CreateNote';
// @ts-ignore
import * as offlineStorage from '../services/offlineStorage';
// @ts-ignore
import * as api from '../services/api';
import { renderWithRouter } from '../testUtils';

jest.mock('../services/offlineStorage', () => ({
  saveNote: jest.fn(),
  deleteNote: jest.fn(),
}));

jest.mock('../services/api', () => ({
  searchItemByItin: jest.fn(),
  searchConditionByCoin: jest.fn(),
  searchPowerByPoin: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockNavigate,
}));

describe('CreateNote Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders create form', () => {
    const { getByPlaceholderText, getByText } = renderWithRouter(<CreateNote />, '/create-note');
    expect(getByPlaceholderText('Note Title')).toBeTruthy();
    expect(getByText('Save Note')).toBeTruthy();
  });

  test('validates title requirement', () => {
    const { getByText } = renderWithRouter(<CreateNote />, '/create-note');
    fireEvent.click(getByText('Save Note'));
    expect(getByText('Title is required.')).toBeTruthy();
  });

  test('saves new note with pinned status', async () => {
    const { getByPlaceholderText, getByText, getByTitle } = renderWithRouter(<CreateNote />, '/create-note');

    fireEvent.change(getByPlaceholderText('Note Title'), { target: { value: 'Test Note' } });
    fireEvent.change(getByPlaceholderText('Write your note here...'), { target: { value: 'Some content' } });

    fireEvent.click(getByTitle('Pin Note'));

    fireEvent.click(getByText('Save Note'));

    expect(offlineStorage.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Note',
      content: 'Some content',
      isPinned: true
    }));

    await waitFor(() => expect(getByText('Note Saved!')).toBeTruthy());
  });

  test('deletes existing note', async () => {
    const existingNote = { id: 'note-1', title: 'To Delete', content: '', linkedIds: [], timestamp: 123 };
    const { getByTitle, getByText } = renderWithRouter(<CreateNote />, '/create-note', { note: existingNote });

    const deleteBtn = getByTitle('Delete Note');
    fireEvent.click(deleteBtn);

    expect(getByText('Delete Note?')).toBeTruthy();

    fireEvent.click(getByText('Delete'));

    expect(offlineStorage.deleteNote).toHaveBeenCalledWith('note-1');
    expect(mockNavigate).toHaveBeenCalledWith('/my-notes');
  });

  test('detects link type and formats input', () => {
    const { getByPlaceholderText } = renderWithRouter(<CreateNote />, '/create-note');
    const linkInput = getByPlaceholderText(/ID, PLIN, or Text/i);

    // Test PLIN auto-formatting (12345 -> 1234#5)
    fireEvent.change(linkInput, { target: { value: '12345' } });
    expect((linkInput as HTMLInputElement).value).toBe('1234#5');

    // Check if type button changed to PLIN
    expect(document.querySelector('.bg-brand-primary')?.textContent).toBe('PLIN');

    // Test ITIN detection
    fireEvent.change(linkInput, { target: { value: 'ITIN1234' } });
    expect(document.querySelector('.bg-brand-primary')?.textContent).toBe('ITIN');

    // Test OTHER fallback
    fireEvent.change(linkInput, { target: { value: 'Hello World' } });
    expect(document.querySelector('.bg-brand-primary')?.textContent).toBe('OTHER');
  });

  test('verifies and adds ITIN link', async () => {
    (api.searchItemByItin as any).mockResolvedValue({ success: true, data: { name: 'Item X' } });

    const { getByPlaceholderText, findByText } = renderWithRouter(<CreateNote />, '/create-note');

    const linkInput = getByPlaceholderText(/ID, PLIN, or Text/i);
    fireEvent.change(linkInput, { target: { value: '1234' } });

    const addBtn = document.querySelector('button[title="Add Link"]');
    if (addBtn) fireEvent.click(addBtn);

    await waitFor(() => {
      expect(api.searchItemByItin).toHaveBeenCalledWith('1234');
    });
    expect(await findByText('ITIN 1234')).toBeTruthy();
  });

  test('dirty check logic prevents navigation', () => {
    const addEventSpy = jest.spyOn(window, 'addEventListener');
    renderWithRouter(<CreateNote />, '/create-note');
    expect(addEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});