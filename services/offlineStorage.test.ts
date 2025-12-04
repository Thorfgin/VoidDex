import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getStoredChanges,
  saveStoredChange,
  deleteStoredChange,
  getNotes,
  saveNote,
  deleteNote,
  StoredChange
} from './offlineStorage';

const MOCK_CHANGE: StoredChange = {
  id: 'test-1',
  type: 'item',
  action: 'create',
  data: { name: 'Test' },
  timestamp: 12345,
  title: 'Test Title',
  subtitle: 'Test Sub',
  isPinned: true,
};

describe('Offline Storage Service', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    localStorage.clear();
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
    console.error = originalConsoleError;
  });

  describe('Drafts (StoredChanges)', () => {
    test('seeds mock data if storage is empty', () => {
      const changes = getStoredChanges();
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].title).toBeDefined();

      // Also ensure it actually wrote to localStorage
      const raw = localStorage.getItem('voiddex_stored_changes');
      expect(raw).toBeTruthy();
    });

    test('does not reseed when storage already populated', () => {
      const first = getStoredChanges();
      const len1 = first.length;

      // Second call should just read existing; length should not shrink to 0 or explode
      const second = getStoredChanges();
      expect(second.length).toBe(len1);
    });

    test('saves a new draft', () => {
      // Initialize mocks first (seeds)
      getStoredChanges();

      saveStoredChange(MOCK_CHANGE);
      const changes = getStoredChanges();
      expect(changes).toContainEqual(MOCK_CHANGE);
    });

    test('updates an existing draft and does not duplicate it', () => {
      getStoredChanges();
      saveStoredChange(MOCK_CHANGE);

      const updatedChange: StoredChange = { ...MOCK_CHANGE, title: 'Updated Title' };
      saveStoredChange(updatedChange);

      const changes = getStoredChanges();
      const found = changes.find(c => c.id === 'test-1');

      expect(found?.title).toBe('Updated Title');
      // Should not duplicate
      expect(changes.filter(c => c.id === 'test-1').length).toBe(1);
    });

    test('preserves isPinned when updating a draft unless explicitly changed', () => {
      getStoredChanges();
      saveStoredChange(MOCK_CHANGE);

      // Update without changing isPinned
      const updated = { ...MOCK_CHANGE, title: 'Pinned, but updated' };
      saveStoredChange(updated);

      const after = getStoredChanges();
      const found = after.find(c => c.id === 'test-1');
      expect(found?.isPinned).toBe(true);
    });

    test('deletes a draft by id', () => {
      getStoredChanges();
      saveStoredChange(MOCK_CHANGE);

      deleteStoredChange('test-1');
      const changes = getStoredChanges();
      expect(changes.find(c => c.id === 'test-1')).toBeUndefined();
    });

    test('deleteStoredChange on unknown id is a no-op', () => {
      getStoredChanges();
      const before = getStoredChanges();
      deleteStoredChange('non-existent-id');
      const after = getStoredChanges();

      expect(after.length).toBe(before.length);
    });

    test('handles malformed stored JSON for drafts gracefully', () => {
      localStorage.setItem('voiddex_stored_changes', 'not-json');
      const changes = getStoredChanges();

      expect(changes).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Notes', () => {
    test('seeds mock notes if empty', () => {
      const notes = getNotes();
      expect(notes.length).toBeGreaterThan(0);

      const raw = localStorage.getItem('voiddex_notes');
      expect(raw).toBeTruthy();
    });

    test('does not reseed notes when already populated', () => {
      const first = getNotes();
      const len1 = first.length;

      const second = getNotes();
      expect(second.length).toBe(len1);
    });

    test('saves and deletes a note', () => {
      getNotes(); // Seed

      const newNote = {
        id: 'note-99',
        title: 'My Note',
        content: 'Content',
        linkedIds: [],
        timestamp: 111,
      };

      saveNote(newNote);
      let notes = getNotes();
      expect(notes).toContainEqual(newNote);

      deleteNote('note-99');
      notes = getNotes();
      expect(notes.find(n => n.id === 'note-99')).toBeUndefined();
    });

    test('saveNote updates existing note instead of duplicating', () => {
      getNotes();

      const note = {
        id: 'note-update',
        title: 'Original',
        content: 'Content',
        linkedIds: [],
        timestamp: 1,
      };

      saveNote(note);
      saveNote({ ...note, title: 'Updated Title' });

      const notes = getNotes();
      const matches = notes.filter(n => n.id === 'note-update');
      expect(matches.length).toBe(1);
      expect(matches[0].title).toBe('Updated Title');
    });

    test('handles malformed stored JSON for notes gracefully', () => {
      localStorage.setItem('voiddex_notes', 'not-json');
      const notes = getNotes();

      expect(notes).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
