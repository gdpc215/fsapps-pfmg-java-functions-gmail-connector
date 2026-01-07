/**
 * Setup time-based trigger (run this once manually)
 */
function setupTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkEmailTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run every 5 minutes
  ScriptApp.newTrigger('checkEmailTrigger')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('Trigger created successfully');
}

/**
 * Manual test function
 */
function testParser() {
  const testBody = `Hola Genaro Rafael,

Realizaste un consumo de S/ 60.00 con tu Tarjeta de Crédito BCP en QEMA MANCORA BAR.

Por tu seguridad, te enviamos los datos de tu operación.

Monto

Total del consumo                                    S/ 60.00


Datos de la operación

Operación realizada                          Consumo Tarjeta de Crédito

Fecha y hora                                 29 de diciembre de 2025 - 07:25 PM

Número de Tarjeta de Crédito                 ***********7385

Empresa                                      QEMA MANCORA BAR

Número de operación                          0000481573`;
  
  const result = parseTransaction('Test', testBody, testBody, new Date());
  Logger.log(JSON.stringify(result, null, 2));
}
