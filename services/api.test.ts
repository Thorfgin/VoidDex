import { describe, expect, test, beforeEach } from '@jest/globals';
import {
  getCharacterName,
  searchGlobal,
  createItem,
  searchItemByItin,
  resetData,
  createCondition,
  searchConditionByCoin,
  updateItem,
  createPower,
  searchPowerByPoin,
  updateCondition,
  updatePower
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
      expect(getCharacterName('1234')).toBe(''); // Missing #
    });
  });

  describe('searchGlobal', () => {
    test('finds items by name case-insensitive', async () => {
      const result = await searchGlobal('plasma');
      expect(result.success).toBe(true);
      expect(result.data?.some(i => i.name.includes('Plasma'))).toBe(true);
    });

    test('finds items by ID', async () => {
      const result = await searchGlobal('1001');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    test('finds owners via PLIN in items and assignments', async () => {
      // 1001#01 is a known owner in mock data
      const result = await searchGlobal('1001#01');
      expect(result.success).toBe(true);
      // Should find items owned by them or conditions/powers assigned to them
      expect(result.data?.length).toBeGreaterThan(0);
    });

    test('returns empty array for no matches', async () => {
      const result = await searchGlobal('XYZ_NON_EXISTENT_STRING_123');
      expect(result.data).toEqual([]);
    });
  });

  describe('CRUD Operations - Items', () => {
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

    test('returns error when searching non-existent item', async () => {
      const res = await searchItemByItin('0000');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Not found');
    });

    test('updates an item', async () => {
      // Create first to ensure we have a valid ID
      const createRes = await createItem({
        name: 'Update Me',
        description: 'Desc',
        owner: '11#11',
        expiryDate: ''
      });
      const itin = createRes.data!.itin;

      const updateRes = await updateItem(itin, { name: 'Updated Name', expiryDate: '01/01/2025' });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('Updated Name');
      expect(updateRes.data?.expiryDate).toBe('01/01/2025');
    });

    test('fails update for non-existent item', async () => {
      const res = await updateItem('0000', { name: 'Fail' });
      expect(res.success).toBe(false);
    });
  });

  describe('CRUD Operations - Conditions', () => {
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

    test('updates condition assignments', async () => {
      const res = await createCondition({ name: 'C', description: 'D', assignments: [] });
      const coin = res.data!.coin;

      const updateRes = await updateCondition(coin, {
        assignments: [{ plin: '1234#12', expiryDate: '01/01/2030' }]
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.assignments[0].plin).toBe('1234#12');
    });

    test('fails update for non-existent condition', async () => {
      const res = await updateCondition('0000', { name: 'Fail' });
      expect(res.success).toBe(false);
    });

    test('fails search for non-existent condition', async () => {
      const res = await searchConditionByCoin('0000');
      expect(res.success).toBe(false);
    });
  });

  describe('CRUD Operations - Powers', () => {
    test('creates and finds power', async () => {
      const res = await createPower({ name: 'Super Jump', description: 'Jump high', assignments: [] });
      expect(res.success).toBe(true);
      const search = await searchPowerByPoin(res.data!.poin);
      expect(search.data?.name).toBe('Super Jump');
    });

    test('updates power', async () => {
      const res = await createPower({ name: 'P', description: 'D', assignments: [] });
      const poin = res.data!.poin;
      const update = await updatePower(poin, { name: 'Ultra P' });
      expect(update.success).toBe(true);
      expect(update.data?.name).toBe('Ultra P');
    });

    test('fails update for non-existent power', async () => {
      const res = await updatePower('0000', { name: 'Fail' });
      expect(res.success).toBe(false);
    });

    test('fails search for non-existent power', async () => {
      const res = await searchPowerByPoin('0000');
      expect(res.success).toBe(false);
    });
  });
});