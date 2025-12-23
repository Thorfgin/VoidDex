/**
 * Formats a raw input string into the standard Player Identification Number (PLIN)
 * format: XXXX#YY. It cleans non-numeric/non-hash characters and enforces
 * length constraints and placement of the hash symbol.
 * * @param val The raw input string.
 * @returns The formatted PLIN string.
 */
export const formatPLIN = (val: string): string => {
  const clean = val.replace(/[^0-9#]/g, '');

  if (clean.includes('#')) {
    const parts = clean.split('#');
    // Ensure the first part (ID) is max 4 digits and the second part (Server) is max 2 digits
    return `${parts[0].slice(0, 4)}#${parts.slice(1).join('').slice(0, 2)}`;
  }

  if (clean.length > 4) {
    // Automatically insert the hash if more than 4 digits are typed
    return `${clean.slice(0, 4)}#${clean.slice(4, 6)}`;
  }

  return clean;
};

