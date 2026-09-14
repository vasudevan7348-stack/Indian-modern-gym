// Google Sheet Connector & Multi-source Sync Engine

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/12hTWm6WIPbimEjmwdz2Q_SX2FhDMBfM6VTaDd2Dzsd0/edit?resourcekey=&gid=137277096#gid=137277096';

/**
 * Parses Google Sheet URL to extract Spreadsheet ID and GID (sheet id)
 */
export function parseSheetUrl(url) {
  if (!url) return null;
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);

  return {
    id: idMatch ? idMatch[1] : null,
    gid: gidMatch ? gidMatch[1] : '0'
  };
}

/**
 * Builds export URLs from a Google Sheet URL
 */
export function buildExportUrls(url) {
  const parsed = parseSheetUrl(url);
  if (!parsed || !parsed.id) return [];

  const baseCsv = `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv&gid=${parsed.gid}`;
  const gvizCsv = `https://docs.google.com/spreadsheets/d/${parsed.id}/gviz/tq?tqx=out:csv&gid=${parsed.gid}`;
  
  // Public CORS proxies as fallbacks for browser client requests
  const proxy1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseCsv)}`;
  const proxy2 = `https://corsproxy.io/?${encodeURIComponent(baseCsv)}`;

  return [baseCsv, gvizCsv, proxy1, proxy2];
}

/**
 * Robust CSV parser that handles quotes, escaped commas and line breaks
 */
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(val => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(val => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const item = {};
    for (let c = 0; c < headers.length; c++) {
      item[headers[c]] = row[c] !== undefined ? row[c] : '';
    }
    data.push(item);
  }

  return normalizeSheetData(data, headers);
}

/**
 * Normalizes varied Google Form column titles into standardized member objects
 */
