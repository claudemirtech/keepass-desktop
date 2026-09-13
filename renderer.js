// State management
let currentDbData = null;
let selectedGroupId = 'ALL';
let searchQuery = '';
let visiblePasswords = new Set(); // Set of entry UUIDs that have password revealed

// DOM Elements
const lockScreen = document.getElementById('lockScreen');
const dashboardView = document.getElementById('dashboardView');
const headerDbBadge = document.getElementById('headerDbBadge');
const headerUnsavedBadge = document.getElementById('headerUnsavedBadge');
const headerActions = document.getElementById('headerActions');

// Lock screen inputs
const dbFilePathInput = document.getElementById('dbFilePathInput');
const btnBrowseDbFile = document.getElementById('btnBrowseDbFile');
const dbPasswordInput = document.getElementById('dbPasswordInput');
const btnToggleLockPwd = document.getElementById('btnToggleLockPwd');
const chkUseKeyFile = document.getElementById('chkUseKeyFile');
const keyFileGroup = document.getElementById('keyFileGroup');
const keyFilePathInput = document.getElementById('keyFilePathInput');
const btnBrowseKeyFile = document.getElementById('btnBrowseKeyFile');
const btnUnlockDb = document.getElementById('btnUnlockDb');
const lockErrorBanner = document.getElementById('lockErrorBanner');
const btnOpenCreateDbModal = document.getElementById('btnOpenCreateDbModal');

// Dashboard elements
const groupsContainer = document.getElementById('groupsContainer');
const currentGroupTitle = document.getElementById('currentGroupTitle');
const currentGroupSubtitle = document.getElementById('currentGroupSubtitle');
const searchInput = document.getElementById('searchInput');
const entriesTable = document.getElementById('entriesTable');
const entriesTbody = document.getElementById('entriesTbody');
const emptyState = document.getElementById('emptyState');
const btnEmptyAddEntry = document.getElementById('btnEmptyAddEntry');

// Header actions
const btnOpenNewEntry = document.getElementById('btnOpenNewEntry');
const btnOpenNewGroup = document.getElementById('btnOpenNewGroup');
const btnSidebarAddGroup = document.getElementById('btnSidebarAddGroup');
const btnSaveDb = document.getElementById('btnSaveDb');
const btnLockDb = document.getElementById('btnLockDb');

// Entry Modal elements
const entryModal = document.getElementById('entryModal');
const entryModalTitle = document.getElementById('entryModalTitle');
const btnCloseEntryModal = document.getElementById('btnCloseEntryModal');
const btnCancelEntryModal = document.getElementById('btnCancelEntryModal');
const btnSaveEntryModal = document.getElementById('btnSaveEntryModal');
const entryEditId = document.getElementById('entryEditId');
const entryGroupSelect = document.getElementById('entryGroupSelect');
const entryTitleInput = document.getElementById('entryTitleInput');
const entryUsernameInput = document.getElementById('entryUsernameInput');
const entryPasswordInput = document.getElementById('entryPasswordInput');
const btnToggleEntryPwd = document.getElementById('btnToggleEntryPwd');
const pwdStrengthBar = document.getElementById('pwdStrengthBar');
const pwdStrengthText = document.getElementById('pwdStrengthText');
const btnToggleGenerator = document.getElementById('btnToggleGenerator');
const pwdGeneratorBox = document.getElementById('pwdGeneratorBox');
const genLengthSlider = document.getElementById('genLengthSlider');
const genLengthDisplay = document.getElementById('genLengthDisplay');
const chkGenUpper = document.getElementById('chkGenUpper');
const chkGenLower = document.getElementById('chkGenLower');
const chkGenNumbers = document.getElementById('chkGenNumbers');
const chkGenSymbols = document.getElementById('chkGenSymbols');
const btnGeneratePwdNow = document.getElementById('btnGeneratePwdNow');
const entryUrlInput = document.getElementById('entryUrlInput');
const entryNotesInput = document.getElementById('entryNotesInput');

