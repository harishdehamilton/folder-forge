// Folder Forge — by Harish
// https://github.com/harishdehamilton/folder-forge

// ---- State ----
let templates = [];
let activeTemplateId = null;
let editingNodeId = null;
let collapsedNodes = new Set();

// ---- DOM References ----
const $templateList = document.getElementById('template-list');
const $emptyState = document.getElementById('empty-state');
const $editor = document.getElementById('template-editor');
const $templateName = document.getElementById('template-name');
const $folderTree = document.getElementById('folder-tree');
const $previewText = document.getElementById('preview-text');
const $folderCount = document.getElementById('folder-count');
const $toastContainer = document.getElementById('toast-container');

// ---- Init ----
async function init() {
  templates = await window.api.getTemplates();
  renderTemplateList();
}
init();

// ---- Event Listeners ----
document.getElementById('btn-new-template').addEventListener('click', createNewTemplate);
document.getElementById('btn-create-folders').addEventListener('click', handleCreateFolders);
document.getElementById('btn-delete-template').addEventListener('click', handleDeleteTemplate);
document.getElementById('btn-add-root').addEventListener('click', () => addFolderToTree(null));
document.getElementById('btn-duplicate').addEventListener('click', handleDuplicate);
document.getElementById('btn-export').addEventListener('click', handleExport);
document.getElementById('btn-import').addEventListener('click', handleImport);
document.getElementById('btn-collapse-all').addEventListener('click', collapseAll);
document.getElementById('btn-expand-all').addEventListener('click', expandAll);

$templateName.addEventListener('input', debounce(async () => {
  const tpl = getActiveTemplate();
  if (tpl) {
    tpl.name = $templateName.value;
    await window.api.saveTemplate(tpl);
    renderTemplateList();
  }
}, 400));

// ---- Keyboard Shortcuts ----
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === 'n') { e.preventDefault(); createNewTemplate(); }
  if (mod && e.key === 'i') { e.preventDefault(); handleImport(); }
  if (mod && e.key === 'Enter') { e.preventDefault(); handleCreateFolders(); }
  if (mod && e.key === 'd') {
    e.preventDefault();
    if (activeTemplateId) handleDuplicate();
  }
});

// ---- Template List ----
function renderTemplateList() {
  $templateList.innerHTML = '';
  for (const tpl of templates) {
    const li = document.createElement('li');
    li.className = tpl.id === activeTemplateId ? 'active' : '';
    const count = countFolders(tpl.structure);
    li.innerHTML = `
      <div class="tpl-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7c0-1.1.9-2 2-2h3.5l2 2H14c1.1 0 2 .9 2 2" stroke="currentColor" stroke-width="1.5"/></svg>
      </div>
      <div class="tpl-info">
        <div class="tpl-name">${escapeHtml(tpl.name)}</div>
        <div class="tpl-count">${count} folder${count !== 1 ? 's' : ''}</div>
      </div>
    `;
    li.addEventListener('click', () => selectTemplate(tpl.id));
    $templateList.appendChild(li);
  }
}

function selectTemplate(id) {
  activeTemplateId = id;
  collapsedNodes.clear();
  const tpl = getActiveTemplate();
  if (tpl) {
    $emptyState.style.display = 'none';
    $editor.classList.remove('hidden');
    $templateName.value = tpl.name;
    renderTree();
    renderPreview();
  }
  renderTemplateList();
}

function getActiveTemplate() {
  return templates.find(t => t.id === activeTemplateId);
}

// ---- Create New Template ----
async function createNewTemplate() {
  const newTpl = {
    name: 'New Template',
    structure: [{ name: 'Project_Name', children: [] }],
  };
  const saved = await window.api.saveTemplate(newTpl);
  templates = await window.api.getTemplates();
  selectTemplate(saved.id);
  $templateName.focus();
  $templateName.select();
}

// ---- Duplicate Template ----
async function handleDuplicate() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  const dup = await window.api.duplicateTemplate(tpl.id);
  templates = await window.api.getTemplates();
  selectTemplate(dup.id);
  showToast(`Duplicated "${tpl.name}"`, 'success');
}

// ---- Export / Import ----
async function handleExport() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  const result = await window.api.exportTemplates([tpl.id]);
  if (result.canceled) return;
  if (result.success) showToast(`Exported to ${result.path}`, 'success');
  else showToast('Export failed', 'error');
}

