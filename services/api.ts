import { Item, Condition, Power, ApiResult, Assignment } from '../types';

// --- MOCK DATA GENERATION ---
// In a real application, this data would come from a backend database.
// Here, we generate consistent mock data to simulate a populated environment for testing.

const MOCK_PLAYER_NAMES = [
  "Commander Shepherd", "Liara T'Soni", "Garrus Vakarian", "Tali'Zorah", "Urdnot Wrex",
  "Kaidan Alenko", "Ashley Williams", "Joker Moreau", "Dr. Chakwas", "Miranda Lawson",
  "Jacob Taylor", "Mordin Solus", "Jack", "Grunt", "Thane Krios", "Samara", "Legion",
  "Zaeed Massani", "Kasumi Goto", "Javik", "James Vega", "EDI", "Admiral Anderson",
  "Illusive Man", "Aria T'Loak"
];

const ITEM_NAMES = [
  "Plasma Rifle", "Medigel Pack", "Omni-tool v1", "Kinetic Barrier", "Thermal Clip",
  "Element Zero Core", "Heavy Pistol", "Sniper Rifle", "Biotic Amp", "Tech Armor Generator",
  "Assault Rifle", "Shotgun", "Submachine Gun", "Grenade Launcher", "Rocket Launcher",
  "Arc Projector", "Flamethrower", "Cryo Blaster", "Particle Rifle", "Cain Nuke Launcher",
  "Black Widow", "Carnifex Hand Cannon", "Geth Pulse Rifle", "Mattock Rifle", "M-8 Avenger"
];

const CONDITION_NAMES = [
  "Radiation Poisoning", "Broken Bone", "Concussion", "Exhaustion", "Frozen",
  "Burning", "Poisoned", "Stunned", "Bleeding", "Blinded",
  "Deafened", "Paralyzed", "Petrified", "Charmed", "Frightened",
  "Invisible", "Hasted", "Slowed", "Weakened", "Empowered",
  "Cursed", "Blessed", "Sleeping", "Unconscious", "Dead"
];

const POWER_NAMES = [
  "Biotic Throw", "Warp", "Singularity", "Pull", "Shockwave",
  "Charge", "Nova", "Barrier", "Stasis", "Reave",
  "Overload", "Incinerate", "Cryo Blast", "AI Hacking", "Combat Drone",
  "Tech Armor", "Tactical Cloak", "Energy Drain", "Adrenaline Rush", "Concussive Shot",
  "Fortification", "Geth Shield Boost", "Slam", "Dark Channel", "Flare"
];

// Generate Players with formatted IDs (PLINs 1001#01 to 1025#01)
const PLAYERS: Record<string, string> = {};
MOCK_PLAYER_NAMES.forEach((name, i) => {
  const id = `${1001 + i}#01`;
  PLAYERS[id] = name;
});
const PLAYER_IDS = Object.keys(PLAYERS);

/**
 * Helper to pick random unique owners for Conditions and Powers.
 * Simulates multi-assignment (e.g., a disease affecting multiple players).
 */
const pickAssignments = (min: number, max: number): Assignment[] => {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...PLAYER_IDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(plin => ({
        plin,
        expiryDate: '31/12/2030'
    }));
};

// Generate 25 Items (ITIN 1001-1025) - Items typically have a single owner
const INITIAL_ITEMS: Item[] = ITEM_NAMES.map((name, i) => ({
    itin: (1001 + i).toString(),
    name,
    description: `Standard issue ${name}.`,
    owner: PLAYER_IDS[i % PLAYER_IDS.length],
    expiryDate: '31/12/2025',
    remarks: 'Standard operational condition.',
    csRemarks: ''
}));

// Generate 25 Conditions (COIN 8001-8025) - 1 to 10 Owners per condition
const INITIAL_CONDITIONS: Condition[] = CONDITION_NAMES.map((name, i) => ({
    coin: (8001 + i).toString(),
    name,
    description: `Status effect: ${name}`,
    assignments: pickAssignments(1, 10),
    remarks: 'Medical bay attention required if severe.',
    csRemarks: ''
}));