// Group Modal elements
const groupModal = document.getElementById('groupModal');
const btnCloseGroupModal = document.getElementById('btnCloseGroupModal');
const btnCancelGroupModal = document.getElementById('btnCancelGroupModal');
const btnSaveGroupModal = document.getElementById('btnSaveGroupModal');
const groupParentSelect = document.getElementById('groupParentSelect');
const groupNameInput = document.getElementById('groupNameInput');

// Create DB Modal elements
const createDbModal = document.getElementById('createDbModal');
const btnCloseCreateDbModal = document.getElementById('btnCloseCreateDbModal');
const btnCancelCreateDbModal = document.getElementById('btnCancelCreateDbModal');
const btnConfirmCreateDb = document.getElementById('btnConfirmCreateDb');
const createDbErrorBanner = document.getElementById('createDbErrorBanner');
const newDbNameInput = document.getElementById('newDbNameInput');
const newDbFilePathInput = document.getElementById('newDbFilePathInput');
const btnChooseNewDbLocation = document.getElementById('btnChooseNewDbLocation');
const newDbPasswordInput = document.getElementById('newDbPasswordInput');
const newDbPasswordConfirmInput = document.getElementById('newDbPasswordConfirmInput');

// Toast container
const toastContainer = document.getElementById('toastContainer');

// ==========================================
// Initialization
// ==========================================
async function init() {
    try {
        const defaultPath = await window.kdbxAPI.getDefaultPath();
        if (defaultPath) {
            dbFilePathInput.value = defaultPath;
        }
    } catch (err) {
        console.error('Erro ao obter caminho inicial:', err);
    }
    dbPasswordInput.focus();
}

// ==========================================
// Toast Notification Helper
// ==========================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ==========================================
// Password Strength Evaluator
// ==========================================
function evaluatePasswordStrength(password) {
    if (!password) {
        return { score: 0, label: 'Vazia', color: 'transparent', width: '0%' };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) {
        return { score, label: 'Fraca', color: '#ef4444', width: '25%' };
    } else if (score <= 4) {
        return { score, label: 'Média', color: '#f59e0b', width: '50%' };
    } else if (score === 5) {
        return { score, label: 'Forte', color: '#38bdf8', width: '75%' };
    } else {
        return { score, label: 'Excelente', color: '#10b981', width: '100%' };
    }
}

function updateStrengthIndicator() {
    const pwd = entryPasswordInput.value;
    const strength = evaluatePasswordStrength(pwd);
    pwdStrengthBar.style.backgroundColor = strength.color;
    pwdStrengthBar.style.width = strength.width;
    pwdStrengthText.textContent = `Força: ${strength.label}`;
    pwdStrengthText.style.color = strength.color === 'transparent' ? 'var(--text-dim)' : strength.color;
}

// ==========================================
// Strong Password Generator
// ==========================================
function generateStrongPassword() {
    const length = parseInt(genLengthSlider.value, 10);
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~|}{[]:;?><,./-=';

    let charset = '';
    let requiredChars = [];

    if (chkGenUpper.checked) {
        charset += upper;
        requiredChars.push(upper[Math.floor(Math.random() * upper.length)]);
    }
    if (chkGenLower.checked) {
        charset += lower;
        requiredChars.push(lower[Math.floor(Math.random() * lower.length)]);
    }
    if (chkGenNumbers.checked) {
        charset += numbers;
        requiredChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
    }
    if (chkGenSymbols.checked) {
        charset += symbols;
        requiredChars.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }

    if (!charset) {
        charset = lower + numbers;
    }

    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    let result = [...requiredChars];
    for (let i = result.length; i < length; i++) {
        result.push(charset[randomValues[i] % charset.length]);
    }

    // Shuffle result
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result.join('');
}

// ==========================================
// Lock Screen Actions
// ==========================================
btnBrowseDbFile.addEventListener('click', async () => {
    const selected = await window.kdbxAPI.selectFile({ isKeyFile: false });
    if (selected) {
        dbFilePathInput.value = selected;
    }
});

btnToggleLockPwd.addEventListener('click', () => {
    const isPassword = dbPasswordInput.type === 'password';
    dbPasswordInput.type = isPassword ? 'text' : 'password';
});

