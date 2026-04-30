# Login Workflow

Dieses Dokument beschreibt alle Fälle des Login- und Registrierungsflows, die beteiligten
Endpunkte und bekannte Bugs inkl. deren Behebung.

---

## Fall 1 – Neuer Nutzer (Registrierung mit Passwort)

**Ablauf:**

1. Nutzer ruft `/register` auf und gibt Email, Name, Spieler-ID und Passwort (zweimalig) ein.
2. `POST /api/auth/register-password`
   - Erstellt den Supabase-Auth-User via Admin-API mit `email_confirm: true` (kein Bestätigungsmail)
   - Setzt `app_metadata.has_password = true`
   - Peppert das Passwort serverseitig mit HMAC-SHA256 vor dem Speichern in Supabase
3. `POST /api/auth/login-password`
   - Authentifiziert direkt mit gepfeffertem Passwort
   - Gibt `access_token` / `refresh_token` zurück
4. Client setzt Session via `supabase.auth.setSession(...)` → Nutzer ist eingeloggt
5. Weiterleitung zur ursprünglich angeforderten Seite (oder `/`)

**Wichtig:** Keine Bestätigungsmail nötig.

---

## Fall 2 – Bestehender Nutzer mit Passwort (Password-Login)

**Ablauf:**

1. Nutzer ruft `/login` auf, gibt Email ein.
2. `POST /api/players/check` prüft, ob Account existiert.
3. `POST /api/auth/check-password` prüft `app_metadata.has_password`.
   - `passwordState === "has"` → `hasPassword = true` → Passwort-Eingabe anzeigen
4. Nutzer gibt Passwort ein → `POST /api/auth/login-password`
   - Server peppert Passwort, ruft Supabase `/auth/v1/token?grant_type=password` auf
   - Gibt `access_token` / `refresh_token` zurück
5. Client setzt Session → eingeloggt, Weiterleitung.

---

## Fall 3a – Passwortloser Nutzer, der sich **noch nie** angemeldet hat, setzt erstmals Passwort

**Voraussetzung:** `email_confirmed_at` ist nicht gesetzt (Nutzer wurde z. B. durch Admin importiert oder hat sich noch nie per E-Mail-Code bestätigt).

**Ablauf:**

1. Nutzer ruft `/login` auf, gibt Email ein.
2. `POST /api/players/check` → Account gefunden.
3. `POST /api/auth/check-password` → `passwordState !== "has"` → `hasPassword = false`.
4. UI zeigt direkt den `passwordSetup`-Step.
5. Nutzer gibt neues Passwort ein.
6. `POST /api/auth/request-password-setup`
   - `email_confirmed_at` ist nicht gesetzt → **Path A (direkt)**
   - Setzt Passwort sofort via `updateUserById` + `email_confirm: true`
   - Setzt `app_metadata.has_password = true`
   - Loggt Nutzer direkt ein (gepfefferter Password-Login)
   - Gibt `{ mode: "direct", access_token, refresh_token }` zurück
7. Client setzt Session → eingeloggt, Weiterleitung. **Keine Bestätigungsmail.**

---

## Fall 3b – Passwortloser Nutzer, der sich **bereits angemeldet hat**, setzt erstmals Passwort

**Voraussetzung:** `email_confirmed_at` ist gesetzt (Nutzer hat sich mind. einmal per E-Mail-Code authentifiziert).

**Sicherheitsreason:** Der Nutzer muss beweisen, dass er noch Zugang zur Email hat, bevor ein Passwort auf den Account gesetzt wird, das künftig ohne Email-Zugang zur Anmeldung ausreicht.

**Ablauf:**
1–5. Identisch mit Fall 3a. 6. `POST /api/auth/request-password-setup`

- `email_confirmed_at` ist gesetzt → **Path B (mit Bestätigung)**
- Verschlüsselt das gepfefferte Passwort und speichert es als `app_metadata.pending_password_setup` (TTL: 15 min)
- Gibt `{ mode: "confirm_code", email }` zurück

7. Client ruft `supabase.auth.verifyOtp({ email, token, type: "email" })` nach Eingabe des E-Mail-Codes auf.
8. Der Client ruft mit der dadurch etablierten Session `POST /api/auth/finalize-password-setup` auf.
9. `finalize-password-setup` entschlüsselt `pending_password_setup`
   - Entschlüsselt `pending_password_setup`
   - Prüft TTL (15 min Ablaufzeit)
   - Setzt Passwort via `updateUserById`, löscht `pending_password_setup`, setzt `has_password = true`
10. Nutzer wird ausgeloggt und zu `/password-set-success` weitergeleitet.
11. Nutzer kann sich nun mit Passwort einloggen (Fall 2).

**Verschlüsselung des pending Passworts:**  
Das gepfefferte Passwort wird serverseitig mit AES-256-GCM (Key aus `PASSWORD_PEPPER` oder `SUPABASE_SERVICE_KEY`) verschlüsselt gespeichert. Es verlässt den Server nie im Klartext.

---

## Fall 4 – Bestehender Nutzer wählt E-Mail-Code statt Passwort