// Generate 25 Powers (POIN 5001-5025) - 1 to 10 Owners per power
const INITIAL_POWERS: Power[] = POWER_NAMES.map((name, i) => ({
    poin: (5001 + i).toString(),
    name,
    description: `Ability: ${name}`,
    assignments: pickAssignments(1, 10),
    remarks: 'Requires cooldown between uses.',
    csRemarks: ''
}));

// --- DUPLICATE TEST OBJECTS (ID 9999) ---
const TEST_DUPLICATE_ITEM: Item = {
    itin: '9999',
    name: 'Omni-Blade (Item)',
    description: 'Physical blade attachment.',
    owner: '1001#01',
    expiryDate: '01/01/2030'
};
INITIAL_ITEMS.push(TEST_DUPLICATE_ITEM);

const TEST_DUPLICATE_CONDITION: Condition = {
    coin: '9999',
    name: 'Omni-Rot (Condition)',
    description: 'Tech virus affecting implants.',
    assignments: [{ plin: '1001#01', expiryDate: '01/01/2030' }]
};
INITIAL_CONDITIONS.push(TEST_DUPLICATE_CONDITION);

const TEST_DUPLICATE_POWER: Power = {
    poin: '9999',
    name: 'Omni-Slash (Power)',
    description: 'Tech attack ability.',
    assignments: [{ plin: '1001#01', expiryDate: '01/01/2030' }]
};
INITIAL_POWERS.push(TEST_DUPLICATE_POWER);


// Mock In-Memory Databases
// These persist in memory until the app is reloaded or `resetData()` is called.
let MOCK_DB: Item[] = JSON.parse(JSON.stringify(INITIAL_ITEMS));
let MOCK_CONDITIONS: Condition[] = JSON.parse(JSON.stringify(INITIAL_CONDITIONS));
let MOCK_POWERS: Power[] = JSON.parse(JSON.stringify(INITIAL_POWERS));

// Simulates network latency (800ms) to allow UI loading states to be visualized
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 800));

const checkAuth = () => {
  // In a real app, this would check if the Axios/Fetch headers contain a valid token.
};

/**
 * Resets all mock databases to their initial state.
 * Useful for logout cleanup or testing.
 */
export const resetData = () => {
  MOCK_DB = JSON.parse(JSON.stringify(INITIAL_ITEMS));
  MOCK_CONDITIONS = JSON.parse(JSON.stringify(INITIAL_CONDITIONS));
  MOCK_POWERS = JSON.parse(JSON.stringify(INITIAL_POWERS));
};

/**
 * Resolves a PLIN (Player ID) to a readable name using the mock players list.
 * Handles parsing logic for formats like "1234#12".
 */