chkUseKeyFile.addEventListener('change', () => {
    keyFileGroup.style.display = chkUseKeyFile.checked ? 'flex' : 'none';
});

btnBrowseKeyFile.addEventListener('click', async () => {
    const selected = await window.kdbxAPI.selectFile({ isKeyFile: true });
    if (selected) {
        keyFilePathInput.value = selected;
    }
});

async function handleUnlock() {
    const filePath = dbFilePathInput.value.trim();
    const password = dbPasswordInput.value;
    const keyFilePath = chkUseKeyFile.checked ? keyFilePathInput.value.trim() : null;

    if (!filePath) {
        showLockError('Por favor, informe o caminho do arquivo .kdbx.');
        return;
    }

    lockErrorBanner.style.display = 'none';
    btnUnlockDb.disabled = true;
    btnUnlockDb.textContent = 'Desbloqueando...';

    try {
        const res = await window.kdbxAPI.unlockDatabase(filePath, password, keyFilePath);
        if (!res.success) {
            showLockError(res.error || 'Erro ao desbloquear base de dados.');
            return;
        }

        currentDbData = res.data;
        showDashboard();
        showToast('Base de dados desbloqueada com sucesso!');
    } catch (err) {
        showLockError(err.message || 'Erro inesperado.');
    } finally {
        btnUnlockDb.disabled = false;
        btnUnlockDb.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Desbloquear Base
        `;
    }
}

btnUnlockDb.addEventListener('click', handleUnlock);
dbPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock();
});

function showLockError(msg) {
    lockErrorBanner.textContent = msg;
    lockErrorBanner.style.display = 'block';
}

// ==========================================
// Dashboard View & State
// ==========================================
function showDashboard() {
    lockScreen.style.display = 'none';
    dashboardView.style.display = 'flex';
    headerDbBadge.textContent = currentDbData.fileName;
    headerDbBadge.style.display = 'inline-block';
    headerActions.style.display = 'flex';
    updateUnsavedBadge();

    selectedGroupId = 'ALL';
    searchQuery = '';
    searchInput.value = '';
    visiblePasswords.clear();

    renderGroups();
    renderEntries();
}

function lockDatabase() {
    window.kdbxAPI.closeDatabase();
    currentDbData = null;
    dbPasswordInput.value = '';
    dashboardView.style.display = 'none';
    headerDbBadge.style.display = 'none';
    headerUnsavedBadge.style.display = 'none';
    headerActions.style.display = 'none';
    lockScreen.style.display = 'flex';
    dbPasswordInput.focus();
    showToast('Base de dados bloqueada.', 'info');
}

btnLockDb.addEventListener('click', () => {
    if (currentDbData?.hasUnsavedChanges) {
        if (confirm('Existem alterações não salvas. Deseja realmente bloquear e descartar as alterações não salvas?')) {
            lockDatabase();
        }
    } else {
        lockDatabase();
    }
});

function updateUnsavedBadge() {
    if (currentDbData?.hasUnsavedChanges) {
        headerUnsavedBadge.style.display = 'inline-block';
    } else {
        headerUnsavedBadge.style.display = 'none';
    }
}

// Save Database Action
btnSaveDb.addEventListener('click', async () => {
    if (!currentDbData) return;
    btnSaveDb.disabled = true;
    try {
        const res = await window.kdbxAPI.saveDatabase();
        if (res.success) {
            currentDbData.hasUnsavedChanges = false;
            updateUnsavedBadge();
            showToast('Base salva no disco com sucesso!');
        } else {
            showToast(res.error || 'Erro ao salvar.', 'error');
        }
    } catch (err) {
        showToast(err.message || 'Erro ao salvar.', 'error');
    } finally {
        btnSaveDb.disabled = false;
    }
});

// ==========================================
// Rendering Groups Sidebar
// ==========================================
function renderGroups() {
    if (!currentDbData) return;

    groupsContainer.innerHTML = '';

    // "Todas as Senhas" Item
    const totalEntries = currentDbData.entries.length;
    const allItem = document.createElement('div');
    allItem.className = `group-item ${selectedGroupId === 'ALL' ? 'active' : ''}`;
    allItem.innerHTML = `
        <div class="group-item-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Todas as Senhas</span>
        </div>
        <span class="group-badge">${totalEntries}</span>
    `;
    allItem.addEventListener('click', () => {
        selectedGroupId = 'ALL';
        renderGroups();
        renderEntries();
    });
    groupsContainer.appendChild(allItem);

    // List flat groups with indentation
    currentDbData.flatGroups.forEach(grp => {
        // Count entries for this group
        const count = currentDbData.entries.filter(e => e.groupId === grp.id).length;
        const item = document.createElement('div');
        item.className = `group-item ${selectedGroupId === grp.id ? 'active' : ''}`;
        item.style.paddingLeft = `${12 + grp.depth * 14}px`;

        const iconSvg = grp.isRecycleBin 
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

        item.innerHTML = `
            <div class="group-item-left">
                ${iconSvg}
                <span>${escapeHtml(grp.name)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
                <span class="group-badge">${count}</span>
                ${!grp.isRoot && !grp.isRecycleBin ? `
                    <button class="btn-icon delete-grp-btn" data-id="${grp.id}" title="Excluir Grupo" style="width: 20px; height: 20px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.delete-grp-btn')) return;
            selectedGroupId = grp.id;
            renderGroups();
            renderEntries();
        });

        const deleteBtn = item.querySelector('.delete-grp-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Deseja realmente excluir o grupo "${grp.name}" e todas as suas entradas?`)) {
                    await handleDeleteGroup(grp.id);
                }
            });
        }

        groupsContainer.appendChild(item);
    });
}

