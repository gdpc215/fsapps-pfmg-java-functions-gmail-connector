// function checkEmailTrigger() {
//   const threads = GmailApp.search('from:notificaciones@notificacionesbcp.com.pe is:unread');
  
//   threads.forEach(t => {
//     const message = t.getMessages()[0];
    
//     // ⭐ Your action here:
//     Logger.log("Received email: " + message.getSubject());

//     // Mark as processed
//     t.markRead();
//   });
// }

/**
 * Main function to check for new emails
 * Can be triggered by:
 * - Time-driven trigger (every 5 minutes)
 * - Manual execution
 */
function checkEmailTrigger() {
  try {
    const threads = GmailApp.search(`from:${CONFIG.EMAIL_SENDER} is:unread`, 0, CONFIG.MAX_EMAILS_PER_RUN);
    
    Logger.log(`Found ${threads.length} unread email(s) from BCP`);
    
    threads.forEach(thread => {
      try {
        const message = thread.getMessages()[0];
        const subject = message.getSubject();
        const plainBody = message.getPlainBody();
        const htmlBody = message.getBody();
        
        Logger.log(`Processing email: ${subject}`);
        
        // Parse the transaction from email body
        const transaction = parseTransaction(subject, plainBody, htmlBody, message.getDate());
        
        if (transaction) {
          // Send to Azure Function
          const success = sendToAzureFunction(transaction);
          
          if (success) {
            thread.markRead();
            applyLabel(thread, CONFIG.PROCESS_LABEL);
            Logger.log(`Successfully processed: ${subject}`);
          } else {
            applyLabel(thread, CONFIG.ERROR_LABEL);
            Logger.log(`Failed to send to Azure Function: ${subject}`);
          }
        } else {
          Logger.log(`Could not parse transaction from: ${subject}`);
          applyLabel(thread, CONFIG.ERROR_LABEL);
        }
        
      } catch (error) {
        Logger.log(`Error processing individual email: ${error.message}`);
        applyLabel(thread, CONFIG.ERROR_LABEL);
      }
    });
    
  } catch (error) {
    Logger.log(`Error in checkEmailTrigger: ${error.message}`);
  }
}
