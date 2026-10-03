// ============================================
// KANBAN BOARD COMPONENT
// ============================================
import { updateProject, getState } from '../state.js';
import { PROJECT_STATUSES } from '../data/constants.js';

/**
 * Render the Kanban Board HTML
 * @param {Array} projects 
 */
export function renderKanbanBoard(projects) {
  const columns = ['planning', 'active', 'on-hold', 'completed'];
  
  return `
    <div class="kanban-board">
      ${columns.map(status => {
        const colProjects = projects.filter(p => p.status === status);
        const statusInfo = PROJECT_STATUSES[status] || { label: status, class: '' };
        
        return `
          <div class="kanban-col" data-status="${status}">
            <div class="kanban-col-header">
              <span class="badge ${statusInfo.class}"><span class="badge-dot"></span>${statusInfo.label}</span>
              <span class="kanban-col-count">${colProjects.length}</span>
            </div>
            <div class="kanban-dropzone" data-status="${status}">
              ${colProjects.map(p => `
                <div class="kanban-card" draggable="true" data-project-id="${p.id}">
                  <div class="flex justify-between mb-xs">
                    <span class="kanban-card-code">${p.code}</span>
                    <span class="text-xs text-muted">LOD ${p.lodTarget}</span>
                  </div>
                  <div class="kanban-card-title">${p.name}</div>
                  <div class="kanban-card-progress">
                    <div class="progress-bar">
                      <div class="progress-bar-fill ${p.progress >= 70 ? 'green' : p.progress >= 40 ? '' : 'orange'}" style="width: ${p.progress}%"></div>
                    </div>
                  </div>
                  <div class="flex justify-between mt-sm">
                    <span class="text-xs font-semibold">${p.progress}%</span>
                    <span class="text-xs text-muted">${p.teamSize} nhân sự</span>
                  </div>
                </div>
              `).join('')}
              ${colProjects.length === 0 ? '<div class="kanban-empty">Kéo dự án vào đây</div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Initialize Drag and Drop events
 * @param {Function} onRefresh - Callback to re-render the dashboard
 */
export function initKanbanEvents(onRefresh) {
  const cards = document.querySelectorAll('.kanban-card');
  const dropzones = document.querySelectorAll('.kanban-dropzone');
  
  let draggedCard = null;
  let draggedProjectId = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      draggedProjectId = card.dataset.projectId;
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    
    card.addEventListener('dragend', () => {
      draggedCard.classList.remove('dragging');
      draggedCard = null;
      draggedProjectId = null;
      document.querySelectorAll('.kanban-dropzone').forEach(dz => dz.classList.remove('drag-over'));
    });
  });

  dropzones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!zone.classList.contains('drag-over')) {
        zone.classList.add('drag-over');
      }
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      
      const newStatus = zone.dataset.status;
      const { projects } = getState();
      const project = projects.find(p => p.id === draggedProjectId);
      
      if (project && project.status !== newStatus) {
        updateProject(project.id, { status: newStatus });
        if (onRefresh) onRefresh();
      }
    });
  });
}
