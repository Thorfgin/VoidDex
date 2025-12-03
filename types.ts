
/**
 * Represents the authenticated user profile.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

/**
 * Represents a physical Inventory Item.
 * Identified by ITIN (Item Identification Number).
 */
export interface Item {
  itin: string;
  name: string;
  description: string;
  owner: string; // PLIN (Player ID Number) e.g., "1234#12"
  expiryDate: string; // Format: dd/mm/yyyy
  remarks?: string;
  csRemarks?: string;
}

/**
 * Represents a player assignment for Powers or Conditions.
 */
export interface Assignment {
  plin: string; // PLIN (Player ID Number)
  expiryDate: string; // Format: dd/mm/yyyy or "until death"
}

/**
 * Represents a Status Effect or Condition (e.g., Disease, Buff).
 * Identified by COIN (Condition Identification Number).
 */
export interface Condition {
  coin: string;
  name: string;
  description: string;
  assignments: Assignment[]; // Can be assigned to multiple players
  remarks?: string;
  csRemarks?: string;
}

/**
 * Represents an Ability or Power.
 * Identified by POIN (Power Identification Number).
 */
export interface Power {
  poin: string;
  name: string;
  description: string;
  assignments: Assignment[]; // Can be assigned to multiple players
  remarks?: string;
  csRemarks?: string;
}

/**
 * Represents a personal note linked to objects.
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  linkedIds: string[]; // List of ITINs, COINs, or POINs
  timestamp: number;
  isPinned?: boolean;
}

/**
 * Standardized API response wrapper.
 */
export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Response received from the Auth provider exchange.
 */
export interface AuthResponse {
  token: string;
  user: User;
}