import { initialGymResponses } from './mockData.js';
import { DEFAULT_SHEET_URL, detectMonthsFromPlan, getPlanDurationInDays } from './sheetConnector.js';

const STORAGE_KEY = 'apex_gym_members_v1';
const SHEET_URL_KEY = 'apex_gym_sheet_url_v1';
const LAST_SYNC_KEY = 'apex_gym_last_sync_v1';

class Store {
  constructor() {
    this.members = this.loadMembers();
    this.sheetUrl = localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SHEET_URL;
    this.lastSync = localStorage.getItem(LAST_SYNC_KEY) || 'Just now';
    this.syncStatus = 'synced'; // 'synced', 'syncing', 'error'
    this.syncMessage = 'Connected to Sheet Pipeline';
    
    this.filters = {
      status: 'all',
      search: '',
      plan: 'all',
      slot: 'all',
      sortBy: 'date-desc'
    };

    this.viewMode = localStorage.getItem('apex_gym_view_mode') || 'table';
    this.selectedMember = null;
    this.subscribers = [];
  }

  loadMembers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(m => {
            const validPhone = (m.phone && m.phone !== '—') ? m.phone : (m.whatsapp && m.whatsapp !== '—') ? m.whatsapp : '—';
            const validWhatsapp = (m.whatsapp && m.whatsapp !== '—') ? m.whatsapp : validPhone;

            // Recalculate accurately based on exact plan duration in days (1m=30, 3m=90, 6m=180, 12m=360)
            const durationDays = getPlanDurationInDays(m.plan);
            let startDate = m.startDate || (m.timestamp ? m.timestamp.split(' ')[0] : new Date().toISOString().slice(0, 10));
            let startObj = new Date(startDate);
            if (isNaN(startObj.getTime())) {
              startObj = new Date();
            }
            startObj.setHours(0, 0, 0, 0);

            const expiryObj = new Date(startObj.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const expiryDate = expiryObj.toISOString().slice(0, 10);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = expiryObj.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status = 'active';
            if (String(m.plan || '').toLowerCase().includes('trial') || String(m.plan || '').toLowerCase().includes('lead')) {
              status = 'lead';
            } else if (daysRemaining < 0) {
              status = 'expired';
            } else if (daysRemaining <= 7) {
              status = 'expiring';
            }

            return {
              ...m,
              phone: validPhone,
              whatsapp: validWhatsapp,
              startDate,
              expiryDate,
              daysRemaining,
              status
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load from storage', e);
    }
    return [...initialGymResponses];
  }

  saveMembers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.members));
    } catch (e) {
      console.error('Storage save error', e);
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(fn => fn !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(fn => fn(this));
  }

  setMembers(newMembers, sourceName = 'Google Sheet') {
    this.members = newMembers;
    this.saveMembers();
    this.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.syncStatus = 'synced';
    this.syncMessage = `Synced ${newMembers.length} members from ${sourceName}`;
    localStorage.setItem(LAST_SYNC_KEY, this.lastSync);
    this.notify();
  }

  addMember(memberData) {
    const today = new Date().toISOString().slice(0, 10);
    const newMember = {
      id: `manual-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      startDate: today,
      ...memberData
    };
    this.members.unshift(newMember);
    this.saveMembers();
    this.notify();
    return newMember;
  }

  updateMember(id, patch) {
    this.members = this.members.map(m => {
      if (m.id === id) {
        return { ...m, ...patch };
      }
      return m;
    });
    this.saveMembers();
    this.notify();
  }

  renewMember(id, additionalMonths = 1) {
    const member = this.members.find(m => m.id === id);
    if (!member) return;

    const baseDate = new Date(member.daysRemaining > 0 ? member.expiryDate : new Date());
    baseDate.setHours(0, 0, 0, 0);
    const additionalDays = additionalMonths === 1 ? 30 : additionalMonths === 3 ? 90 : additionalMonths === 6 ? 180 : additionalMonths === 12 ? 360 : additionalMonths * 30;
    const newExpiryObj = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    const newExpiry = newExpiryObj.toISOString().slice(0, 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = newExpiryObj.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    this.updateMember(id, {
      expiryDate: newExpiry,
      daysRemaining,
      status: 'active',
      paymentStatus: 'Paid',
      plan: additionalMonths === 1 ? '1 Month' : additionalMonths === 3 ? '3 Months' : `${additionalMonths} Months`
    });
  }

  deleteMember(id) {
    this.members = this.members.filter(m => m.id !== id);
    if (this.selectedMember && this.selectedMember.id === id) {
      this.selectedMember = null;
    }
    this.saveMembers();
    this.notify();
  }

  resetToDemo() {
    this.members = [...initialGymResponses];
    this.saveMembers();
    this.lastSync = 'Demo Data';
    this.syncStatus = 'synced';
    this.syncMessage = 'Reset to sample Google Form responses';
    this.notify();
  }

  setSheetUrl(url) {
    this.sheetUrl = url;
    localStorage.setItem(SHEET_URL_KEY, url);
    this.notify();
  }

  setFilter(key, val) {
    this.filters[key] = val;
    this.notify();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    localStorage.setItem('apex_gym_view_mode', mode);
    this.notify();
  }

  setSelectedMember(member) {
    this.selectedMember = member;
    this.notify();
  }

  setSyncState(status, message) {
    this.syncStatus = status;
    if (message) this.syncMessage = message;
    this.notify();
  }

  getFilteredMembers() {
    let result = [...this.members];

    // Status filter
    if (this.filters.status !== 'all') {
      result = result.filter(m => m.status === this.filters.status);
    }

    // Plan filter
    if (this.filters.plan !== 'all') {
      result = result.filter(m => m.plan.toLowerCase().includes(this.filters.plan.toLowerCase()));
    }

    // Slot filter
    if (this.filters.slot !== 'all') {
      result = result.filter(m => m.preferredSlot.toLowerCase().includes(this.filters.slot.toLowerCase()));
    }

    // Search query
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      result = result.filter(m =>
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.plan && m.plan.toLowerCase().includes(q)) ||
        (m.fitnessGoal && m.fitnessGoal.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (this.filters.sortBy === 'days-asc') return (a.daysRemaining || 0) - (b.daysRemaining || 0);
      if (this.filters.sortBy === 'days-desc') return (b.daysRemaining || 0) - (a.daysRemaining || 0);
      if (this.filters.sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
      if (this.filters.sortBy === 'fee-desc') return (b.feeAmount || 0) - (a.feeAmount || 0);
      // default: date-desc (latest first)
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });

    return result;
  }

  getKPIs() {
    const total = this.members.length;
    const active = this.members.filter(m => m.status === 'active').length;
    const expiring = this.members.filter(m => m.status === 'expiring').length;
    const leads = this.members.filter(m => m.status === 'lead').length;
    const expired = this.members.filter(m => m.status === 'expired').length;

    const totalRevenue = this.members.reduce((acc, m) => acc + (m.feeAmount || 0), 0);
    const morningCount = this.members.filter(m => (m.preferredSlot || '').toLowerCase().includes('morning')).length;
    const eveningCount = this.members.filter(m => (m.preferredSlot || '').toLowerCase().includes('evening')).length;

    return {
      total,
      active,
      expiring,
      leads,
      expired,
      totalRevenue,
      morningCount,
      eveningCount
    };
  }
}

export const store = new Store();
