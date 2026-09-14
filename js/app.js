import { store } from './store.js';
import { renderDashboard, showToast } from './render.js';
import { fetchGoogleSheet, parseCSV, DEFAULT_SHEET_URL } from './sheetConnector.js';

// Ready-to-copy Google Apps Script for real-time Google Form submission webhook
const APPS_SCRIPT_SNIPPET = `/**
 * Real-time Google Form -> Gym Dashboard Webhook
 * Paste this into Extensions > Apps Script in your Google Sheet
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  Logger.log("New registration received: " + rows.length);
}

// Or publish as Web App to serve live JSON:
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Subscribe renderer to store updates
  store.subscribe(() => {
    renderDashboard();
  });

  // Initial render
  renderDashboard();

  // Setup Event Listeners
  setupSearchAndFilters();
  setupSyncHandlers();
  setupModalsAndDrawers();
  setupExport();
  setupKeyboardShortcuts();
  setupDropzone();

  // Try auto-syncing with sheet on start in background
  syncWithSheet(false);
}

/**
 * Search & Filters logic
 */
function setupSearchAndFilters() {
  const searchInput = document.getElementById('searchInput');
  const planFilter = document.getElementById('planFilter');
  const slotFilter = document.getElementById('slotFilter');
  const sortFilter = document.getElementById('sortFilter');
  const filterTabsContainer = document.getElementById('filterTabsContainer');
  const viewTableBtn = document.getElementById('viewTableBtn');
  const viewCardsBtn = document.getElementById('viewCardsBtn');

  // Search input with debounce
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        store.setFilter('search', e.target.value);
      }, 150);
    });
  }

  // Plan filter
  if (planFilter) {
    planFilter.addEventListener('change', (e) => {
      store.setFilter('plan', e.target.value);
    });
  }

  // Slot filter
  if (slotFilter) {
    slotFilter.addEventListener('change', (e) => {
      store.setFilter('slot', e.target.value);
    });
  }

  // Sort filter
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      store.setFilter('sortBy', e.target.value);
    });
  }

  // Status Tab Clicks (delegated)
  if (filterTabsContainer) {
    filterTabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.filter-tab');
      if (tab && tab.dataset.status) {
        store.setFilter('status', tab.dataset.status);
      }
    });
  }

  // View switchers
  if (viewTableBtn) {
    viewTableBtn.addEventListener('click', () => {
      viewTableBtn.classList.add('active');
      if (viewCardsBtn) viewCardsBtn.classList.remove('active');
      store.setViewMode('table');
    });
  }

  if (viewCardsBtn) {
    viewCardsBtn.addEventListener('click', () => {
      viewCardsBtn.classList.add('active');
      if (viewTableBtn) viewTableBtn.classList.remove('active');
      store.setViewMode('cards');
    });
  }
}

/**
 * Google Sheet Sync Handlers
 */
function setupSyncHandlers() {
  const syncBtn = document.getElementById('syncStatusBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  const triggerSync = () => {
    syncWithSheet(true);
  };

  if (syncBtn) syncBtn.addEventListener('click', triggerSync);
  if (refreshBtn) refreshBtn.addEventListener('click', triggerSync);
}

async function syncWithSheet(showToasts = true) {
  store.setSyncState('syncing', 'Fetching responses from Google Sheet...');
  if (showToasts) showToast('Connecting to Google Sheet...', '⏳');

  try {
    const result = await fetchGoogleSheet(store.sheetUrl);

    if (result.success && result.data && result.data.length > 0) {
      store.setMembers(result.data, result.source);
      if (showToasts) showToast(`Successfully synced ${result.data.length} responses from Google Sheet!`, '✓');
    } else {
      const errMsg = result.error || 'Unable to load sheet. Ensure sharing is "Anyone with the link can view".';
      store.setSyncState('error', errMsg);
      if (showToasts) {
        showToast(errMsg, '⚠️');
      }
    }
  } catch (err) {
    store.setSyncState('error', err.message);
    if (showToasts) showToast('Sync error: ' + err.message, '⚠️');
  }
}

/**
 * Modals & Drawer Management
 */
function setupModalsAndDrawers() {
  const drawer = document.getElementById('detailDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  const newMemberModal = document.getElementById('newMemberModal');
  const openNewMemberBtn = document.getElementById('openNewMemberBtn');
  const closeNewMemberBtn = document.getElementById('closeNewMemberBtn');

  // Close Drawer
  const closeDrawer = () => {
    store.setSelectedMember(null);
  };
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  // Table row click -> open drawer
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-member-id]');
    const card = e.target.closest('.member-card[data-member-id]');
    const openBtn = e.target.closest('.open-drawer-btn');

    if (e.target.closest('a') || e.target.closest('button:not(.open-drawer-btn)')) {
      return;
    }

    const memberId = openBtn ? openBtn.dataset.id : row ? row.dataset.memberId : card ? card.dataset.memberId : null;
    if (memberId) {
      const member = store.members.find(m => m.id === memberId);
      if (member) {
        store.setSelectedMember(member);
      }
    }
  });

  // Member Action buttons inside Drawer
  document.addEventListener('click', (e) => {
    if (e.target.id === 'renew1MonthBtn') {
      const id = e.target.dataset.id;
      store.renewMember(id, 1);
      const updated = store.members.find(m => m.id === id);
      store.setSelectedMember(updated);
      showToast('Membership renewed for +1 Month!', '🎉');
    } else if (e.target.id === 'renew3MonthBtn') {
      const id = e.target.dataset.id;
      store.renewMember(id, 3);
      const updated = store.members.find(m => m.id === id);
      store.setSelectedMember(updated);
      showToast('Membership renewed for +3 Months!', '🎉');
    } else if (e.target.id === 'markPaidBtn') {
      const id = e.target.dataset.id;
      store.updateMember(id, { paymentStatus: 'Paid' });
      const updated = store.members.find(m => m.id === id);
      store.setSelectedMember(updated);
      showToast('Payment marked as Paid!', '✓');
    } else if (e.target.id === 'deleteMemberBtn') {
      const id = e.target.dataset.id;
      if (confirm('Are you sure you want to remove this member record?')) {
        store.deleteMember(id);
        closeDrawer();
        showToast('Member removed from dashboard', '✓');
      }
    }
  });

  // Settings Modal
  openSettingsBtn.addEventListener('click', openSettingsModal);
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // Save Settings Form
  const settingsForm = document.getElementById('settingsForm');
  const sheetUrlInput = document.getElementById('sheetUrlInput');
  sheetUrlInput.value = store.sheetUrl;

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUrl = sheetUrlInput.value.trim();
    if (newUrl) {
      store.setSheetUrl(newUrl);
      closeSettingsModal();
      showToast('Google Sheet URL saved! Testing sync...', '✓');
      syncWithSheet(true);
    }
  });

  // Reset to Demo button
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  if (resetDemoBtn) {
    resetDemoBtn.addEventListener('click', () => {
      if (confirm('Reset dashboard data to the initial Google Form response dataset?')) {
        store.resetToDemo();
        closeSettingsModal();
        showToast('Reset to demo Google Form responses', '✓');
      }
    });
  }

  // Copy Apps Script Code
  const copyScriptBtn = document.getElementById('copyScriptBtn');
  const scriptCodeBlock = document.getElementById('scriptCodeBlock');
  if (copyScriptBtn && scriptCodeBlock) {
    scriptCodeBlock.textContent = APPS_SCRIPT_SNIPPET;
    copyScriptBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET).then(() => {
        showToast('Apps Script code copied to clipboard!', '📋');
      });
    });
  }

  // Walk-in / New Member Modal
  if (openNewMemberBtn) {
    openNewMemberBtn.addEventListener('click', () => {
      newMemberModal.classList.add('open');
    });
  }
  closeNewMemberBtn.addEventListener('click', () => {
    newMemberModal.classList.remove('open');
  });
  newMemberModal.addEventListener('click', (e) => {
    if (e.target === newMemberModal) newMemberModal.classList.remove('open');
  });

  const newMemberForm = document.getElementById('newMemberForm');
  newMemberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(newMemberForm);
    const plan = formData.get('plan');
    
    const newMember = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      email: formData.get('email') || '—',
      age: formData.get('age') ? parseInt(formData.get('age')) : '—',
      gender: formData.get('gender') || '—',
      plan: plan,
      fitnessGoal: formData.get('fitnessGoal'),
      preferredSlot: formData.get('preferredSlot'),
      paymentStatus: formData.get('paymentStatus') || 'Paid',
      feeAmount: parseInt(formData.get('feeAmount')) || 2000,
      emergencyContact: formData.get('emergencyContact') || '—',
      medicalNotes: formData.get('medicalNotes') || 'None',
      status: plan.toLowerCase().includes('trial') ? 'lead' : 'active',
      expiryDate: calculateNewExpiry(plan),
      daysRemaining: 30,
      notes: 'Manually added walk-in entry'
    };

    store.addMember(newMember);
    newMemberForm.reset();
    newMemberModal.classList.remove('open');
    showToast(`Added new member: ${newMember.fullName}`, '✓');
  });
}

function openSettingsModal() {
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('open');
}

function calculateNewExpiry(plan) {
  const date = new Date();
  let months = 1;
  if (plan.includes('3 Month')) months = 3;
  if (plan.includes('6 Month')) months = 6;
  if (plan.includes('Year') || plan.includes('Annual')) months = 12;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

/**
 * Drag & Drop CSV Importer
 */
function setupDropzone() {
  const dropzone = document.getElementById('csvDropzone');
  const fileInput = document.getElementById('csvFileInput');

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleCsvFile(e.target.files[0]);
    }
  });
}

function handleCsvFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const parsed = parseCSV(text);
    if (parsed.length > 0) {
      store.setMembers(parsed, file.name);
      closeSettingsModal();
      showToast(`Imported ${parsed.length} member records from ${file.name}!`, '✓');
    } else {
      showToast('Could not find member rows in this CSV.', '⚠️');
    }
  };
  reader.readAsText(file);
}

/**
 * Export data to CSV
 */
function setupExport() {
  const exportBtn = document.getElementById('exportBtn');
  if (!exportBtn) return;
  exportBtn.addEventListener('click', () => {
    const list = store.getFilteredMembers();
    if (list.length === 0) {
      showToast('No records to export.', 'ℹ️');
      return;
    }

    const headers = ['Timestamp', 'Full Name', 'Phone', 'Email', 'Age', 'Gender', 'Plan', 'Fitness Goal', 'Slot', 'Status', 'Expiry Date', 'Fee Amount', 'Payment Status'];
    const rows = list.map(m => [
      `"${m.timestamp || ''}"`,
      `"${m.fullName || ''}"`,
      `"${m.phone || ''}"`,
      `"${m.email || ''}"`,
      `"${m.age || ''}"`,
      `"${m.gender || ''}"`,
      `"${m.plan || ''}"`,
      `"${m.fitnessGoal || ''}"`,
      `"${m.preferredSlot || ''}"`,
      `"${m.status || ''}"`,
      `"${m.expiryDate || ''}"`,
      `"${m.feeAmount || 0}"`,
      `"${m.paymentStatus || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gym_members_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Exported ${list.length} records to CSV!`, '📥');
  });
}

/**
 * Keyboard shortcuts (/ for search, Esc to close)
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const searchInput = document.getElementById('searchInput');
    if (e.key === '/' && searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'Escape') {
      store.setSelectedMember(null);
      closeSettingsModal();
      document.getElementById('newMemberModal').classList.remove('open');
    }
  });
}
