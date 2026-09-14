// Google Sheet Connector & Multi-source Sync Engine

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/12hTWm6WIPbimEjmwdz2Q_SX2FhDMBfM6VTaDd2Dzsd0/edit?resourcekey=&gid=137277096#gid=137277096';

/**
 * Parses any Google Sheet URL or ID (including /u/0/d/, /u/1/d/, /d/e/ published, and raw keys)
 */
export function parseSheetUrl(url) {
  if (!url) return null;
  const str = String(url).trim().replace(/^["']|["']$/g, '');

  // 1. Direct 25+ character Spreadsheet ID
  if (/^[a-zA-Z0-9-_]{25,}$/.test(str)) {
    return {
      id: str,
      isPublished: false,
      gid: null
    };
  }

  // 2. Published Google Sheet web link (/d/e/2PACX-.../pub...)
  const pubMatch = str.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    const gidMatch = str.match(/[#&?]gid=([0-9]+)/);
    return {
      id: pubMatch[1],
      isPublished: true,
      gid: gidMatch ? gidMatch[1] : null
    };
  }

  // 3. Standard Google Sheet URL (supports /d/ID, /spreadsheets/d/ID, /spreadsheets/u/0/d/ID, /u/1/d/ID, etc.)
  const idMatch = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = str.match(/[#&?]gid=([0-9]+)/);

  return {
    id: idMatch ? idMatch[1] : null,
    isPublished: false,
    gid: gidMatch ? gidMatch[1] : null
  };
}

/**
 * Builds export URLs from a Google Sheet URL
 */
export function buildExportUrls(url) {
  const parsed = parseSheetUrl(url);
  if (!parsed || !parsed.id) return [];

  const gidStr = parsed.gid ? parsed.gid : '0';

  if (parsed.isPublished) {
    return [
      `https://docs.google.com/spreadsheets/d/e/${parsed.id}/pub?output=csv&gid=${gidStr}`,
      `https://docs.google.com/spreadsheets/d/e/${parsed.id}/pub?output=csv`
    ];
  }

  const baseCsv = `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv&gid=${gidStr}`;
  const gvizCsv = `https://docs.google.com/spreadsheets/d/${parsed.id}/gviz/tq?tqx=out:csv&gid=${gidStr}`;

  return [baseCsv, gvizCsv];
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
 * Browser-native JSONP fetcher for Google Sheets Visualization API.
 * This completely bypasses CORS restrictions and works reliably on all deployed domains
 * (Vercel, Netlify, GitHub Pages, custom domains, etc.) without third-party proxies.
 */
export function fetchGoogleSheetViaJSONP(url) {
  return new Promise((resolve, reject) => {
    const parsed = parseSheetUrl(url);
    if (!parsed || !parsed.id || parsed.isPublished) {
      return reject(new Error('Use standard fetch for published CSV link'));
    }

    const callbackName = 'gviz_jsonp_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheet connection timed out. Ensure the sheet is shared as "Anyone with the link can view".'));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = function(response) {
      cleanup();
      try {
        if (!response) {
          return reject(new Error('Empty response received from Google Sheets.'));
        }

        if (response.status === 'error') {
          const errDetail = (response.errors && response.errors[0] && (response.errors[0].detailed_message || response.errors[0].message)) || 'Invalid sheet query';
          return reject(new Error(`Google Sheet returned error: ${errDetail}. Ensure sheet is public.`));
        }

        if (!response.table) {
          return reject(new Error('No table structure found in Google Sheet response.'));
        }

        let cols = (response.table.cols || []).map((c, i) => (c && c.label ? c.label.trim() : ''));
        let rows = response.table.rows || [];

        // If Google did not assign labels to cols (e.g. sheet headers are not frozen), use row 0 values as column titles
        const allColsEmpty = cols.length === 0 || cols.every(c => !c);
        if (allColsEmpty && rows.length > 0) {
          const headerRow = rows[0];
          if (headerRow && headerRow.c) {
            cols = headerRow.c.map((cell, i) => {
              if (!cell) return `col_${i}`;
              return String(cell.f !== undefined && cell.f !== null ? cell.f : (cell.v !== undefined && cell.v !== null ? cell.v : `col_${i}`)).trim();
            });
            rows = rows.slice(1);
          }
        } else {
          // Fill in any individual blank column headers
          cols = cols.map((c, i) => c || (response.table.cols[i] && response.table.cols[i].id) || `col_${i}`);
        }

        const rawList = [];

        for (const row of rows) {
          if (!row || !row.c) continue;
          const rowObj = {};
          let hasVal = false;

          for (let i = 0; i < cols.length; i++) {
            const cell = row.c[i];
            const colName = cols[i] || `col_${i}`;
            let val = '';
            if (cell) {
              val = (cell.f !== undefined && cell.f !== null) ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : '');
            }
            rowObj[colName] = val.trim();
            if (val.trim()) hasVal = true;
          }

          if (hasVal) {
            rawList.push(rowObj);
          }
        }

        const normalized = normalizeSheetData(rawList, cols);
        resolve({
          success: true,
          data: normalized,
          source: 'Google Sheet Live',
          rawRowCount: normalized.length
        });
      } catch (err) {
        reject(err);
      }
    };

    const gidParam = parsed.gid ? `&gid=${encodeURIComponent(parsed.gid)}` : '';
    script.src = `https://docs.google.com/spreadsheets/d/${parsed.id}/gviz/tq?tqx=responseHandler:${callbackName}${gidParam}&t=${Date.now()}`;
    script.onerror = function() {
      cleanup();
      reject(new Error('Failed to load Google Sheet. In Google Sheets, click "Share" at top-right and set General Access to "Anyone with the link can view".'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Attempts to fetch live Google Sheet data across JSONP and direct export endpoints
 */
export async function fetchGoogleSheet(url) {
  const parsed = parseSheetUrl(url);
  if (!parsed || !parsed.id) {
    return {
      success: false,
      error: 'Invalid Google Sheet URL format. Please provide a valid docs.google.com/spreadsheets link.'
    };
  }

  // 1. In browser environments: try JSONP first (100% CORS-proof and instant on deployed sites)
  if (typeof document !== 'undefined' && !parsed.isPublished) {
    try {
      const jsonpResult = await fetchGoogleSheetViaJSONP(url);
      if (jsonpResult && jsonpResult.success && jsonpResult.data && jsonpResult.data.length > 0) {
        return jsonpResult;
      }
    } catch (jsonpErr) {
      console.warn('JSONP fetch notice:', jsonpErr.message);
    }
  }

  // 2. Direct fetch fallbacks (for published web CSV links or Node runtime)
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
          const parsedData = parseCSV(text);
          if (parsedData.length > 0) {
            return {
              success: true,
              data: parsedData,
              source: 'Google Sheet Live',
              rawRowCount: parsedData.length
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
    error: lastError ? lastError.message : 'Google Sheet is currently set to Private or unreachable. Please set sharing to "Anyone with the link can view".',
    requiresAuth: true
  };
}