// ==========================================
// Rendering Entries Table
// ==========================================
function renderEntries() {
    if (!currentDbData) return;

    let filtered = currentDbData.entries;

    // Filter by group
    if (selectedGroupId !== 'ALL') {
        filtered = filtered.filter(e => e.groupId === selectedGroupId);
        const groupObj = currentDbData.flatGroups.find(g => g.id === selectedGroupId);
        currentGroupTitle.textContent = groupObj ? groupObj.name : 'Grupo';
    } else {
        currentGroupTitle.textContent = 'Todas as Senhas';
    }

    // Filter by search
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(e => 
            (e.title && e.title.toLowerCase().includes(q)) ||
            (e.username && e.username.toLowerCase().includes(q)) ||
            (e.url && e.url.toLowerCase().includes(q)) ||
            (e.notes && e.notes.toLowerCase().includes(q))
        );
    }

    currentGroupSubtitle.textContent = `${filtered.length} entrada${filtered.length === 1 ? '' : 's'}`;

    entriesTbody.innerHTML = '';

    if (filtered.length === 0) {
        entriesTable.style.display = 'none';
        emptyState.style.display = 'flex';
        if (searchQuery.trim()) {
            document.getElementById('emptyStateTitle').textContent = 'Nenhum resultado';
            document.getElementById('emptyStateDesc').textContent = `Nenhuma entrada encontrada para "${searchQuery}".`;
            btnEmptyAddEntry.style.display = 'none';
        } else {
            document.getElementById('emptyStateTitle').textContent = 'Nenhuma senha encontrada';
            document.getElementById('emptyStateDesc').textContent = 'Este grupo ainda não possui entradas. Clique no botão abaixo para adicionar uma.';
            btnEmptyAddEntry.style.display = 'inline-flex';
        }
        return;
    }

    entriesTable.style.display = 'table';
    emptyState.style.display = 'none';

    filtered.forEach(entry => {
        const isRevealed = visiblePasswords.has(entry.id);
        const tr = document.createElement('tr');
        tr.className = 'entry-row';

        tr.innerHTML = `
            <td>
                <div class="entry-title-cell">
                    <div class="entry-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v4l3 3"></path>
                        </svg>
                    </div>
                    <div>
                        <div>${escapeHtml(entry.title || 'Sem título')}</div>
                        ${entry.groupName && selectedGroupId === 'ALL' ? `<span style="font-size: 11px; color: var(--text-dim);">${escapeHtml(entry.groupName)}</span>` : ''}
                    </div>
                </div>
            </td>
            <td>
                ${entry.username ? `
                    <button class="copy-field-btn copy-username-btn" data-username="${escapeHtml(entry.username)}" title="Clique para copiar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>${escapeHtml(entry.username)}</span>
                    </button>
                ` : '<span style="color: var(--text-dim);">-</span>'}
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="${isRevealed ? '' : 'pwd-masked'}" style="font-size: 13px;">
                        ${isRevealed ? escapeHtml(entry.password || '') : '••••••••••••'}
                    </span>
                    <button class="btn-icon toggle-row-pwd" data-id="${entry.id}" title="${isRevealed ? 'Ocultar' : 'Visualizar'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${isRevealed
                                ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'}
                        </svg>
                    </button>
                    <button class="btn-icon copy-pwd-btn" data-pwd="${escapeHtml(entry.password || '')}" title="Copiar Senha">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
            </td>
            <td>
                ${entry.url ? `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="copy-field-btn open-url-btn" data-url="${escapeHtml(entry.url)}" title="Abrir no navegador">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            <span>${escapeHtml(entry.url)}</span>
                        </button>
                    </div>
                ` : '<span style="color: var(--text-dim);">-</span>'}
            </td>
            <td style="text-align: right;">
                <div class="actions-cell" style="justify-content: flex-end;">
                    <button class="btn-icon edit-entry-btn" data-id="${entry.id}" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete-entry-btn" data-id="${entry.id}" title="Excluir" style="color: #f87171;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        // Event listeners for row buttons
        const copyUserBtn = tr.querySelector('.copy-username-btn');
        if (copyUserBtn) {
            copyUserBtn.addEventListener('click', async () => {
                await window.kdbxAPI.copyToClipboard(entry.username, false);
                showToast('Nome de usuário copiado!');
            });
        }

        const togglePwdBtn = tr.querySelector('.toggle-row-pwd');
        if (togglePwdBtn) {
            togglePwdBtn.addEventListener('click', () => {
                if (visiblePasswords.has(entry.id)) {
                    visiblePasswords.delete(entry.id);
                } else {
                    visiblePasswords.add(entry.id);
                }
                renderEntries();
            });
        }

        const copyPwdBtn = tr.querySelector('.copy-pwd-btn');
        if (copyPwdBtn) {
            copyPwdBtn.addEventListener('click', async () => {
                await window.kdbxAPI.copyToClipboard(entry.password, true);
                showToast('Senha copiada! (Limpeza em 30s)');
            });
        }

        const openUrlBtn = tr.querySelector('.open-url-btn');
        if (openUrlBtn) {
            openUrlBtn.addEventListener('click', () => {
                window.kdbxAPI.openExternal(entry.url);
            });
        }

        const editBtn = tr.querySelector('.edit-entry-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                openEditEntryModal(entry);
            });
        }

        const deleteBtn = tr.querySelector('.delete-entry-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Deseja realmente excluir a entrada "${entry.title}"?`)) {
                    await handleDeleteEntry(entry.id);
                }
            });
        }

        entriesTbody.appendChild(tr);
    });
}

