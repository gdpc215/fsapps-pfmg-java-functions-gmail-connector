/**
 * Collect and parse BCP notification emails received in the window [sinceMs, untilMs].
 * Returns a plain object ready to be serialised as the Web App JSON response.
 *
 * Shape:
 * {
 *   ok: true,
 *   generatedAt, since, until,          // ISO-8601 in SCRIPT_TZ
 *   count,                              // parsed movements
 *   movements: [ {
 *     messageId, subject, rawType,
 *     type,                             // EXPENSE | INCOME | TRANSFER
 *     payee, amount,                    // amount already signed (bank convention)
 *     currency,                         // PEN | USD
 *     operationNumber, cardLast4,
 *     transactionDateLocal,            // 'yyyy-MM-ddTHH:mm:ss' in SCRIPT_TZ
 *     emailDateLocal,
 *     date                             // ISO-8601 UTC (legacy field)
 *   } ],
 *   unparsed: [ { messageId, subject, reason } ]
 * }
 */
function collectMovements(sinceMs, untilMs) {
  var movements = [];
  var unparsed = [];

  // Gmail's after:/before: operators are day-granular, so widen the search by a day
  // on each side and then filter precisely by each message's received timestamp.
  var afterStr = Utilities.formatDate(new Date(sinceMs - 86400000), SCRIPT_TZ, 'yyyy/MM/dd');
  var beforeStr = Utilities.formatDate(new Date(untilMs + 86400000), SCRIPT_TZ, 'yyyy/MM/dd');
  var query = 'from:' + CONFIG.EMAIL_SENDER + ' after:' + afterStr + ' before:' + beforeStr;

  var threads = GmailApp.search(query);
  Logger.log('Gmail query "' + query + '" matched ' + threads.length + ' thread(s)');

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      var receivedMs = message.getDate().getTime();
      if (receivedMs < sinceMs || receivedMs > untilMs) return;

      var subject = message.getSubject();
      var messageId = message.getId();

      try {
        var plainBody = message.getPlainBody();
        var htmlBody = message.getBody();
        var movement = parseTransaction(subject, plainBody, htmlBody, message.getDate());

        if (movement) {
          movement.messageId = messageId;
          movement.subject = subject;
          movement.emailDateLocal =
            Utilities.formatDate(message.getDate(), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ss");
          movements.push(movement);
        } else {
          unparsed.push({ messageId: messageId, subject: subject, reason: 'no parser matched' });
        }
      } catch (err) {
        unparsed.push({
          messageId: messageId,
          subject: subject,
          reason: String((err && err.message) || err)
        });
      }
    });
  });

  return {
    ok: true,
    generatedAt: Utilities.formatDate(new Date(), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    since: Utilities.formatDate(new Date(sinceMs), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    until: Utilities.formatDate(new Date(untilMs), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    count: movements.length,
    movements: movements,
    unparsed: unparsed
  };
}
