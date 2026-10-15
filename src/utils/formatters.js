export function formatDisplayName(rawName) {
  if (!rawName) return 'Người dùng';
  
  // Check if the name looks like an email prefix (e.g. "an.nguyen")
  if (rawName.includes('.')) {
    return rawName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  
  // Ensure words are capitalized
  return rawName.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

/**
 * Format a Date object or date-compatible value to local YYYY-MM-DD
 * Prevents UTC timezone shift issues (e.g. GMT+7 being shifted backward when calling toISOString)
 */
export function formatLocalDate(date = new Date()) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