// Search input
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderEntries();
});

// ==========================================
// Entry Modal (Add / Edit)
// ==========================================
function populateGroupSelect(selectedId) {
    entryGroupSelect.innerHTML = '';
    currentDbData.flatGroups.forEach(grp => {
        const opt = document.createElement('option');
        opt.value = grp.id;
        opt.textContent = `${'— '.repeat(grp.depth)}${grp.name}`;
        if (grp.id === selectedId) {
            opt.selected = true;
        }
        entryGroupSelect.appendChild(opt);
    });
}

function openNewEntryModal() {
    entryModalTitle.textContent = 'Nova Senha';
    entryEditId.value = '';
    entryTitleInput.value = '';
    entryUsernameInput.value = '';
    entryPasswordInput.value = '';
    entryUrlInput.value = '';
    entryNotesInput.value = '';

    const defaultGroupId = selectedGroupId !== 'ALL' ? selectedGroupId : currentDbData.rootGroup.id;
    populateGroupSelect(defaultGroupId);
    updateStrengthIndicator();
    pwdGeneratorBox.style.display = 'none';

    entryModal.classList.add('active');
    entryTitleInput.focus();
}

function openEditEntryModal(entry) {
    entryModalTitle.textContent = 'Editar Senha';
    entryEditId.value = entry.id;
    entryTitleInput.value = entry.title || '';
    entryUsernameInput.value = entry.username || '';
    entryPasswordInput.value = entry.password || '';
    entryUrlInput.value = entry.url || '';
    entryNotesInput.value = entry.notes || '';

    populateGroupSelect(entry.groupId);
    updateStrengthIndicator();
    pwdGeneratorBox.style.display = 'none';

    entryModal.classList.add('active');
    entryTitleInput.focus();
}

