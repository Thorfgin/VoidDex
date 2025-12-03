import { Note } from '../types';

export interface StoredChange {
  id: string;
  type: 'item' | 'condition' | 'power';
  action: 'create' | 'recharge' | 'assign' | 'extend';
  data: any; // Flexible payload depending on the action type
  timestamp: number;
  title: string;
  subtitle: string;
  isPinned?: boolean;
}

const STORAGE_KEY = 'voiddex_stored_changes';
const NOTES_STORAGE_KEY = 'voiddex_notes';

/**
 * Retrieves the list of saved drafts from LocalStorage.
 * Initializes with mock data if storage is empty for demonstration purposes.
 */
export const getStoredChanges = (): StoredChange[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Seed with mock data for demonstration if empty
      const mocks: StoredChange[] = [
        // --- ITEMS ---
        {
          id: 'draft-item-create',
          type: 'item',
          action: 'create',
          data: { 
              name: 'Advanced Medkit', 
              description: 'Heals critical wounds instantly. Restricted access.', 
              owner: '1005#22', 
              expiryDate: '31/12/2026', 
              remarks: 'Prototype unit.',
              csRemarks: ''
          },
          timestamp: Date.now() - 900000,
          title: 'Advanced Medkit',
          subtitle: 'Create Item',
          isPinned: true
        },
        {
          id: 'draft-item-recharge',
          type: 'item',
          action: 'recharge',
          data: {
              item: {
                  itin: '1001',
                  name: 'Plasma Rifle',
                  description: 'Standard issue Plasma Rifle.',
                  owner: '1001#01',
                  expiryDate: '31/12/2025'
              },
              expiryDate: '31/12/2030'
          },
          timestamp: Date.now() - 800000,
          title: 'Plasma Rifle',
          subtitle: 'Recharge ITIN: 1001'
        },
        {
          id: 'draft-item-assign',
          type: 'item',
          action: 'assign',
          data: {
              item: {
                  itin: '1002',
                  name: 'Medigel Pack',
                  description: 'Standard issue Medigel.',
                  owner: '1002#01'
              },
              owner: '5555#55'
          },
          timestamp: Date.now() - 700000,
          title: 'Medigel Pack',
          subtitle: 'Assign ITIN: 1002'
        },

        // --- CONDITIONS ---
        {
            id: 'draft-cond-create',
            type: 'condition',
            action: 'create',
            data: {
                name: 'Nano-Virus',
                description: 'Slowly consumes organic matter.',
                owner: '',
                expiryDate: 'until death',
                remarks: 'Quarantine immediately.',
                csRemarks: ''
            },
            timestamp: Date.now() - 600000,
            title: 'Nano-Virus',
            subtitle: 'Create Condition'
        },
        {
            id: 'draft-cond-extend',
            type: 'condition',
            action: 'extend',
            data: {
                condition: {
                    coin: '8005',
                    name: 'Frozen',
                    description: 'Status effect: Frozen',
                    assignments: [
                        { plin: '1005#01', expiryDate: '31/12/2025' },
                        { plin: '1006#01', expiryDate: '31/12/2025' }
                    ]
                },
                expiryDate: '01/01/2028',
                selectedPlins: ['1005#01', '1006#01']
            },
            timestamp: Date.now() - 500000,
            title: 'Frozen',
            subtitle: 'Extend COIN: 8005'
        },
        {
            id: 'draft-cond-assign',
            type: 'condition',
            action: 'assign',
            data: { 
                condition: { 
                    coin: '8006', 
                    name: 'Burning', 
                    description: 'Status effect: Burning', 
                    assignments: [
                        { plin: '2001#01', expiryDate: '01/01/2025' }
                    ]
                },
                newOwner: '5555#55',
                newExpiry: '01/01/2026',
                selectedRemovePlins: []
            },
            timestamp: Date.now() - 400000,
            title: 'Burning',
            subtitle: 'Assign COIN: 8006'
        },

        // --- POWERS ---
        {
            id: 'draft-power-create',
            type: 'power',
            action: 'create',
            data: { 
                name: 'Solar Flare', 
                description: 'Emits a blinding burst of light affecting all targets in line of sight.', 
                owner: 'SYSTEM', 
                expiryDate: 'until death',
                remarks: '',
                csRemarks: ''
            },
            timestamp: Date.now() - 300000,
            title: 'Solar Flare',
            subtitle: 'Create Power'
        },
        {
            id: 'draft-power-extend',
            type: 'power',
            action: 'extend',
            data: {
                power: {
                    poin: '5002',
                    name: 'Warp',
                    description: 'Biotic Warp ability.',
                    assignments: [{ plin: '1002#01', expiryDate: '31/12/2025' }]
                },
                expiryDate: '31/12/2029',
                selectedPlins: ['1002#01']
            },
            timestamp: Date.now() - 200000,
            title: 'Warp',
            subtitle: 'Extend POIN: 5002'
        },
        {
            id: 'draft-power-assign',
            type: 'power',
            action: 'assign',
            data: {
                power: {
                    poin: '5005',
                    name: 'Shockwave',
                    description: 'Biotic Shockwave.',
                    assignments: []
                },
                newOwner: '9999#99',
                newExpiry: '01/01/2030',
                selectedRemovePlins: []
            },
            timestamp: Date.now() - 100000,
            title: 'Shockwave',
            subtitle: 'Assign POIN: 5005'
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mocks));
      return mocks;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse stored changes", e);
    return [];
  }
};

/**
 * Saves a draft to LocalStorage.
 * If a draft with the same ID exists, it updates it. Otherwise, it appends a new one.
 */
export const saveStoredChange = (change: StoredChange) => {
    let changes = getStoredChanges();
    const index = changes.findIndex(c => c.id === change.id);
    if (index >= 0) {
        changes[index] = change;
    } else {
        changes.push(change);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
};

/**
 * Permanently removes a draft from LocalStorage by ID.
 */
export const deleteStoredChange = (id: string) => {
    let changes = getStoredChanges();
    changes = changes.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
};

// --- NOTES STORAGE ---

export const getNotes = (): Note[] => {
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!stored) {
      // Seed mock notes if empty
      const mockNotes: Note[] = [
        {
            id: 'note-mock-1',
            title: 'Rifle Maintenance',
            content: 'The plasma rifle (ITIN 1001) is jamming when overheated. Needs a new thermal clip connector.',
            linkedIds: ['ITIN:1001'],
            timestamp: Date.now() - 86400000, // 1 day ago
            isPinned: true
        },
        {
            id: 'note-mock-2',
            title: 'Quarantine Protocol',
            content: 'Subject exhibiting signs of Radiation Sickness (COIN 8001). Isolate immediately.',
            linkedIds: ['COIN:8001'],
            timestamp: Date.now() - 172800000 // 2 days ago
        },
        {
            id: 'note-mock-3',
            title: 'Biotic Training',
            content: 'Reviewing Biotic Throw (POIN 5001) technique. Assignments pending for new recruits.',
            linkedIds: ['POIN:5001'],
            timestamp: Date.now() - 259200000 // 3 days ago
        }
      ];
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(mockNotes));
      return mockNotes;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse notes", e);
    return [];
  }
};

export const saveNote = (note: Note) => {
  let notes = getNotes();
  const index = notes.findIndex(n => n.id === note.id);
  if (index >= 0) {
    notes[index] = note;
  } else {
    notes.push(note);
  }
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
};

export const deleteNote = (id: string) => {
  let notes = getNotes();
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
};