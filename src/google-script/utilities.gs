// Configuration
const CONFIG = {
  EMAIL_SENDER: 'notificaciones@notificacionesbcp.com.pe',
};

// IANA timezone for every emitted date string and for interpreting BCP's local
// timestamps. Keep this in sync with "timeZone" in appsscript.json.
const SCRIPT_TZ = 'America/Lima';

// Movement types matching the PFMG front-end
const MovementType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  TRANSFER: 'TRANSFER'
};

/**
 * Create base movement object.
 * Fields filled in later:
 *   rawType                         -> parseTransaction()
 *   messageId, subject, emailDateLocal -> collectMovements()
 */
function createBaseMovement() {
  return {
    payee: '',                       // Company name / description
    amount: 0,                       // Transaction amount (signed)
    currency: 'PEN',                 // PEN or USD
    date: new Date().toISOString(),  // Transaction date/time, ISO-8601 UTC (legacy)
    transactionDateLocal: null,      // 'yyyy-MM-ddTHH:mm:ss' in SCRIPT_TZ
    type: MovementType.EXPENSE,      // EXPENSE, INCOME, or TRANSFER
    operationNumber: null,           // Bank operation number
    cardLast4: null,                 // Last 4 digits of the card, if present
    rawType: null                    // Parser that produced this movement
  };
}

/**
 * Helper function to extract fields common to every BCP notification.
 */
function extractCommonFields(body, emailDate) {
  const fields = {};

  // Date and time — BCP uses "06 de enero de 2026 - 03:29 PM"
  const dateMatch = body.match(/(\d{2})\s+de\s+(\w+)\s+de\s+(\d{4})\s*-\s*(\d{2}):(\d{2})\s*(AM|PM)/i);
  const dateObj = dateMatch ? parseSpanishDateObj(dateMatch[0]) : emailDate;
  fields.date = dateObj.toISOString();
  fields.transactionDateLocal = Utilities.formatDate(dateObj, SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ss");

  // Operation number
  const opNumMatch = body.match(/Número\s+de\s+operación\s*(\d+)/i);
  fields.operationNumber = opNumMatch ? opNumMatch[1] : null;

  // Currency from an explicit "Moneda" field
  const monedaMatch = body.match(/Moneda\s+(Soles|Dólares)/i);
  if (monedaMatch) {
    fields.currency = monedaMatch[1].toLowerCase() === 'soles' ? 'PEN' : 'USD';
  }

  // Card last-4, if the email references a specific card
  fields.cardLast4 = extractCardLast4(body);

  return fields;
}

/**
 * Extract the last 4 digits of the card referenced in a BCP notification.
 * Runs against the cleaned body (asterisks already stripped), so patterns that
 * relied on "****1234" also appear as "... 1234".
 * Formats seen:
 *   "Número de Tarjeta de Débito *************6865*"  -> "... Debito 6865"
 *   "Tarjeta de Crédito terminada en 1234"
 */
function extractCardLast4(body) {
  const patterns = [
    /Tarjeta[^\d]{0,40}?terminada en\s*(\d{4})/i,
    /N[úu]mero de Tarjeta[^\d]{0,40}?(\d{4})\b/i,
    /Tarjeta[^\d]{0,20}\*+\s*(\d{4})/i,
    /\*{2,}\s*(\d{4})\b/
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = body.match(patterns[i]);
    if (m) return m[1];
  }
  return null;
}

/**
 * Parse BCP's Spanish date format to a Date built in the script timezone
 * (appsscript.json -> America/Lima).
 */
function parseSpanishDateObj(dateStr) {
  const months = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };

  const match = dateStr.match(/(\d{2})\s+de\s+(\w+)\s+de\s+(\d{4})\s*-\s*(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    return new Date();
  }

  const day = parseInt(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = parseInt(match[3]);
  let hour = parseInt(match[4]);
  const minute = parseInt(match[5]);
  const ampm = match[6].toUpperCase();

  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }

  return new Date(year, month, day, hour, minute);
}

/**
 * Parse Spanish date format to an ISO string (kept for backwards compatibility).
 */
function parseSpanishDate(dateStr) {
  return parseSpanishDateObj(dateStr).toISOString();
}

/**
 * Clean extracted text by removing leading/trailing asterisks and extra whitespace
 */
function cleanExtractedText(text) {
  if (!text) return text;

  let cleaned = text.trim();

  while (cleaned.startsWith('*')) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('*')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  return cleaned.trim();
}

/**
 * Clean email body from unnecessary formatting characters
 */
function cleanEmailBody(body) {
  let cleanBody = body.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  cleanBody = cleanBody.replace(/&nbsp;/g, ' ')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&amp;/g, '&')
                       .replace(/&quot;/g, '"')
                       .replace(/&#39;/g, "'");

  return cleanBody;
}

/**
 * Clean email body for matching patterns (removes asterisks, extra spaces, etc.)
 */
function cleanForMatching(body) {
  let cleanBody = body.replace(/\*/g, '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  return cleanBody;
}
