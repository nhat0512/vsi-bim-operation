export function formatDisplayName(rawName) {
  if (!rawName) return 'Người dùng';
  
  // Check if the name looks like an email prefix (e.g. "an.nguyen")
  if (rawName.includes('.')) {
    return rawName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  
  // Ensure words are capitalized
  return rawName.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
