// Configuration
const CONFIG = {
  EMAIL_SENDER: 'notificaciones@notificacionesbcp.com.pe',
  AZURE_FUNCTION_URL: 'https://your-function-app.azurewebsites.net/api/movements/ingest', // Update with your actual endpoint
  PROCESS_LABEL: 'BCP/Processed',
  ERROR_LABEL: 'BCP/Error',
  DAYS_TO_PROCESS: 1,  // Number of days to look back (1 = today only, 2 = today + yesterday, etc.)
};

// Movement types matching your TypeScript enum
const MovementType = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  TRANSFER: 'TRANSFER'
};

/**
 * Send transaction data to Azure Function
 */
function sendToAzureFunction(transaction) {
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(transaction),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CONFIG.AZURE_FUNCTION_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode >= 200 && responseCode < 300) {
      Logger.log(`Successfully sent transaction to Azure Function: ${transaction.operationNumber}`);
      return true;
    } else {
      // Logger.log(`Azure Function returned error: ${responseCode} - ${response.getContentText()}`);
      return false;
    }
  } catch (error) {
    Logger.log(`Error sending to Azure Function: ${error.message}`);
    return false;
  }
}

/**
 * Create base movement object
 */
function createBaseMovement() {
  return {
    payee: '',              // Company name / description
    amount: 0,              // Transaction amount
    currency: 'PEN',        // PEN or USD
    date: new Date().toISOString(),  // Transaction date and time
    type: MovementType.EXPENSE,      // EXPENSE, INCOME, or TRANSFER
    operationNumber: null   // Bank operation number
  };
}

/**
 * Helper function to extract common fields
 */
function extractCommonFields(body, emailDate) {
  const fields = {};
  
  // Extract date and time - use cleaned version for matching
  const dateMatch = body.match(/(\d{2})\s+de\s+(\w+)\s+de\s+(\d{4})\s*-\s*(\d{2}):(\d{2})\s*(AM|PM)/i);
  fields.date = dateMatch ? parseSpanishDate(dateMatch[0]) : emailDate.toISOString();
  
  // Extract operation number - use cleaned version for matching
  const opNumMatch = body.match(/Número\s+de\s+operación\s*(\d+)/i);
  fields.operationNumber = opNumMatch ? opNumMatch[1] : null;
  
  // Extract currency from "Moneda" field
  const monedaMatch = body.match(/Moneda\s+(Soles|Dólares)/i);
  if (monedaMatch) {
    fields.currency = monedaMatch[1].toLowerCase() === 'soles' ? 'PEN' : 'USD';
  }
  
  return fields;
}

/**
 * Parse Spanish date format to ISO string
 */
function parseSpanishDate(dateStr) {
  const months = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  
  const match = dateStr.match(/(\d{2})\s+de\s+(\w+)\s+de\s+(\d{4})\s*-\s*(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    return new Date().toISOString();
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
  
  // Peru timezone is UTC-5
  const date = new Date(year, month, day, hour, minute);
  return date.toISOString();
}

/**
 * Clean extracted text by removing leading/trailing asterisks and extra whitespace
 */
function cleanExtractedText(text) {
  if (!text) return text;
  
  // First trim whitespace
  let cleaned = text.trim();
  
  // Remove leading and trailing asterisks (repeatedly until none left)
  while (cleaned.startsWith('*')) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('*')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  
  // Final trim to remove any whitespace that was between asterisks and content
  return cleaned.trim();
}

/**
 * Clean email body from unnecessary formatting characters
 */
function cleanEmailBody(body) {
  // Remove multiple spaces/newlines, tabs, etc.
  let cleanBody = body.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Decode HTML entities
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
  // Remove asterisks and unnecessary spaces
  let cleanBody = body.replace(/\*/g, '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  return cleanBody;
}

/**
 * Apply a label to a thread
 */
function applyLabel(thread, labelName) {
  try {
    let label = GmailApp.getUserLabelByName(labelName);
    if (!label) {
      label = GmailApp.createLabel(labelName);
    }
    thread.addLabel(label);
  } catch (error) {
    Logger.log(`Error applying label: ${error.message}`);
  }
}
