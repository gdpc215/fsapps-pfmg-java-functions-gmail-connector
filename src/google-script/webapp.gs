/**
 * Web App entrypoint for the PFMG Gmail connector.
 *
 * Deploy:  Deploy > New deployment > Web app
 *          Execute as: Me
 *          Who has access: Anyone
 *
 * Required Script Properties (Project Settings > Script Properties):
 *   API_TOKEN       shared secret; callers must pass ?token=<value>
 *   ACCOUNT_HOLDER  (optional) only accept emails greeting this name ("Hola <name>,")
 *
 * GET / POST parameters:
 *   since  (required)  ISO-8601 datetime, e.g. 2026-09-01T00:00:00-05:00 or ...Z
 *   until  (optional)  ISO-8601 datetime; defaults to now
 *   token  (required)  must equal the API_TOKEN script property
 *
 * Response: application/json — see collectMovements() in trigger.gs
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var params = (e && e.parameter) || {};
  var expectedToken = PropertiesService.getScriptProperties().getProperty('API_TOKEN');

  if (!expectedToken || params.token !== expectedToken) {
    return jsonOutput({ ok: false, error: 'unauthorized' });
  }

  if (!params.since) {
    return jsonOutput({ ok: false, error: 'missing "since" parameter' });
  }

  var sinceMs = Date.parse(params.since);
  if (isNaN(sinceMs)) {
    return jsonOutput({ ok: false, error: 'invalid "since" — expected ISO-8601' });
  }

  var untilMs = params.until ? Date.parse(params.until) : Date.now();
  if (isNaN(untilMs)) {
    return jsonOutput({ ok: false, error: 'invalid "until" — expected ISO-8601' });
  }

  if (untilMs < sinceMs) {
    return jsonOutput({ ok: false, error: '"until" is before "since"' });
  }

  var payload = collectMovements(sinceMs, untilMs);
  return jsonOutput(payload);
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