async function handleImport() {
  const result = await window.api.importTemplates();
  if (result.canceled) return;
  if (result.success) {
    templates = await window.api.getTemplates();
    renderTemplateList();
    showToast(`Imported ${result.count} template${result.count !== 1 ? 's' : ''}`, 'success');
  } else {
    showToast(`Import failed: ${result.error}`, 'error');
  }
}

// ---- Delete Template ----
async function handleDeleteTemplate() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  if (!confirm(`Delete "${tpl.name}"? This cannot be undone.`)) return;
  await window.api.deleteTemplate(tpl.id);
  templates = await window.api.getTemplates();
  activeTemplateId = null;
  $editor.classList.add('hidden');
  $emptyState.style.display = '';
  renderTemplateList();
  showToast('Template deleted', 'success');
}

// ---- Folder Tree ----
let nodeIdCounter = 0;

function assignIds(nodes) {
  for (const node of nodes) {
    if (!node._id) node._id = 'n' + (nodeIdCounter++);
    if (node.children) assignIds(node.children);
  }
}

function renderTree() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  assignIds(tpl.structure);
  $folderTree.innerHTML = '';
  renderNodes(tpl.structure, $folderTree);
}

function renderNodes(nodes, container) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node._id);

    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';

    const item = document.createElement('div');
    item.className = 'tree-item';

    // Collapse toggle
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle' + (hasChildren ? '' : ' invisible');
    toggle.innerHTML = isCollapsed
      ? '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l5 4-5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 5 4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
    if (hasChildren) {
      toggle.addEventListener('click', () => {
        if (collapsedNodes.has(node._id)) collapsedNodes.delete(node._id);
        else collapsedNodes.add(node._id);
        renderTree();
      });
    }
    item.appendChild(toggle);

    // Folder icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'folder-icon';
    iconSpan.innerHTML = isCollapsed
      ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.3"/><path d="M1 6c0-1.1.9-2 2-2h3l2 2h5c1.1 0 2 .9 2 2" stroke="currentColor" stroke-width="1.3"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M1 6c0-1.1.9-2 2-2h3l2 2h5c1.1 0 2 .9 2 2" stroke="currentColor" stroke-width="1.3"/></svg>';
    item.appendChild(iconSpan);

    // Name
    if (editingNodeId === node._id) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'folder-name-input';
      input.value = node.name;
      input.addEventListener('blur', () => finishEditing(node, input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishEditing(node, input.value);
        if (e.key === 'Escape') { editingNodeId = null; renderTree(); }
      });
      item.appendChild(input);
      setTimeout(() => { input.focus(); input.select(); }, 0);
    } else {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'folder-name';
      nameSpan.textContent = node.name;
      nameSpan.addEventListener('dblclick', () => { editingNodeId = node._id; renderTree(); });
      item.appendChild(nameSpan);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    actions.appendChild(createActionBtn(
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="3" x2="7" y2="11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      'Add subfolder', () => addFolderToTree(node)
    ));
    actions.appendChild(createActionBtn(
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 2.5l3 3M2 9l6.5-6.5 3 3L5 12H2V9z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      'Rename', () => { editingNodeId = node._id; renderTree(); }
    ));
    actions.appendChild(createActionBtn(
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      'Delete', () => removeNode(nodes, i), 'delete'
    ));
    item.appendChild(actions);
    nodeEl.appendChild(item);

    // Children
    if (hasChildren && !isCollapsed) {
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-children';
      renderNodes(node.children, childContainer);
      nodeEl.appendChild(childContainer);
    }

    container.appendChild(nodeEl);
  }
}

function createActionBtn(svgHtml, title, onClick, extraClass = '') {
  const btn = document.createElement('button');
  btn.className = 'tree-action-btn' + (extraClass ? ' ' + extraClass : '');
  btn.title = title;
  btn.innerHTML = svgHtml;
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return btn;
}

