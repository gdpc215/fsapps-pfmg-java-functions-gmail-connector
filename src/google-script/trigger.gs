/**
 * Main function to check for new emails
 * Can be triggered by:
 * - Time-driven trigger (every 5 minutes)
 * - Manual execution
 */
function checkEmailTrigger() {
  try {
    const daysToProcess = CONFIG.DAYS_TO_PROCESS || 1;
    
    // Calculate the start date based on DAYS_TO_PROCESS
    const startDate = new Date();
    if (daysToProcess > 1) {
      startDate.setDate(startDate.getDate() - (daysToProcess - 1));
    }
    const startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
    
    // Build search query for emails from the calculated date range
    const searchQuery = `from:${CONFIG.EMAIL_SENDER} after:${startDateStr}`; // is:unread
    
    const threads = GmailApp.search(searchQuery);
    
    Logger.log(`Found ${threads.length} email(s) from BCP in the last ${daysToProcess} day(s) (since ${startDateStr})`);
    
    processThreads(threads);
    
  } catch (error) {
    Logger.log(`Error in checkEmailTrigger: ${error.message}`);
  }
}

/**
 * Helper function to process email threads
 */
function processThreads(threads) {
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
}


