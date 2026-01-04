# BCP Gmail Connector Setup Guide

This guide will help you set up the Google Apps Script automation to monitor BCP bank transaction emails and send them to your Azure Function.

## Overview

The system consists of two parts:
1. **Google Apps Script** - Monitors Gmail for BCP transaction emails and extracts data
2. **Azure Function** - Receives the extracted transaction data and processes it

## Part 1: Google Apps Script Setup

### Step 1: Create a new Apps Script project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click **New Project**
3. Give it a name like "BCP Transaction Monitor"

### Step 2: Add the script code

1. Delete the default `function myFunction()` code
2. Copy the entire content from `src/google-automation.script`
3. Paste it into the Code.gs file

### Step 3: Configure the script

Update the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  EMAIL_SENDER: 'notificaciones@notificacionesbcp.com.pe',
  AZURE_FUNCTION_URL: 'https://YOUR-FUNCTION-APP.azurewebsites.net/api/movements/ingest',
  PROCESS_LABEL: 'BCP/Processed',
  ERROR_LABEL: 'BCP/Error',
  MAX_EMAILS_PER_RUN: 50
};
```

Replace `YOUR-FUNCTION-APP` with your actual Azure Function App name.

### Step 4: Authorize the script

1. Click the **Run** button (play icon) and select `testParser`
2. Grant the necessary permissions:
   - Read emails from Gmail
   - Modify Gmail labels
   - Connect to external services

### Step 5: Set up the trigger

Run the `setupTrigger()` function once to create a time-based trigger:

1. Select `setupTrigger` from the function dropdown
2. Click **Run**
3. This will create a trigger that runs every 5 minutes

Alternatively, you can set up the trigger manually:
1. Click the **Triggers** icon (clock) in the left sidebar
2. Click **Add Trigger**
3. Configure:
   - Choose function: `checkEmailTrigger`
   - Event source: **Time-driven**
   - Type of time-based trigger: **Minutes timer**
   - Minute interval: **Every 5 minutes**
4. Click **Save**

### Step 6: Test the script

1. Send yourself a test BCP notification email (or use existing ones)
2. Mark some BCP emails as unread
3. Run `checkEmailTrigger` manually
4. Check the **Execution log** (Ctrl+Enter) to see the results

## Part 2: Azure Function Setup

### Transaction Types Supported

The script currently parses these transaction types:

1. **Retiro** (Withdrawal) - ATM or agent withdrawals
2. **Consumo** (Card Consumption) - Credit/debit card purchases
3. **Yapeo** (Yape Payment) - Mobile payments via BCP's Yape service
4. **Transferencia** (Transfer) - Bank transfers to third parties

### Data Structure Sent to Azure

The script sends a JSON object matching your `Movement` TypeScript interface:

```json
{
  "id": "uuid-generated",
  "type": "EXPENSE|INCOME|TRANSFER",
  "accountOrCardId": "CARD_1234 or ACCOUNT_5678",
  "date": "2025-12-29T19:25:00.000Z",
  "payee": "Merchant or recipient name",
  "bankDescription": "Transaction description",
  "additionalInfo": "Additional context",
  "notes": "Channel or other notes",
  "currency": "PEN|USD",
  "amount": -60.00,
  "operationNumber": "0000481573",
  "categoryId": null,
  "subcategoryId": null,
  "isStub": false,
  "labels": ["BCP", "AUTO_IMPORTED"],
  "linkedMovementId": null,
  "targetAccountOrCardId": null
}
```

### Create Azure Function Endpoint

You need to create an HTTP-triggered Azure Function at:
`/api/movements/ingest`

Example handler structure:

```java
@FunctionName("movementIngest")
public HttpResponseMessage ingestMovement(
    @HttpTrigger(
        name = "req",
        methods = {HttpMethod.POST},
        authLevel = AuthorizationLevel.FUNCTION,
        route = "movements/ingest"
    ) HttpRequestMessage<Optional<MovementEntity>> request,
    ExecutionContext context) {
    
    MovementEntity movement = request.getBody().orElse(null);
    
    if (movement == null) {
        return request.createResponseBuilder(HttpStatus.BAD_REQUEST)
            .body("Movement data is required")
            .build();
    }
    
    context.getLogger().info("Received movement: " + movement.operationNumber);
    
    // TODO: Validate and save to database
    // movementRepository.save(movement);
    
    return request.createResponseBuilder(HttpStatus.OK)
        .body("Movement ingested successfully")
        .build();
}
```

## Monitoring and Troubleshooting

### Check Google Apps Script Logs

1. Open your Apps Script project
2. Click **Executions** (list icon) in the left sidebar
3. View execution history and any errors

### Gmail Labels

The script automatically creates and applies these labels:
- **BCP/Processed** - Successfully processed emails
- **BCP/Error** - Emails that failed processing

### Common Issues

**Issue: Script not running automatically**
- Check that the trigger is properly configured
- Verify you haven't exceeded Google's quota limits

**Issue: Cannot parse transactions**
- Check the execution log for parsing errors
- BCP may have changed their email format
- Update the regex patterns in the parser functions

**Issue: Azure Function not receiving data**
- Verify the AZURE_FUNCTION_URL is correct
- Check Azure Function logs for incoming requests
- Ensure CORS is configured if needed

**Issue: Authorization errors**
- Re-authorize the script from the Apps Script editor
- Check that all required Gmail permissions are granted

## Testing Individual Parsers

Use the `testParser()` function to test parsing logic:

```javascript
function testParser() {
  const testBody = `[paste email body here]`;
  const result = parseTransaction('Test', testBody, testBody, new Date());
  Logger.log(JSON.stringify(result, null, 2));
}
```

## Security Considerations

1. **Azure Function Authentication**: Consider using `AuthorizationLevel.FUNCTION` or `ANONYMOUS` with API key validation
2. **Data Privacy**: Transaction data contains sensitive information - ensure proper encryption in transit (HTTPS)
3. **Gmail Access**: The script has access to your Gmail - keep credentials secure
4. **Rate Limiting**: Implement rate limiting on the Azure Function to prevent abuse

## Next Steps

1. Create the Azure Function endpoint `/api/movements/ingest`
2. Create a `MovementEntity` Java class matching the TypeScript `Movement` interface
3. Implement database persistence for received movements
4. Add validation and duplicate detection (using `operationNumber`)
5. Consider adding webhook notifications for successful imports
6. Implement error handling and retry logic

## Extending the Script

### Adding New Transaction Types

To add support for new BCP email formats:

1. Create a new parser function (e.g., `parsePagoServicio`)
2. Add it to the `parsers` array in `parseTransaction()`
3. Test with sample email bodies

### Improving Parsing Accuracy

- Add more regex patterns for edge cases
- Implement machine learning for unstructured text
- Add validation rules for extracted data

### Performance Optimization

- Adjust `MAX_EMAILS_PER_RUN` based on volume
- Consider using batch API calls to Azure
- Implement caching for duplicate detection