export function normalizeSheetData(rawList, headers = []) {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((row, index) => {
    // Find matching keys case-insensitively
    const findValue = (patterns, defaultVal = '') => {
      for (const pattern of patterns) {
        for (const key of Object.keys(row)) {
          if (pattern.test(key)) {
            const val = row[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      return defaultVal;
    };

    const fullName = findValue([/name/i, /full.*name/i, /member/i, /customer/i], `Member #${index + 1}`);

    // Extract Phone and WhatsApp numbers intelligently
    let rawPhone = '';
    let rawWhatsapp = '';

    for (const key of Object.keys(row)) {
      const val = row[key] !== undefined && row[key] !== null ? String(row[key]).trim() : '';
      if (!val) continue;

      if (/whatsapp/i.test(key) || /\bwa\b/i.test(key)) {
        rawWhatsapp = val;
      } else if (/phone/i.test(key) || /mobile/i.test(key) || /contact/i.test(key) || /cell/i.test(key) || /calling/i.test(key)) {
        rawPhone = val;
      }
    }

    if (!rawPhone && rawWhatsapp) rawPhone = rawWhatsapp;
    if (!rawWhatsapp && rawPhone) rawWhatsapp = rawPhone;

    // Fallback search across values for a phone-like number
    if (!rawPhone) {
      for (const key of Object.keys(row)) {
        const val = String(row[key] || '').trim();
        const digits = val.replace(/[^0-9]/g, '');
        if (digits.length >= 7 && digits.length <= 15) {
          rawPhone = val;
          rawWhatsapp = val;
          break;
        }
      }
    }

    const phone = rawPhone || '—';
    const whatsapp = rawWhatsapp || '—';
    const email = findValue([/email/i, /mail/i], '—');
    const timestamp = findValue([/timestamp/i, /date/i, /time/i], new Date().toISOString().slice(0, 10));
    const age = findValue([/age/i, /years/i], '—');
    const gender = findValue([/gender/i, /sex/i], '—');
    const plan = findValue([/plan/i, /package/i, /membership/i, /duration/i], '1 Month');
    const fitnessGoal = findValue([/goal/i, /target/i, /fitness/i, /aim/i], 'General Fitness');
    const preferredSlot = findValue([/slot/i, /time/i, /timing/i, /batch/i, /prefer/i], 'Evening (5 PM - 9 PM)');
    const paymentStatus = findValue([/payment/i, /fee/i, /status/i], 'Paid');
    const medicalNotes = findValue([/medical/i, /health/i, /condition/i, /injury/i], 'None');
    const emergencyContact = findValue([/emergency/i, /relative/i, /guardian/i], '—');

    // Calculate start, expiry, days remaining, and status
    let startDate = timestamp.includes(' ') ? timestamp.split(' ')[0] : timestamp;
    let startObj = new Date(startDate);
    if (isNaN(startObj.getTime())) {
      startObj = new Date();
    }
    startObj.setHours(0, 0, 0, 0);

    const durationDays = getPlanDurationInDays(plan);
    const expiryObj = new Date(startObj.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expiryDate = expiryObj.toISOString().slice(0, 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiryObj.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = 'active';
    if (plan.toLowerCase().includes('trial') || plan.toLowerCase().includes('lead')) {
      status = 'lead';
    } else if (daysRemaining < 0) {
      status = 'expired';
    } else if (daysRemaining <= 7) {
      status = 'expiring';
    }

    const feeAmount = calculateEstimateFee(plan);

    return {
      id: `sheet-${index + 1}-${Date.now().toString(36)}`,
      timestamp,
      fullName,
      phone,
      whatsapp,
      email,
      gender,
      age: isNaN(parseInt(age)) ? age : parseInt(age),
      plan,
      fitnessGoal,
      preferredSlot,
      status,
      startDate,
      expiryDate,
      daysRemaining,
      paymentStatus,
      feeAmount,
      emergencyContact,
      medicalNotes,
      notes: `Imported from Google Sheet row #${index + 2}`
    };
  });
}

/**
 * Maps plan name or number to exact calendar duration in days
 * 1m = 30 days
 * 3m = 90 days
 * 6m = 180 days
 * 12m = 360 days
 */
export function getPlanDurationInDays(planStr) {
  if (!planStr) return 30;
  const p = String(planStr).trim().toLowerCase();

  // Extract number from plan string if present (e.g. "3", "3 months", "6", "1", "12")
  const numMatch = p.match(/\b(\d+)\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (p.includes('year') || p.includes('annual') || num === 12) return 360;
    if (num === 6 || p.includes('half')) return 180;
    if (num === 3 || p.includes('quarter')) return 90;
    if (num === 1) return 30;
    if (num > 0 && num <= 36) return num * 30;
  }

  if (p.includes('year') || p.includes('annual')) return 360;
  if (p.includes('half')) return 180;
  if (p.includes('quarter')) return 90;
  if (p.includes('pt') || p.includes('personal')) return 90;
  if (p.includes('trial') || p.includes('day')) return 0;
  return 30;
}

export function detectMonthsFromPlan(planStr) {
  return Math.round(getPlanDurationInDays(planStr) / 30);
}

function calculateEstimateFee(planStr) {
  const p = (planStr || '').toLowerCase();
  if (p.includes('year') || p.includes('annual')) return 14000;
  if (p.includes('6 month')) return 8000;
  if (p.includes('3 month')) return 4500;
  if (p.includes('pt') || p.includes('personal')) return 12000;
  if (p.includes('trial') || p.includes('day')) return 0;
  return 1800;
}

/**
 * Attempts to fetch live Google Sheet data across multiple endpoints
 */
export async function fetchGoogleSheet(url) {
  const candidateUrls = buildExportUrls(url);
  let lastError = null;

  for (const candidate of candidateUrls) {
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, text/plain, */*'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const text = await response.text();
        if (text && (text.includes(',') || text.includes('\t')) && !text.includes('Sign in to your Google Account')) {
          const parsed = parseCSV(text);
          if (parsed.length > 0) {
            return {
              success: true,
              data: parsed,
              source: 'Google Sheet Live',
              rawRowCount: parsed.length
            };
          }
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  return {
    success: false,
    error: lastError ? lastError.message : 'Google Sheet is currently set to Private or not published to web.',
    requiresAuth: true
  };
}