function closeEntryModal() {
    entryModal.classList.remove('active');
}

btnOpenNewEntry.addEventListener('click', openNewEntryModal);
btnEmptyAddEntry.addEventListener('click', openNewEntryModal);
btnCloseEntryModal.addEventListener('click', closeEntryModal);
btnCancelEntryModal.addEventListener('click', closeEntryModal);

btnToggleEntryPwd.addEventListener('click', () => {
    const isPwd = entryPasswordInput.type === 'password';
    entryPasswordInput.type = isPwd ? 'text' : 'password';
});

entryPasswordInput.addEventListener('input', updateStrengthIndicator);

// Generator
btnToggleGenerator.addEventListener('click', () => {
    const isHidden = pwdGeneratorBox.style.display === 'none';
    pwdGeneratorBox.style.display = isHidden ? 'flex' : 'none';
});

genLengthSlider.addEventListener('input', (e) => {
    genLengthDisplay.textContent = e.target.value;
});

btnGeneratePwdNow.addEventListener('click', () => {
    const generated = generateStrongPassword();
    entryPasswordInput.value = generated;
    entryPasswordInput.type = 'text';
    updateStrengthIndicator();
    showToast('Nova senha gerada!', 'info');
});

// Save Entry
btnSaveEntryModal.addEventListener('click', async () => {
    const title = entryTitleInput.value.trim();
    if (!title) {
        alert('Por favor, informe o título da entrada.');
        entryTitleInput.focus();
        return;
    }

    const entryData = {
        groupId: entryGroupSelect.value,
        title: title,
        username: entryUsernameInput.value.trim(),
        password: entryPasswordInput.value,
        url: entryUrlInput.value.trim(),
        notes: entryNotesInput.value.trim()
    };

    const editId = entryEditId.value;
    try {
        let res;
        if (editId) {
            res = await window.kdbxAPI.updateEntry(editId, entryData);
        } else {
            res = await window.kdbxAPI.addEntry(entryData);
        }

        if (res.success) {
            currentDbData = res.data;
            closeEntryModal();
            updateUnsavedBadge();
            renderGroups();
            renderEntries();
            showToast(editId ? 'Entrada atualizada!' : 'Entrada adicionada!');
        } else {
            alert(res.error || 'Erro ao salvar entrada.');
        }
    } catch (err) {
        alert(err.message || 'Erro inesperado.');
    }
});

async function handleDeleteEntry(id) {
    try {
        const res = await window.kdbxAPI.deleteEntry(id);
        if (res.success) {
            currentDbData = res.data;
            updateUnsavedBadge();
            renderGroups();
            renderEntries();
            showToast('Entrada excluída com sucesso.');
        } else {
            alert(res.error || 'Erro ao excluir entrada.');
        }
    } catch (err) {
        alert(err.message || 'Erro ao excluir entrada.');
    }
}

// ==========================================
// Group Modal (Add)
// ==========================================
function openNewGroupModal() {
    groupParentSelect.innerHTML = '';
    currentDbData.flatGroups.forEach(grp => {
        if (!grp.isRecycleBin) {
            const opt = document.createElement('option');
            opt.value = grp.id;
            opt.textContent = `${'— '.repeat(grp.depth)}${grp.name}`;
            groupParentSelect.appendChild(opt);
        }
    });

    groupNameInput.value = '';
    groupModal.classList.add('active');
    groupNameInput.focus();
}

