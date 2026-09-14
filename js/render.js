import { store } from './store.js';

// SVG Icons (Clean minimal Feather/Lucide style)
const icons = {
  users: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  checkCircle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  clock: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  rupee: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="18" y2="3"/><line x1="6" y1="8" x2="18" y2="8"/><path d="M6 13l8.5 8"/><path d="M6 13h3a4 4 0 0 0 0-8"/></svg>`,
  sun: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  whatsapp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  externalLink: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  chevronRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  rotateCw: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`
};

export function renderDashboard() {
  renderKPIs();
  renderFilterTabs();
  renderMembers();
  renderDrawer();
}



/**
 * Render Executive KPI Cards
 */
function renderKPIs() {
  const kpis = store.getKPIs();
  const container = document.getElementById('kpiGrid');

  container.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-header">
        <span>TOTAL MEMBERS</span>
        ${icons.users}
      </div>
      <div class="kpi-value">${kpis.total}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-header">
        <span>ACTIVE MEMBERS</span>
        ${icons.checkCircle}
      </div>
      <div class="kpi-value" style="color: var(--status-active-text);">${kpis.active}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-header">
        <span>EXPIRING SOON</span>
        ${icons.clock}
      </div>
      <div class="kpi-value" style="color: var(--status-expiring-text);">${kpis.expiring}</div>
      <div class="kpi-subtext">
        <span class="highlight-warn">Action:</span> Due renewal within 7 days
      </div>
    </div>
  `;
}

/**
 * Render Status Filter Tabs with dynamic counts
 */
function renderFilterTabs() {
  const kpis = store.getKPIs();
  const tabs = [
    { id: 'all', label: 'All', count: kpis.total },
    { id: 'active', label: 'Active', count: kpis.active },
    { id: 'expiring', label: 'Expiring', count: kpis.expiring },
    { id: 'lead', label: 'Leads / Trial', count: kpis.leads },
    { id: 'expired', label: 'Expired', count: kpis.expired }
  ];

  const container = document.getElementById('filterTabsContainer');
  if (!container) return;

  container.innerHTML = tabs.map(tab => `
    <button class="filter-tab ${store.filters.status === tab.id ? 'active' : ''}" data-status="${tab.id}">
      ${tab.label}
      <span class="tab-badge">${tab.count}</span>
    </button>
  `).join('');
}

/**
 * Helper to get clean initials
 */
function getInitials(name) {
  if (!name) return 'M';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Helper to generate WhatsApp URL with pre-filled message
 */
export function getWhatsAppUrl(phone, memberName, type = 'welcome') {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  let text = '';

  if (type === 'welcome') {
    text = `Hi ${memberName}! 👋 Welcome to Indian Sasi Fitness — more than a gym, your everyday escape. 💪\n\nWe’ve received your registration. Your fitness journey starts here!`;
  } else if (type === 'renewal') {
    text = `Hi ${memberName}, your gym membership renewal is coming up! Would you like us to renew your plan for you? Reply here to confirm. 🏋️‍♂️`;
  } else if (type === 'checkin') {
    text = `Hey ${memberName}! Just checking in on your workout consistency and fitness goals this week. See you at the gym! 🔥`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Render Member List (Table or Card Grid)
 */
function renderMembers() {
  const members = store.getFilteredMembers();
  const tableContainer = document.getElementById('tableContainer');
  const cardsContainer = document.getElementById('cardsContainer');

  if (store.viewMode === 'cards') {
    tableContainer.style.display = 'none';
    cardsContainer.style.display = 'grid';
    renderCards(members, cardsContainer);
  } else {
    cardsContainer.style.display = 'none';
    tableContainer.style.display = 'block';
    renderTable(members, tableContainer);
  }
}

/**
 * Clean Minimal Expiry Tag
 * - green if > 7 days
 * - yellow if <= 7 days
 * - red if <= 0 days
 */
export function renderExpiryTag(days) {
  const d = parseInt(days);
  let colorClass = 'expiry-green';
  let text = '';

  if (isNaN(d) || d <= 0) {
    colorClass = 'expiry-red';
    text = '0 days left';
  } else if (d <= 7) {
    colorClass = 'expiry-yellow';
    text = `${d} days left`;
  } else {
    colorClass = 'expiry-green';
    text = `${d} days left`;
  }

  return `<span class="expiry-tag ${colorClass}">${text}</span>`;
}

/**
 * Render Data Table View
 */
function renderTable(members, container) {
  if (members.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No matching members found</h3>
        <p>Try adjusting your search query or filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="members-table">
      <thead>
        <tr>
          <th>Member</th>
          <th>Phone Number</th>
          <th>WhatsApp Number</th>
          <th>Plan</th>
          <th>Expiry</th>
        </tr>
      </thead>
      <tbody>
        ${members.map(member => {
          const displayPhone = (member.phone && member.phone !== '—') ? member.phone : (member.whatsapp && member.whatsapp !== '—') ? member.whatsapp : '—';
          const displayWhatsapp = (member.whatsapp && member.whatsapp !== '—') ? member.whatsapp : displayPhone;

          return `
          <tr data-member-id="${member.id}">
            <td>
              <div class="member-identity">
                <div class="member-avatar">${getInitials(member.fullName)}</div>
                <div class="member-name-block">
                  <span class="member-name">
                    ${escapeHtml(member.fullName)}
                  </span>
                  <span class="member-registered-date">Registered: ${escapeHtml(member.timestamp ? member.timestamp.slice(0, 10) : '—')}</span>
                </div>
              </div>
            </td>
            <td>
              <a href="tel:${escapeHtml(displayPhone)}" class="phone-link" onclick="event.stopPropagation()">
                ${escapeHtml(displayPhone)}
              </a>
            </td>
            <td>
              <a href="${getWhatsAppUrl(displayWhatsapp, member.fullName, member.daysRemaining <= 7 ? 'renewal' : 'welcome')}" 
                 target="_blank" 
                 rel="noopener" 
                 class="whatsapp-link" 
                 title="Click to Chat on WhatsApp" 
                 onclick="event.stopPropagation()">
                ${escapeHtml(displayWhatsapp)}
              </a>
            </td>
            <td>
              <span class="pill-neutral" style="font-weight: 600; font-size: 0.8rem; padding: 0.25rem 0.6rem; color: var(--text-primary);">
                ${escapeHtml(member.plan || '1 Month')}
              </span>
            </td>
            <td>
              ${renderExpiryTag(member.daysRemaining)}
            </td>
          </tr>
        `;}).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Render Card Grid View
 */
function renderCards(members, container) {
  if (members.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No matching members found</h3>
        <p>Try adjusting your search query or filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = members.map(member => `
    <div class="member-card" data-member-id="${member.id}">
      <div class="card-top">
        <div class="member-identity">
          <div class="member-avatar">${getInitials(member.fullName)}</div>
          <div class="member-name-block">
            <span class="member-name">${escapeHtml(member.fullName)}</span>
            <span class="member-registered-date">${escapeHtml(member.phone)}</span>
          </div>
        </div>
        <span class="badge badge-${member.status}">
          ${member.status === 'active' ? `${member.daysRemaining}d left` : 
            member.status === 'expiring' ? `Due in ${member.daysRemaining}d` : 
            member.status === 'lead' ? 'Lead' : 'Expired'}
        </span>
      </div>

      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
        <span class="pill-neutral">${escapeHtml(member.plan)}</span>
        <span class="pill-neutral">${escapeHtml(member.fitnessGoal)}</span>
        <span class="pill-neutral">${escapeHtml(member.preferredSlot.split(' ')[0])}</span>
      </div>

      <div class="card-meta-row">
        <div>
          <span style="font-size: 0.7rem; color: var(--text-muted);">FEE</span>
          <div style="font-weight: 600; font-size: 0.85rem;">₹${(member.feeAmount || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <a href="${getWhatsAppUrl(member.phone, member.fullName, 'welcome')}" target="_blank" rel="noopener" class="whatsapp-btn" onclick="event.stopPropagation()">
            ${icons.whatsapp}
          </a>
          <button class="btn btn-secondary btn-sm open-drawer-btn" data-id="${member.id}">
            Details
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Render Side Drawer (Member Profile)
 */
function renderDrawer() {
  const member = store.selectedMember;
  const drawer = document.getElementById('detailDrawer');
  const backdrop = document.getElementById('drawerBackdrop');

  if (!member) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    return;
  }

  drawer.classList.add('open');
  backdrop.classList.add('open');

  const drawerContent = document.getElementById('drawerContent');
  const displayPhone = (member.phone && member.phone !== '—') ? member.phone : (member.whatsapp && member.whatsapp !== '—') ? member.whatsapp : '—';
  const displayWhatsapp = (member.whatsapp && member.whatsapp !== '—') ? member.whatsapp : displayPhone;

  drawerContent.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar-lg">${getInitials(member.fullName)}</div>
      <div>
        <h2 style="font-size: 1.25rem; font-weight: 700;">${escapeHtml(member.fullName)}</h2>
      </div>
    </div>

    <!-- Quick Actions -->
    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
      <a href="${getWhatsAppUrl(displayWhatsapp, member.fullName, member.daysRemaining <= 7 ? 'renewal' : 'welcome')}" target="_blank" rel="noopener" class="btn btn-secondary" style="flex: 1; color: var(--whatsapp-color);">
        ${icons.whatsapp} WhatsApp
      </a>
      <a href="tel:${escapeHtml(displayPhone)}" class="btn btn-secondary" style="flex: 1;">
        📞 Call
      </a>
    </div>

    <!-- Clean Key Details -->
    <div class="profile-details-list" style="grid-template-columns: 1fr; gap: 0.85rem;">
      <div>
        <div class="detail-item-label">Name</div>
        <div class="detail-item-val" style="font-size: 0.95rem;">${escapeHtml(member.fullName)}</div>
      </div>
      <div>
        <div class="detail-item-label">Phone Number</div>
        <div class="detail-item-val">
          <a href="tel:${escapeHtml(displayPhone)}" class="phone-link" style="font-size: 0.88rem; color: var(--text-primary); text-decoration: none;">
            ${escapeHtml(displayPhone)}
          </a>
        </div>
      </div>
      <div>
        <div class="detail-item-label">WhatsApp Number</div>
        <div class="detail-item-val">
          <a href="${getWhatsAppUrl(displayWhatsapp, member.fullName, member.daysRemaining <= 7 ? 'renewal' : 'welcome')}" 
             target="_blank" 
             rel="noopener" 
             class="whatsapp-link" 
             title="Click to Chat on WhatsApp">
            ${escapeHtml(displayWhatsapp)}
          </a>
        </div>
      </div>
      <div>
        <div class="detail-item-label">Plan</div>
        <div class="detail-item-val">
          <span class="pill-neutral" style="font-weight: 600; font-size: 0.85rem; padding: 0.25rem 0.65rem; color: var(--text-primary);">
            ${escapeHtml(member.plan || '1 Month')}
          </span>
        </div>
      </div>
      <div>
        <div class="detail-item-label">Expiry</div>
        <div class="detail-item-val" style="margin-top: 0.25rem;">
          ${renderExpiryTag(member.daysRemaining)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Toast Notification Helper
 */
export function showToast(message, icon = '✓') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
