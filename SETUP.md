# BCP Gmail Connector — Setup Guide

This connector reads BCP bank transaction-notification emails from your Gmail and exposes
them as JSON to the **PFMG Angular app**, which does the deduplication, categorization and
insertion. It is a **Google Apps Script Web App** — there is no server and no database here.

```
BCP email  ──►  Gmail  ──►  Apps Script Web App (this repo)  ──►  PFMG Angular app
                            GET ?since=&until=&token=            (review + import)
```

The Java / Azure Functions scaffolding in this repo is unused legacy and is not part of this flow.

---

## Part 1 — Create the Apps Script project

### Option A — clasp (push from this repo)

1. `npm i -g @google/clasp && clasp login`
2. `clasp create --type standalone --title "PFMG BCP Connector" --rootDir src/google-script`
   (or put an existing script id into `.clasp.json`).
3. `clasp push`

`.clasp.json` already points `rootDir` at `src/google-script`; `.claspignore` restricts the push
to `appsscript.json` + `*.gs`.

### Option B — copy/paste

1. Go to <https://script.google.com/> → **New project**.
2. Create one script file per `.gs` in `src/google-script/` and paste the contents:
   `webapp.gs`, `trigger.gs`, `parsers.gs`, `utilities.gs`, `manualRun.gs`.
3. **Project Settings → Show "appsscript.json"** → paste `src/google-script/appsscript.json`
   (sets the timezone to `America/Lima` and the Gmail read-only scope).

---

## Part 2 — Configure

**Project Settings → Script Properties** — add:

| Property | Required | Purpose |
|---|---|---|
| `API_TOKEN` | yes | Shared secret. Every request must pass `?token=<this value>`. Use a long random string. |
| `ACCOUNT_HOLDER` | no | If set (e.g. `Genaro`), only emails greeting that name (`Hola <name>,`) are parsed. Leave unset to accept all. |

The BCP sender address is in `CONFIG.EMAIL_SENDER` in `utilities.gs`
(`notificaciones@notificacionesbcp.com.pe`) — change it there if yours differs.

---

## Part 3 — Authorize & test before deploying

1. In the editor, run **`testParser`** → grant the Gmail read permission when prompted →
   check the Execution log shows a parsed movement (with `cardLast4`, `transactionDateLocal`).
2. Run **`testWebApp`** → it calls `handleRequest` for the last 3 days and logs the JSON response.

---

## Part 4 — Deploy as a Web App

1. **Deploy → New deployment → Web app**.
2. **Execute as:** Me. **Who has access:** Anyone.
3. Copy the deployment URL: `https://script.google.com/macros/s/XXXX/exec`.
4. Smoke test:
   ```
   curl "https://script.google.com/macros/s/XXXX/exec?since=2026-09-01T00:00:00-05:00&token=YOUR_API_TOKEN"
   ```
   Re-deploy (**Manage deployments → Edit → New version**) after every `clasp push` / code edit.

---

## Part 5 — Wire it into the PFMG app

In the PFMG Angular app → **Settings → Gmail Sync**:

- **Web App URL** = the `/exec` URL from Part 4.
- **Token** = the `API_TOKEN` value.
- **Card mapping** = one row per card: its **last 4 digits** → the credit card / debit account
  it corresponds to. Movements whose `cardLast4` isn't mapped can still be imported, but you
  pick the account manually on the review screen.

Then use **Gmail Sync** from the sidebar: pick the "since" datetime (defaults to the last
successful sync), Fetch, review, Import.

---

## Request / response contract

**Request** (`GET` or `POST`, query params only — do not send custom headers):

| Param | Required | Format |
|---|---|---|
| `since` | yes | ISO-8601 datetime, e.g. `2026-09-01T00:00:00-05:00` or `2026-09-01T05:00:00Z` |
| `until` | no | ISO-8601 datetime; defaults to now |
| `token` | yes | must equal `API_TOKEN` |

**Response** `application/json`:

```jsonc
{
  "ok": true,
  "generatedAt": "2026-09-05T18:00:00-05:00",
  "since": "2026-09-01T00:00:00-05:00",
  "until": "2026-09-05T18:00:00-05:00",
  "count": 1,
  "movements": [
    {
      "messageId": "18f2ab...",
      "subject": "Realizaste un consumo con tu Tarjeta de Crédito",
      "rawType": "Consumo",
      "type": "EXPENSE",                       // EXPENSE | INCOME | TRANSFER
      "payee": "RAPPI PERU",
      "amount": -54.90,                        // already signed (bank convention)
      "currency": "PEN",                       // PEN | USD
      "operationNumber": "0048371",
      "cardLast4": "1234",
      "transactionDateLocal": "2026-09-05T13:20:00",   // America/Lima, no offset
      "emailDateLocal": "2026-09-05T13:22:00",
      "date": "2026-09-05T18:20:00.000Z"       // legacy UTC field
    }
  ],
  "unparsed": [ { "messageId": "…", "subject": "…", "reason": "no parser matched" } ]
}
```

Error responses: `{ "ok": false, "error": "unauthorized" | "missing \"since\" parameter" | ... }`.

---

## Supported email types

`parsers.gs` (tried in order): `parsePagoTarjeta` (INCOME), `parsePagoAutomatico`, `parseRetiro`,
`parseConsumo`, `parseYapeo` (TRANSFER), `parseTransferencia` (TRANSFER), `parseGenericMovement`
(fallback). To add a type: write a `parseX(subject, body, cleanBody, emailDate)` returning a
movement (or `null`), and add it to the `parsers` array in `parseTransaction()`.

## Notes

- **Idempotency:** the Web App is read-only and stateless. Re-fetching an overlapping window is
  safe — the PFMG app flags already-imported rows as duplicates and also remembers processed
  `messageId`s.
- **Timezone:** all emitted dates use `America/Lima`. `transactionDateLocal` has no offset so the
  PFMG app can take its `YYYY-MM-DD` prefix directly. Keep `appsscript.json`'s `timeZone` and
  `SCRIPT_TZ` in `utilities.gs` identical.
- **Security:** the deployment URL is public; the `API_TOKEN` is the only guard. Rotate it by
  changing the script property (no re-deploy needed).
