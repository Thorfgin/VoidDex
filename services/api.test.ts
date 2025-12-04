import { describe, expect, test, beforeEach, afterAll, jest } from '@jest/globals';
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
  updatePower,
} from './api';

// Helper: run async API calls while using fake timers for the internal delay
const runWithTimers = <T>(fn: () => Promise<T>): Promise<T> => {
  const promise = fn();
  // Resolve all internal setTimeout from simulateDelay()
  jest.runAllTimers();
  return promise;
};

describe('API Service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetData();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getCharacterName', () => {
    test('returns correct name for known PLIN', () => {
      expect(getCharacterName('1001#01')).toBe('Commander Shepherd');
    });

    test('parses unknown PLIN formats into fallback names', () => {
      // 1002 is even -> Jane Doe logic
      expect(getCharacterName('1002#99')).toBe('Jane Doe');
      // 1003 is odd -> John Doe logic
      expect(getCharacterName('1003#99')).toBe('John Doe');
    });

    test('returns empty string for invalid formats or system PLIN', () => {
      expect(getCharacterName('')).toBe('');
      expect(getCharacterName('SYSTEM')).toBe('');
      expect(getCharacterName('InvalidString')).toBe('');
      expect(getCharacterName('1234')).toBe(''); // Missing '#'
    });
  });

  describe('searchGlobal', () => {
    test('finds items by name case-insensitive', async () => {
      const result = await runWithTimers(() => searchGlobal('plasma'));
      expect(result.success).toBe(true);

      const names = (result.data || []).map(r => r.name.toLowerCase());
      expect(names.some(n => n.includes('plasma'))).toBe(true);
    });

    test('finds items by ID', async () => {
      const result = await runWithTimers(() => searchGlobal('1001'));
      expect(result.success).toBe(true);
      expect((result.data || []).length).toBeGreaterThan(0);
    });

    test('finds owners via PLIN in items and assignments', async () => {
      // 1001#01 is a known owner
      const result = await runWithTimers(() => searchGlobal('1001#01'));
      expect(result.success).toBe(true);
      expect((result.data || []).length).toBeGreaterThan(0);
    });

    test('returns empty array for no matches', async () => {
      const result = await runWithTimers(() =>
          searchGlobal('XYZ_NON_EXISTENT_STRING_123'),
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('finds all three entities sharing duplicate id "9999"', async () => {
      // In the mock data, 9999 is used for item, condition and power
      const result = await runWithTimers(() => searchGlobal('9999'));
      expect(result.success).toBe(true);

      const data = result.data || [];
      const hasItem = data.some(d => 'itin' in d && d.itin === '9999');
      const hasCondition = data.some(d => 'coin' in d && d.coin === '9999');
      const hasPower = data.some(d => 'poin' in d && d.poin === '9999');

      expect(hasItem).toBe(true);
      expect(hasCondition).toBe(true);
      expect(hasPower).toBe(true);
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
        csRemarks: '',
      };

      const createRes = await runWithTimers(() => createItem(newItem));
      expect(createRes.success).toBe(true);
      expect(createRes.data?.itin).toBeDefined();

      const itin = createRes.data!.itin;

      const searchRes = await runWithTimers(() => searchItemByItin(itin));
      expect(searchRes.success).toBe(true);
      expect(searchRes.data?.name).toBe('New Test Item');
    });

    test('generated ITIN is within expected range 1000–9999', async () => {
      const createRes = await runWithTimers(() =>
          createItem({
            name: 'Range Test Item',
            description: 'Desc',
            owner: '1234#12',
            expiryDate: '01/01/2030',
            remarks: '',
            csRemarks: '',
          }),
      );

      const itinNum = parseInt(createRes.data!.itin, 10);
      expect(itinNum).toBeGreaterThanOrEqual(1000);
      expect(itinNum).toBeLessThanOrEqual(9999);
    });

    test('returns error when searching non-existent item', async () => {
      const res = await runWithTimers(() => searchItemByItin('0000'));
      expect(res.success).toBe(false);
      expect(res.error).toBe('Not found');
    });

    test('updates an item', async () => {
      const createRes = await runWithTimers(() =>
          createItem({
            name: 'Update Me',
            description: 'Desc',
            owner: '11#11',
            expiryDate: '',
            remarks: '',
            csRemarks: '',
          }),
      );
      const itin = createRes.data!.itin;

      const updateRes = await runWithTimers(() =>
          updateItem(itin, { name: 'Updated Name', expiryDate: '01/01/2025' }),
      );

      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.name).toBe('Updated Name');
      expect(updateRes.data?.expiryDate).toBe('01/01/2025');
    });

    test('fails update for non-existent item', async () => {
      const res = await runWithTimers(() => updateItem('0000', { name: 'Fail' }));
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    test('resetData clears newly created items', async () => {
      const createRes = await runWithTimers(() =>
          createItem({
            name: 'Temp Item',
            description: 'Desc',
            owner: '1234#12',
            expiryDate: '01/01/2030',
            remarks: '',
            csRemarks: '',
          }),
      );
      const itin = createRes.data!.itin;

      // After reset, that ITIN should no longer exist
      resetData();
      const searchRes = await runWithTimers(() => searchItemByItin(itin));
      expect(searchRes.success).toBe(false);
    });
  });

  describe('CRUD Operations - Conditions', () => {
    test('creates and finds condition', async () => {
      const newCond = {
        name: 'Test Flu',
        description: 'Cough',
        assignments: [],
        remarks: '',
        csRemarks: '',
      };
      const res = await runWithTimers(() => createCondition(newCond));
      expect(res.success).toBe(true);

      const search = await runWithTimers(() =>
          searchConditionByCoin(res.data!.coin),
      );
      expect(search.success).toBe(true);
      expect(search.data?.name).toBe('Test Flu');
    });

    test('generated COIN is within expected range 8000–9999', async () => {
      const res = await runWithTimers(() =>
          createCondition({
            name: 'Range Cond',
            description: 'C',
            assignments: [],
            remarks: '',
            csRemarks: '',
          }),
      );
      const coinNum = parseInt(res.data!.coin, 10);
      expect(coinNum).toBeGreaterThanOrEqual(8000);
      expect(coinNum).toBeLessThanOrEqual(9999);
    });

    test('updates condition assignments', async () => {
      const res = await runWithTimers(() =>
          createCondition({
            name: 'C',
            description: 'D',
            assignments: [],
            remarks: '',
            csRemarks: '',
          }),
      );
      const coin = res.data!.coin;

      const updateRes = await runWithTimers(() =>
          updateCondition(coin, {
            assignments: [{ plin: '1234#12', expiryDate: '01/01/2030' }],
          }),
      );
      expect(updateRes.success).toBe(true);
      expect(updateRes.data?.assignments[0].plin).toBe('1234#12');
    });

    test('fails update for non-existent condition', async () => {
      const res = await runWithTimers(() =>
          updateCondition('0000', { name: 'Fail' }),
      );
      expect(res.success).toBe(false);
    });

    test('fails search for non-existent condition', async () => {
      const res = await runWithTimers(() => searchConditionByCoin('0000'));
      expect(res.success).toBe(false);
    });
  });

  describe('CRUD Operations - Powers', () => {
    test('creates and finds power', async () => {
      const res = await runWithTimers(() =>
          createPower({ name: 'Super Jump', description: 'Jump high', assignments: [] }),
      );
      expect(res.success).toBe(true);

      const search = await runWithTimers(() =>
          searchPowerByPoin(res.data!.poin),
      );
      expect(search.success).toBe(true);
      expect(search.data?.name).toBe('Super Jump');
    });

    test('generated POIN is within expected range 5000–7999', async () => {
      const res = await runWithTimers(() =>
          createPower({ name: 'Range Power', description: 'D', assignments: [] }),
      );

      const poinNum = parseInt(res.data!.poin, 10);
      expect(poinNum).toBeGreaterThanOrEqual(5000);
      expect(poinNum).toBeLessThanOrEqual(7999);
    });

    test('updates power fields', async () => {
      const res = await runWithTimers(() =>
          createPower({ name: 'P', description: 'D', assignments: [] }),
      );
      const poin = res.data!.poin;

      const update = await runWithTimers(() =>
          updatePower(poin, { name: 'Ultra P' }),
      );
      expect(update.success).toBe(true);
      expect(update.data?.name).toBe('Ultra P');
    });

    test('fails update for non-existent power', async () => {
      const res = await runWithTimers(() =>
          updatePower('0000', { name: 'Fail' }),
      );
      expect(res.success).toBe(false);
    });

    test('fails search for non-existent power', async () => {
      const res = await runWithTimers(() => searchPowerByPoin('0000'));
      expect(res.success).toBe(false);
    });
  });
});