**Ablauf:**

1. Nutzer ruft `/login` auf, gibt Email ein.
2. `POST /api/players/check` → Account gefunden.
3. `POST /api/auth/check-password` → beliebiger `passwordState`.
4. UI zeigt Method-Auswahl: „Passwort" oder „E-Mail-Code".
5. Nutzer wählt E-Mail-Code → `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`
6. Nutzer gibt den empfangenen Code direkt auf `/login` ein.
7. Client ruft `supabase.auth.verifyOtp({ email, token, type: "email" })` auf → Session wird gesetzt → eingeloggt.

---

## Fall 5 – Neuer Nutzer registriert sich mit E-Mail-Code

**Ablauf:**

1. Nutzer wählt in `RegisterForm` die Methode „E-Mail-Code".
2. `supabase.auth.signInWithOtp({ email, options: { data: { name, playerId } } })`
   - Supabase erstellt den Account, falls er noch nicht existiert.
3. Nutzer gibt den Code direkt im Formular ein → `verifyOtp(...)` → Session gesetzt → eingeloggt.
4. `app_metadata.has_password` ist nicht gesetzt; der Nutzer fällt bei künftigem Login unter **Fall 3**.

---

## Fall 6 – Passwortloser Nutzer setzt Passwort nachträglich über das Profil

> Noch nicht implementiert (geplant). Folgt technisch Fall 3 (`request-password-setup`).

---

## Fall 7 – E-Mail-Code abgelaufen

**Ablauf:**

1. Nutzer gibt einen abgelaufenen Code ein.
2. `verifyOtp` liefert z. B. `otp_expired`.
3. UI zeigt einen Fehler und Nutzer fordert einen neuen E-Mail-Code an.

---

## Fall 8 – Nutzer mit ausstehender Passwort-Einrichtung (`pending_password_setup`)

> Legacy-Mechanismus aus der alten `confirm_code`-Vorstufe.  
> Wird technisch noch unterstützt durch `POST /api/auth/finalize-password-setup`,
> aber neuer Code erzeugt diesen Zustand nicht mehr.

---

## Passwort-Sicherheitsmodell

- **Pepper:** Passwort wird serverseitig via `HMAC-SHA256(PASSWORD_PEPPER, password)` peppered, bevor es an Supabase übergeben wird.
- **Bcrypt:** Supabase wendet zusätzlich Bcrypt mit individuellem Salt an.
- **Transport:** HTTPS.
- Der Pepper verlässt nie den Server und schützt vor reinen Datenbank-Leaks.

---

## Behobene Bugs

### Bug 1 – Direkter Pfad (Fall 3a) fehlte `email_confirm: true`

**Datei:** `server/api/auth/request-password-setup.post.ts`

**Ursache:**
Der `!wasConfirmedBefore`-Pfad setzte das Passwort via `updateUserById`, markierte die Email
aber nicht explizit als bestätigt. Auf manchen Supabase-Konfigurationen kann das dazu führen,
dass ein nachfolgender Password-Login scheitert, weil Supabase die Email-Bestätigung erzwingt.

**Fix:**
`email_confirm: true` zum `updateUserById`-Aufruf im direkten Pfad hinzugefügt.

---

### Bug 2 – `passwordState = "unknown"` wurde fälschlich als „hat Passwort" behandelt

**Datei:** `composables/useLoginWorkflow.ts`

**Ursache — Dies war der Hauptbug, der die ursprünglich gemeldete schlechte UX verursachte:**

```typescript
// Alt (buggy):
hasPassword.value = passwordState === "missing" ? false : true;
// → "unknown" wurde als true behandelt
```

Für Legacy-passwortlose Nutzer ohne `app_metadata.has_password`-Eintrag gibt
`/api/auth/check-password` `passwordState = "unknown"` zurück. Durch die fehlerhafte
Behandlung wurde `hasPassword = true` gesetzt:

1. Nutzer sieht die Passwort-Eingabe (obwohl kein Passwort gesetzt ist)
2. Gibt irgendein Passwort ein → `no_password_set`-Fehler vom Server
3. Wird dann erst zur Passwort-Einrichtung weitergeleitet

Das ist der eigentliche Grund, warum Nutzer aus Fall 3b die Bestätigungsmail als
überraschend/unverständlich erlebt haben: Sie landeten erst nach einem Umweg und einer
Fehlermeldung dort.

**Fix:**

```typescript
// Neu (korrekt):
hasPassword.value = passwordState === "has";
// → "unknown" und "missing" führen beide direkt zur Passwort-Einrichtung
```

---

### Bug 3 – Registrierung ignorierte `redirect`-Parameter

**Datei:** `components/RegisterForm.vue`

**Ursache:**
Nach erfolgreicher Passwort-Registrierung und Login wurde immer zu `/` navigiert, statt zur
ursprünglich angeforderten Seite (z. B. Event-Registrierung).

**Fix:**

```typescript
// Alt: await navigateTo("/");
// Neu:
await navigateTo((route.query.redirect as string) || "/");
```