function closeGroupModal() {
    groupModal.classList.remove('active');
}

btnOpenNewGroup.addEventListener('click', openNewGroupModal);
btnSidebarAddGroup.addEventListener('click', openNewGroupModal);
btnCloseGroupModal.addEventListener('click', closeGroupModal);
btnCancelGroupModal.addEventListener('click', closeGroupModal);

btnSaveGroupModal.addEventListener('click', async () => {
    const name = groupNameInput.value.trim();
    if (!name) {
        alert('Por favor, informe o nome do grupo.');
        groupNameInput.focus();
        return;
    }

    const parentId = groupParentSelect.value;
    try {
        const res = await window.kdbxAPI.addGroup(parentId, name);
        if (res.success) {
            currentDbData = res.data;
            closeGroupModal();
            updateUnsavedBadge();
            renderGroups();
            showToast('Grupo criado com sucesso!');
        } else {
            alert(res.error || 'Erro ao criar grupo.');
        }
    } catch (err) {
        alert(err.message || 'Erro inesperado.');
    }
});

async function handleDeleteGroup(id) {
    try {
        const res = await window.kdbxAPI.deleteGroup(id);
        if (res.success) {
            currentDbData = res.data;
            if (selectedGroupId === id) {
                selectedGroupId = 'ALL';
            }
            updateUnsavedBadge();
            renderGroups();
            renderEntries();
            showToast('Grupo excluído.');
        } else {
            alert(res.error || 'Erro ao excluir grupo.');
        }
    } catch (err) {
        alert(err.message || 'Erro ao excluir grupo.');
    }
}

// ==========================================
// Create New Database Modal
// ==========================================
btnOpenCreateDbModal.addEventListener('click', () => {
    createDbErrorBanner.style.display = 'none';
    newDbNameInput.value = 'Minhas Senhas';
    newDbFilePathInput.value = '';
    newDbPasswordInput.value = '';
    newDbPasswordConfirmInput.value = '';
    createDbModal.classList.add('active');
});

function closeCreateDbModal() {
    createDbModal.classList.remove('active');
}

btnCloseCreateDbModal.addEventListener('click', closeCreateDbModal);
btnCancelCreateDbModal.addEventListener('click', closeCreateDbModal);

btnChooseNewDbLocation.addEventListener('click', async () => {
    const savePath = await window.kdbxAPI.selectSavePath({ defaultName: 'Database.kdbx' });
    if (savePath) {
        newDbFilePathInput.value = savePath;
    }
});

btnConfirmCreateDb.addEventListener('click', async () => {
    const dbName = newDbNameInput.value.trim() || 'Minhas Senhas';
    const filePath = newDbFilePathInput.value.trim();
    const pwd1 = newDbPasswordInput.value;
    const pwd2 = newDbPasswordConfirmInput.value;

    if (!filePath) {
        showCreateDbError('Por favor, escolha onde salvar o novo banco (.kdbx).');
        return;
    }
    if (!pwd1) {
        showCreateDbError('A senha mestra não pode ser vazia.');
        return;
    }
    if (pwd1 !== pwd2) {
        showCreateDbError('A confirmação de senha não coincide com a senha mestra.');
        return;
    }

    createDbErrorBanner.style.display = 'none';
    btnConfirmCreateDb.disabled = true;
    btnConfirmCreateDb.textContent = 'Criando...';

    try {
        const res = await window.kdbxAPI.createDatabase(filePath, dbName, pwd1);
        if (!res.success) {
            showCreateDbError(res.error || 'Erro ao criar base de dados.');
            return;
        }

        currentDbData = res.data;
        closeCreateDbModal();
        showDashboard();
        showToast('Novo banco KeePass criado e aberto!');
    } catch (err) {
        showCreateDbError(err.message || 'Erro inesperado ao criar base.');
    } finally {
        btnConfirmCreateDb.disabled = false;
        btnConfirmCreateDb.textContent = 'Criar e Abrir';
    }
});

function showCreateDbError(msg) {
    createDbErrorBanner.textContent = msg;
    createDbErrorBanner.style.display = 'block';
}

// Utility: HTML Escaping
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Start app
init();
