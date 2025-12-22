/**
 * Calculates a default expiry date:
 * Set to the 1st day of the month, one year and one month from the current date.
 * Formatted as DD/MM/YYYY.
 */
export const getDefaultExpiry = (): string => {
  const date = new Date();

  // Set to the 1st day of the current month
  date.setDate(1);

  // Advance by one month and one year
  date.setMonth(date.getMonth() + 1);
  date.setFullYear(date.getFullYear() + 1);

  // Format the date parts
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();

  return `${d}/${m}/${y}`;
};

/**
 * Formats a date string input into the DD/MM/YYYY format,
 * adding slashes and performing basic bounds validation for day/month/year.
 */
export const formatDate = (val: string): string => {
  let clean = val.replace(/\D/g, '');
  let day = clean.slice(0, 2);
  let month = clean.slice(2, 4);
  let year = clean.slice(4, 8);

  // Day Validation
  if (day.length === 2) {
    let d = parseInt(day, 10);
    if (d > 31) d = 31;
    if (d < 1) d = 1;
    day = d.toString().padStart(2, '0');
  }
  // Month Validation
  if (month.length === 2) {
    let m = parseInt(month, 10);
    if (m > 12) m = 12;
    if (m < 1) m = 1;
    month = m.toString().padStart(2, '0');
  }
  // Year Validation
  if (year.length === 4) {
    let y = parseInt(year, 10);
    if (y > 2100) y = 2100;
    if (y < 1980) y = 1980;
    year = y.toString();
  }

  return day + (clean.length >= 3 ? `/${month}` : '') + (clean.length >= 5 ? `/${year}` : '');
};