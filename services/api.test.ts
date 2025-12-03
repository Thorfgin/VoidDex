import { describe, expect, test, beforeEach } from '@jest/globals';
import { 
  getCharacterName, 
  searchGlobal, 
  createItem, 
  searchItemByItin, 
  resetData,
  createCondition,
  searchConditionByCoin,
  updateItem
} from './api';

describe('API Service', () => {
  beforeEach(() => {
    resetData();
  });

  describe('getCharacterName', () => {
    test('returns correct name for known PLIN', () => {
      expect(getCharacterName('1001#01')).toBe('Commander Shepherd');
    });

    test('parses unknown PLIN formats correctly', () => {
      // 1002 is even -> Jane Doe logic
      expect(getCharacterName('1002#99')).toBe('Jane Doe');
      // 1003 is odd -> John Doe logic
      expect(getCharacterName('1003#99')).toBe('John Doe');
    });

    test('returns empty for invalid formats', () => {
      expect(getCharacterName('')).toBe('');
      expect(getCharacterName('SYSTEM')).toBe('');
      expect(getCharacterName('InvalidString')).toBe('');
    });
  });

  describe('searchGlobal', () => {
    test('finds items by name', async () => {
      const result = await searchGlobal('Plasma');
      expect(result.success).toBe(true);
      expect(result.data?.some(i => i.name.includes('Plasma'))).toBe(true);
    });

    test('finds items by ID', async () => {
      const result = await searchGlobal('1001');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    test('finds owners via PLIN', async () => {
      // 1001#01 is a known owner in mock data
      const result = await searchGlobal('1001#01');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    test('returns empty array for no matches', async () => {
      const result = await searchGlobal('XYZ_NON_EXISTENT');
      expect(result.data).toEqual([]);
    });
  });

  describe('CRUD Operations', () => {
    test('creates and retrieves an item', async () => {
      const newItem = {
        name: 'New Test Item',
        description: 'Test Desc',
        owner: '1234#12',
        expiryDate: '01/01/2030',
        remarks: '',
        csRemarks: ''
      };

      const createRes = await createItem(newItem);
      expect(createRes.success).toBe(true);
      expect(createRes.data?.itin).toBeDefined();

      const searchRes = await searchItemByItin(createRes.data!.itin);
      expect(searchRes.data?.name).toBe('New Test Item');
    });

    test('updates an item', async () => {
      // Find known item
      const item = (await searchGlobal('Plasma')).data![0];
      const itin = (item as any).itin;

      const updateRes = await updateItem(itin, { name: 'Updated Plasma' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('Updated Plasma');
    });

    test('creates and finds condition', async () => {
      const newCond = {
        name: 'Test Flu',
        description: 'Cough',
        assignments: [],
        remarks: '',
        csRemarks: ''
      };
      const res = await createCondition(newCond);
      expect(res.success).toBe(true);
      
      const search = await searchConditionByCoin(res.data!.coin);
      expect(search.data?.name).toBe('Test Flu');
    });
  });
});