async function finishEditing(node, newName) {
  editingNodeId = null;
  const sanitized = newName.trim().replace(/[<>:"/\\|?*]/g, '_');
  if (sanitized) node.name = sanitized;
  const tpl = getActiveTemplate();
  await window.api.saveTemplate(tpl);
  templates = await window.api.getTemplates();
  selectTemplate(tpl.id);
}

async function addFolderToTree(parentNode) {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  const newNode = { name: 'New_Folder', children: [], _id: 'n' + (nodeIdCounter++) };
  if (parentNode) {
    if (!parentNode.children) parentNode.children = [];
    parentNode.children.push(newNode);
    collapsedNodes.delete(parentNode._id);
  } else {
    tpl.structure.push(newNode);
  }
  editingNodeId = newNode._id;
  await window.api.saveTemplate(tpl);
  templates = await window.api.getTemplates();
  selectTemplate(tpl.id);
}

async function removeNode(siblings, index) {
  siblings.splice(index, 1);
  const tpl = getActiveTemplate();
  await window.api.saveTemplate(tpl);
  templates = await window.api.getTemplates();
  selectTemplate(tpl.id);
}

// ---- Collapse / Expand ----
function collapseAll() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  function collectIds(nodes) {
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        collapsedNodes.add(n._id);
        collectIds(n.children);
      }
    }
  }
  collectIds(tpl.structure);
  renderTree();
}

function expandAll() {
  collapsedNodes.clear();
  renderTree();
}

// ---- Preview ----
function renderPreview() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  const count = countFolders(tpl.structure);
  $folderCount.textContent = `${count} folder${count !== 1 ? 's' : ''}`;
  $previewText.textContent = generatePreviewText(tpl.structure, '', true);
}

function generatePreviewText(nodes, prefix, isRoot) {
  let text = '';
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isRoot ? '' : (isLast ? '  \u2514\u2500\u2500 ' : '  \u251C\u2500\u2500 ');
    const childPrefix = isRoot ? '' : (prefix + (isLast ? '      ' : '  \u2502   '));
    text += prefix + connector + node.name + '/\n';
    if (node.children && node.children.length > 0) {
      text += generatePreviewText(node.children, isRoot ? prefix : childPrefix, false);
    }
  }
  return text;
}

// ---- Create Folders (with project name modal) ----
const $modalOverlay = document.getElementById('modal-overlay');
const $projectNameInput = document.getElementById('project-name-input');
const $modalPreviewText = document.getElementById('modal-preview-text');
const $modalCancel = document.getElementById('modal-cancel');
const $modalCreate = document.getElementById('modal-create');

function handleCreateFolders() {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  showProjectNameModal(tpl);
}

function showProjectNameModal(tpl) {
  $modalOverlay.classList.remove('hidden');
  $projectNameInput.value = '';
  $projectNameInput.placeholder = tpl.structure[0]?.name || 'Project_Name';
  updateModalPreview(tpl, '');
  setTimeout(() => $projectNameInput.focus(), 50);
}

function updateModalPreview(tpl, projectName) {
  const structure = deepClone(tpl.structure);
  if (projectName.trim() && structure.length > 0) {
    structure[0].name = sanitizeFolderName(projectName.trim());
  }
  $modalPreviewText.textContent = generatePreviewText(structure, '', true);
}

$projectNameInput.addEventListener('input', () => {
  const tpl = getActiveTemplate();
  if (tpl) updateModalPreview(tpl, $projectNameInput.value);
});

$modalCancel.addEventListener('click', () => $modalOverlay.classList.add('hidden'));
$modalOverlay.addEventListener('click', (e) => {
  if (e.target === $modalOverlay) $modalOverlay.classList.add('hidden');
});

$modalCreate.addEventListener('click', async () => {
  const tpl = getActiveTemplate();
  if (!tpl) return;
  const projectName = $projectNameInput.value.trim();
  $modalOverlay.classList.add('hidden');

  const result = await window.api.createFromTemplate({
    templateId: tpl.id,
    projectName: projectName || null,
  });
  if (result.canceled) return;
  if (result.success) {
    showToast(`"${result.projectName}" created successfully`, 'success');
  } else {
    showToast(`Error: ${result.error}`, 'error');
  }
});

$projectNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $modalCreate.click();
  if (e.key === 'Escape') $modalCancel.click();
});

function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---- Toast ----
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span>${escapeHtml(message)}`;
  $toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Helpers ----
function countFolders(nodes) {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) count += countFolders(node.children);
  }
  return count;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
