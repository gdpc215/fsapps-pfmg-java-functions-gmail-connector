/**
 * Manual parser test — run from the Apps Script editor and read the Execution log.
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

/**
 * Manual Web App test — simulates a request without deploying.
 * Set the API_TOKEN script property first, then run this and read the log.
 */
function testWebApp() {
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  const e = {
    parameter: {
      since: Utilities.formatDate(new Date(Date.now() - 3 * 86400000), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      until: Utilities.formatDate(new Date(), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      token: token
    }
  };
  const out = handleRequest(e);
  Logger.log(out.getContent());
}
