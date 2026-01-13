/**
 * Parse transaction from email content
 */
function parseTransaction(subject, plainBody, htmlBody, emailDate) {
  // Create cleaned version for pattern matching
  const cleanedForMatching = cleanForMatching(plainBody);
  
  // Validate name contains "Genaro" before trying any parser
  const nameMatch = cleanedForMatching.match(/Hola\s+([^,]+),/);
  if (!nameMatch || !nameMatch[1].includes('Genaro')) {
    Logger.log('Skipping email: name does not contain "Genaro"');
    return null;
  }
  
  // Try different parsers based on transaction type
  const parsers = [
    parsePagoTarjeta,
    parsePagoAutomatico,
    parseRetiro,
    parseConsumo,
    parseYapeo,
    parseTransferencia,
    parseGenericMovement
  ];
  
  for (const parser of parsers) {
    try {
      // Pass both original and cleaned versions
      const transaction = parser(subject, plainBody, cleanedForMatching, emailDate);
      if (transaction) {
        Logger.log(transaction);
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
 */
function parsePagoTarjeta(subject, body, cleanBody, emailDate) {
  if (!cleanBody.toLowerCase().includes('pago a tu tarjeta') && !subject.toLowerCase().includes('pago de tarjeta')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.INCOME;
  
  // Use original body for extraction to preserve exact text
  const pagadoMatch = body.match(/Pagado\s+a\s+([^\n\r]+)/);
  if (pagadoMatch) {
    movement.payee = cleanExtractedText(pagadoMatch[1]);
  } else {
    movement.payee = 'Pago de tarjeta de crédito propia';
  }
  
  // Use cleanBody for amount matching
  const amountMatch = cleanBody.match(/pago.*de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Pago Automático" (Automatic payment)
 */
function parsePagoAutomatico(subject, body, cleanBody, emailDate) {
  if (!cleanBody.toLowerCase().includes('pago automático') && !subject.toLowerCase().includes('pago automático')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.EXPENSE;
  
  const empresaMatch = body.match(/Empresa\s+([^\n\r]+)/);
  if (empresaMatch) {
    movement.payee = cleanExtractedText(empresaMatch[1]);
  } else {
    const servicioMatch = body.match(/servicio\s+([^\n\r]+)/i);
    movement.payee = servicioMatch ? cleanExtractedText(servicioMatch[1]) : 'Pago automático';
  }
  
  const amountMatch = cleanBody.match(/Total\s+transferido\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Retiro" (Withdrawal) transactions
 */
function parseRetiro(subject, body, cleanBody, emailDate) {
  if (!cleanBody.includes('retiro') && !subject.toLowerCase().includes('retiro')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.EXPENSE;
  
  const canalMatch = cleanBody.match(/(?:en un |en un )(Agente BCP|cajero automático BCP)/i);
  movement.payee = canalMatch ? `Retiro - ${canalMatch[1]}` : 'Retiro';
  
  const amountMatch = cleanBody.match(/retiro\s+de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Consumo" (Card consumption) transactions
 */
function parseConsumo(subject, body, cleanBody, emailDate) {
  if (!cleanBody.includes('consumo') && !subject.toLowerCase().includes('consumo')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.EXPENSE;
  
  // Extract from original body to preserve asterisks in merchant name
  const empresaMatch = body.match(/Empresa\s+([^\n\r]+)/);
  if (empresaMatch) {
    movement.payee = cleanExtractedText(empresaMatch[1]);
  } else {
    const merchantMatch = body.match(/en\s+([^\.]+)\./);
    movement.payee = merchantMatch ? cleanExtractedText(merchantMatch[1]) : 'Consumo';
  }
  
  // Try multiple patterns for amount extraction
  // Pattern 1: "consumo de S/ 60.00" or "consumo de USD 60.00"
  let amountMatch = cleanBody.match(/consumo\s+de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  
  // Pattern 2: "consumo de $ 15.25" (dollar sign format)
  if (!amountMatch) {
    amountMatch = cleanBody.match(/consumo\s+de\s+\$\s*([\d,]+\.\d{2})/i);
    if (amountMatch) {
      // $ symbol = USD
      movement.currency = 'USD';
      movement.amount = -Math.abs(parseFloat(amountMatch[1].replace(/,/g, '')));
    }
  } else {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Yapeo" (Mobile payment) transactions
 */
function parseYapeo(subject, body, cleanBody, emailDate) {
  if (!cleanBody.toLowerCase().includes('yapeo') && !subject.toLowerCase().includes('yapeo')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.TRANSFER;
  
  const recipientMatch = body.match(/Enviado\s+a\s+([^\n\r]+)/);
  if (recipientMatch) {
    movement.payee = cleanExtractedText(recipientMatch[1].split('\n')[0]);
  } else {
    movement.payee = 'Yapeo a celular';
  }
  
  const amountMatch = cleanBody.match(/yapeo.*de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Parse "Transferencia" (Transfer) transactions
 */
function parseTransferencia(subject, body, cleanBody, emailDate) {
  if (!cleanBody.toLowerCase().includes('transferencia') && !subject.toLowerCase().includes('transferencia')) {
    return null;
  }
  
  const movement = createBaseMovement();
  movement.type = MovementType.TRANSFER;
  
  const recipientMatch = body.match(/Enviado\s+a\s+([^\n\r]+)/);
  if (recipientMatch) {
    movement.payee = cleanExtractedText(recipientMatch[1].split('\n')[0]);
  } else {
    movement.payee = 'Transferencia a terceros BCP';
  }
  
  // Try multiple patterns for amount extraction
  // Pattern 1: "transferencia de S/ 1.01" or "transferencia de USD 1.01"
  let amountMatch = cleanBody.match(/transferencia\s+de\s+(S\/|USD)\s*([\d,]+\.\d{2})/i);
  
  // Pattern 2: "Monto transferido $ 652.00" (dollar sign format)
  if (!amountMatch) {
    amountMatch = cleanBody.match(/(?:Monto\s+transferido|transferencia)\s+\$\s*([\d,]+\.\d{2})/i);
    if (amountMatch) {
      // $ symbol = USD
      movement.currency = 'USD';
      movement.amount = -Math.abs(parseFloat(amountMatch[1].replace(/,/g, '')));
    }
  } else {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}

/**
 * Generic parser for other movement types
 */
function parseGenericMovement(subject, body, cleanBody, emailDate) {
  const movement = createBaseMovement();
  
  movement.payee = subject;
  
  const amountMatch = cleanBody.match(/(S\/|USD)\s*([\d,]+\.\d{2})/i);
  if (amountMatch) {
    movement.currency = amountMatch[1].trim() === 'S/' ? 'PEN' : 'USD';
    movement.amount = -Math.abs(parseFloat(amountMatch[2].replace(/,/g, '')));
  }
  
  const common = extractCommonFields(cleanBody, emailDate);
  movement.date = common.date;
  movement.operationNumber = common.operationNumber;
  if (common.currency) movement.currency = common.currency;
  
  return movement;
}