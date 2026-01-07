/**
 * Parse transaction from email content
 */
function parseTransaction(subject, plainBody, htmlBody, emailDate) {
  // Validate name contains "Genaro" before trying any parser
  const nameMatch = plainBody.match(/Hola\s+([^,]+),/);
  if (!nameMatch || !nameMatch[1].includes('Genaro')) {
    Logger.log('Skipping email: name does not contain "Genaro"');
    return null;
  }
  
  // Try different parsers based on transaction type
  const parsers = [
    parsePagoTarjeta,      // Credit card payment (income)
    parsePagoAutomatico,   // Automatic bill payment
    parseRetiro,           // Withdrawal from ATM/agent
    parseConsumo,          // Credit/debit card consumption
    parseYapeo,            // Mobile payment (Yape)
    parseTransferencia,    // Transfer
    parseGenericMovement   // Fallback parser
  ];
  
  for (const parser of parsers) {
    try {
      const transaction = parser(subject, plainBody, emailDate);
      if (transaction) {
        return transaction;
      }
    } catch (error) {
      Logger.log(`Parser error: ${error.message}`);
    }
  }
  
  return null;
}

/**
 * Parse "Pago de Tarjeta de Crédito Propia" (Credit card payment)
 * This is INCOME since you're paying your credit card
 * Example: "Realizaste un pago a tu tarjeta de S/ 7110.42 desde tu Cuenta sueldo"
 */
function parsePagoTarjeta(subject, body, emailDate) {
  if (!body.toLowerCase().includes('pago a tu tarjeta') && !subject.toLowerCase().includes('pago de tarjeta')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.INCOME;
  
  // Extract payee info
  const pagadoMatch = body.match(/Pagado a\s+([^\n]+)/);
  if (pagadoMatch) {
    movement.payee = pagadoMatch[1].trim();
  } else {
    movement.payee = 'Pago de tarjeta de crédito propia';
  }
  
  // Extract amount and currency
  const amountMatch = body.match(/pago.*de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Pago Automático" (Automatic payment)
 * Example: "El Pago Automático de tu servicio favorito se realizó con éxito"
 */
function parsePagoAutomatico(subject, body, emailDate) {
  if (!body.toLowerCase().includes('pago automático') && !subject.toLowerCase().includes('pago automático')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.EXPENSE;
  
  // Extract service/company name
  const empresaMatch = body.match(/Empresa\s+([^\n]+)/);
  if (empresaMatch) {
    movement.payee = empresaMatch[1].trim();
  } else {
    const servicioMatch = body.match(/servicio\s+([^\n]+)/i);
    movement.payee = servicioMatch ? servicioMatch[1].trim() : 'Pago automático';
  }
  
  // Extract amount and currency
  const amountMatch = body.match(/Total\s+transferido\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Retiro" (Withdrawal) transactions
 * Covers: ATM withdrawals, Agent withdrawals
 * Example: "Realizaste un retiro de S/ 450.00 con tu Tarjeta de Débito BCP"
 */
function parseRetiro(subject, body, emailDate) {
  if (!body.includes('retiro') && !subject.toLowerCase().includes('retiro')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.EXPENSE;
  
  // Extract location/channel info
  const canalMatch = body.match(/(?:en un |en un )(Agente BCP|cajero automático BCP)/i);
  movement.payee = canalMatch ? `Retiro - ${canalMatch[1]}` : 'Retiro';
  
  // Extract amount and currency
  const amountMatch = body.match(/retiro de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Consumo" (Card consumption) transactions
 * Covers: Credit card, Debit card purchases
 * Example: "Realizaste un consumo de S/ 60.00 con tu Tarjeta de Crédito BCP en QEMA MANCORA BAR"
 */
function parseConsumo(subject, body, emailDate) {
  if (!body.includes('consumo') && !subject.toLowerCase().includes('consumo')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.EXPENSE;
  
  // Extract merchant/company name
  const empresaMatch = body.match(/Empresa\s+([^\n]+)/);
  if (empresaMatch) {
    movement.payee = empresaMatch[1].trim();
  } else {
    const merchantMatch = body.match(/en\s+([^\.]+)\./);
    movement.payee = merchantMatch ? merchantMatch[1].trim() : 'Consumo';
  }
  
  // Extract amount and currency
  const amountMatch = body.match(/consumo de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Yapeo" (Mobile payment) transactions
 * Example: "Realizaste un yapeo a celular de S/ 250.00 desde tu Clasica Soles"
 */
function parseYapeo(subject, body, emailDate) {
  if (!body.toLowerCase().includes('yapeo') && !subject.toLowerCase().includes('yapeo')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.TRANSFER;
  
  // Extract recipient
  const recipientMatch = body.match(/Enviado a\s+([^\n]+)/);
  if (recipientMatch) {
    movement.payee = recipientMatch[1].trim().split('\n')[0].trim();
  } else {
    movement.payee = 'Yapeo a celular';
  }
  
  // Extract amount and currency
  const amountMatch = body.match(/yapeo.*de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Transferencia" (Transfer) transactions
 * Example: "Realizaste una transferencia de S/ 1.01 desde tu Clasica"
 */
function parseTransferencia(subject, body, emailDate) {
  if (!body.toLowerCase().includes('transferencia') && !subject.toLowerCase().includes('transferencia')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.TRANSFER;
  
  // Extract recipient
  const recipientMatch = body.match(/Enviado a\s+([^\n]+)/);
  if (recipientMatch) {
    movement.payee = recipientMatch[1].trim().split('\n')[0].trim();
  } else {
    movement.payee = 'Transferencia a terceros BCP';
  }
  
  // Extract amount and currency
  const amountMatch = body.match(/transferencia de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Generic parser for other movement types
 */
function parseGenericMovement(subject, body, emailDate) {
  const movement = createBaseMovement();
  
  // Use subject as description
  movement.payee = subject;
  
  // Try to extract amount and currency
  const amountMatch = body.match(/(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1] === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(',', '')));
  }
  
  // Extract common fields
  const common = extractCommonFields(body, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}