export const getCharacterName = (plin: string): string => {
  if (PLAYERS[plin]) return PLAYERS[plin];

  if (!plin || !plin.includes('#')) return '';
  if (plin === 'SYSTEM') return '';
  
  const parts = plin.split('#');
  if (parts.length < 2) return '';

  const num = parseInt(parts[0].replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';

  // Fallback generation for unknown IDs
  return num % 2 === 0 ? 'Jane Doe' : 'John Doe';
};

/**
 * Creates a new inventory item.
 * Assigns a random ITIN (1000-9999).
 */
export const createItem = async (item: Omit<Item, 'itin'>): Promise<ApiResult<Item>> => {
  checkAuth();
  await simulateDelay();
  const newItin = Math.floor(1000 + Math.random() * 9000).toString();
  const newItem = { ...item, itin: newItin };
  MOCK_DB.push(newItem);
  return { success: true, data: newItem };
};

/**
 * Search for an item by ITIN (Exact match).
 */
export const searchItemByItin = async (itin: string): Promise<ApiResult<Item>> => {
  checkAuth();
  await simulateDelay();
  const item = MOCK_DB.find(i => i.itin === itin);
  if (item) return { success: true, data: { ...item } };
  return { success: false, error: 'Not found' };
};

/**
 * Creates a new Condition (e.g., Disease, Buff).
 * Assigns a random COIN (8000-9999).
 */
export const createCondition = async (cond: Omit<Condition, 'coin'>): Promise<ApiResult<Condition>> => {
  checkAuth();
  await simulateDelay();
  const newCoin = Math.floor(8000 + Math.random() * 1999).toString();
  const newCondition = { ...cond, coin: newCoin };
  MOCK_CONDITIONS.push(newCondition);
  return { success: true, data: newCondition };
};

/**
 * Search for a condition by COIN (Exact match).
 */
export const searchConditionByCoin = async (coin: string): Promise<ApiResult<Condition>> => {
  checkAuth();
  await simulateDelay();
  const cond = MOCK_CONDITIONS.find(c => c.coin === coin);
  if (cond) return { success: true, data: { ...cond } };
  return { success: false, error: 'Condition not found' };
};

/**
 * Creates a new Power/Ability.
 * Assigns a random POIN (5000-7999).
 */
export const createPower = async (pow: Omit<Power, 'poin'>): Promise<ApiResult<Power>> => {
  checkAuth();
  await simulateDelay();
  const newPoin = Math.floor(5000 + Math.random() * 2999).toString();
  const newPower = { ...pow, poin: newPoin };
  MOCK_POWERS.push(newPower);
  return { success: true, data: newPower };
};

/**
 * Search for a power by POIN (Exact match).
 */
export const searchPowerByPoin = async (poin: string): Promise<ApiResult<Power>> => {
  checkAuth();
  await simulateDelay();
  const power = MOCK_POWERS.find(p => p.poin === poin);
  if (power) return { success: true, data: { ...power } };
  return { success: false, error: 'Power not found' };
};

/**
 * Updates an item's properties found by ITIN.
 */
export const updateItem = async (itin: string, updates: Partial<Item>): Promise<ApiResult<Item>> => {
  checkAuth();
  await simulateDelay();
  const index = MOCK_DB.findIndex(i => i.itin === itin);
  if (index !== -1) {
    MOCK_DB[index] = { ...MOCK_DB[index], ...updates };
    return { success: true, data: MOCK_DB[index] };
  }
  return { success: false, error: 'Item not found during update' };
};

/**
 * Updates a condition's properties found by COIN.
 */
export const updateCondition = async (coin: string, updates: Partial<Condition>): Promise<ApiResult<Condition>> => {
  checkAuth();
  await simulateDelay();
  const index = MOCK_CONDITIONS.findIndex(c => c.coin === coin);
  if (index !== -1) {
    MOCK_CONDITIONS[index] = { ...MOCK_CONDITIONS[index], ...updates };
    return { success: true, data: MOCK_CONDITIONS[index] };
  }
  return { success: false, error: 'Condition not found during update' };
};

/**
 * Updates a power's properties found by POIN.
 */
export const updatePower = async (poin: string, updates: Partial<Power>): Promise<ApiResult<Power>> => {
  checkAuth();
  await simulateDelay();
  const index = MOCK_POWERS.findIndex(p => p.poin === poin);
  if (index !== -1) {
    MOCK_POWERS[index] = { ...MOCK_POWERS[index], ...updates };
    return { success: true, data: MOCK_POWERS[index] };
  }
  return { success: false, error: 'Power not found during update' };
};

/**
 * Global Search aggregator.
 * Queries Items, Conditions, and Powers simultaneously using a partial string match.
 * Matches against Name, ID, or Owner PLIN.
 */
export const searchGlobal = async (query: string): Promise<ApiResult<(Item | Condition | Power)[]>> => {
  checkAuth();
  await simulateDelay();

  const lowerQuery = query.toLowerCase();

  // 1. Filter Items
  const itemResults = MOCK_DB.filter(item => 
    item.name.toLowerCase().includes(lowerQuery) ||
    item.owner.toLowerCase().includes(lowerQuery) ||
    item.itin.includes(query)
  );

  // 2. Filter Conditions (Checks deep inside assignment arrays for owner match)
  const conditionResults = MOCK_CONDITIONS.filter(cond => 
    cond.name.toLowerCase().includes(lowerQuery) ||
    cond.assignments.some(a => a.plin.toLowerCase().includes(lowerQuery)) ||
    cond.coin.includes(query)
  );

  // 3. Filter Powers (Checks deep inside assignment arrays for owner match)
  const powerResults = MOCK_POWERS.filter(pow => 
    pow.name.toLowerCase().includes(lowerQuery) ||
    pow.assignments.some(a => a.plin.toLowerCase().includes(lowerQuery)) ||
    pow.poin.includes(query)
  );

  // Combine all results
  return { success: true, data: [...itemResults, ...conditionResults, ...powerResults] };
};