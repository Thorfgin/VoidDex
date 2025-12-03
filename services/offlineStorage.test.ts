import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
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
  subtitle: 'Test Sub'
};

describe('Offline Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Drafts (StoredChanges)', () => {
    test('seeds mock data if storage is empty', () => {
      const changes = getStoredChanges();
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].title).toBeDefined();
    });

    test('saves a new draft', () => {
      // Initialize mocks first
      getStoredChanges(); 
      
      saveStoredChange(MOCK_CHANGE);
      const changes = getStoredChanges();
      expect(changes).toContainEqual(MOCK_CHANGE);
    });

    test('updates an existing draft', () => {
      getStoredChanges();
      saveStoredChange(MOCK_CHANGE);

      const updatedChange = { ...MOCK_CHANGE, title: 'Updated Title' };
      saveStoredChange(updatedChange);

      const changes = getStoredChanges();
      const found = changes.find(c => c.id === 'test-1');
      expect(found?.title).toBe('Updated Title');
      // Should not duplicate
      expect(changes.filter(c => c.id === 'test-1').length).toBe(1);
    });

    test('deletes a draft', () => {
      getStoredChanges();
      saveStoredChange(MOCK_CHANGE);
      
      deleteStoredChange('test-1');
      const changes = getStoredChanges();
      expect(changes.find(c => c.id === 'test-1')).toBeUndefined();
    });
  });

  describe('Notes', () => {
    test('seeds mock notes if empty', () => {
      const notes = getNotes();
      expect(notes.length).toBeGreaterThan(0);
    });

    test('saves and deletes a note', () => {
      getNotes(); // Seed
      
      const newNote = {
        id: 'note-99',
        title: 'My Note',
        content: 'Content',
        linkedIds: [],
        timestamp: 111
      };

      saveNote(newNote);
      let notes = getNotes();
      expect(notes).toContainEqual(newNote);

      deleteNote('note-99');
      notes = getNotes();
      expect(notes.find(n => n.id === 'note-99')).toBeUndefined();
    });
  });
});