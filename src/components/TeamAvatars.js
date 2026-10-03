// ============================================
// Creator Kit — Team Avatars Component
// ============================================

/**
 * Render stacked team member avatars.
 * @param {Array} members - Array of team member objects
 * @returns {string} HTML string
 */
export function renderTeamAvatars(members) {
  if (!members || members.length === 0) return '';

  const avatarsHTML = members.map((member, index) => {
    // Status color mapping
    const statusColors = {
      online: '#22c55e',
      busy: '#f59e0b',
      offline: '#6b7280'
    };
    const statusColor = statusColors[member.status] || statusColors.offline;

    return `
      <div class="team-avatar" 
           title="${member.name} — ${member.role}" 
           style="
             background: ${member.color || '#6366f1'};
             margin-left: ${index === 0 ? '0' : '-8px'};
             z-index: ${members.length - index};
           ">
        <span class="team-avatar__initials">${member.initials || '?'}</span>
        <span class="team-avatar__status" style="background: ${statusColor};"></span>
      </div>
    `;
  }).join('');

  return `<div class="team-avatars">${avatarsHTML}</div>`;
}
