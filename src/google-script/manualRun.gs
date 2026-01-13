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
  const testBody = `Hola *Genaro Rafael,*

Realizaste un consumo de *S/ 245.05* con tu *Tarjeta de Débito BCP* en *IO*GENARO 
RAFAEL DE POM.*

Por tu seguridad, te enviamos los *datos de tu operación.*
  

*Monto*
  
Total del consumo *S/ 245.05*  
  

*Datos de la operación*
  
Operación realizada *Consumo Tarjeta de Débito* 
Fecha y hora *06 de enero de 2026 - 03:29 PM* 
Número de Tarjeta de Débito *************6865* 
Empresa *IO*GENARO RAFAEL DE POM* 
Número de operación *286036*`;
  
  const result = parseTransaction('Consumo con Tarjeta de Débito BCP', testBody, testBody, new Date());
  Logger.log(JSON.stringify(result, null, 2));
}
