# Supabase OTP Setup

Date: 2026-05-01
Related:

- `AUTH_IDENTITY_IMPLEMENTATION_CHECKLIST.md`
- `loginworkflow.md`

This project now uses Supabase email OTP for passwordless login, passwordless registration, and password-setup confirmation.

The app code assumes the user receives a 6-digit code and enters it in the UI. It does not rely on a magic-link callback flow anymore.

## Required Supabase Dashboard Changes

### 1. Enable Email Auth

Path:

- current dashboard: `Authentication -> Sign In / Providers -> Email`
- Supabase docs may still refer to this as `Auth -> Providers -> Email`

Required state:

- Email provider enabled
- Password sign-ins enabled
- Email OTP enabled

Notes:

- `signInWithOtp()` is used for both login and registration.
- Existing-user login in this repo sends OTP with `shouldCreateUser: false`.
- Registration sends OTP with `shouldCreateUser: true` and metadata.

### 2. Change the Magic Link Email Template to an OTP Template

Path:

- current dashboard: `Authentication -> Email`
- open the `Magic Link` template there

Critical rule:

- The template must use `{{ .Token }}`.
- It must not use `{{ .ConfirmationURL }}`.

Why:

- Supabase uses the same `signInWithOtp()` API for both magic links and email codes.
- The email content decides which experience the user receives.
- If `{{ .ConfirmationURL }}` is present, Supabase sends a clickable link.
- If `{{ .Token }}` is present, Supabase sends a 6-digit OTP.

Recommended template:

```html
<h2>Your login code</h2>
<p>Enter this code in PTCG Eventjams:</p>
<p style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em;">{{ .Token }}</p>
<p>This code can only be used once and should expire after 15 minutes.</p>
```

Ready-to-paste polished templates:

German:

```html
<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: #111827;">Dein Anmeldecode für PTCG Eventjams</h2>

  <p style="margin: 0 0 16px;">Hallo,</p>

  <p style="margin: 0 0 16px;">
    verwende bitte den folgenden sechsstelligen Code, um dich bei PTCG Eventjams anzumelden oder deine Anmeldung zu bestätigen:
  </p>

  <div style="margin: 24px 0; padding: 18px 20px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">
    <div style="font-size: 34px; line-height: 1; font-weight: 700; letter-spacing: 0.32em; color: #111827; font-family: 'Courier New', monospace;">
      {{ .Token }}
    </div>
  </div>

  <p style="margin: 0 0 12px;">
    Der Code kann nur einmal verwendet werden und sollte nach kurzer Zeit ablaufen.
  </p>

  <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px;">
    Falls du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.
  </p>

  <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">
    PTCG Eventjams
  </p>
</div>
```

English:

```html
<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="margin: 0 0 16px; font-size: 24px; line-height: 1.3; color: #111827;">Your PTCG Eventjams login code</h2>

  <p style="margin: 0 0 16px;">Hello,</p>

  <p style="margin: 0 0 16px;">
    Please use the following six-digit code to sign in to PTCG Eventjams or confirm your sign-in:
  </p>

  <div style="margin: 24px 0; padding: 18px 20px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">
    <div style="font-size: 34px; line-height: 1; font-weight: 700; letter-spacing: 0.32em; color: #111827; font-family: 'Courier New', monospace;">
      {{ .Token }}
    </div>
  </div>

  <p style="margin: 0 0 12px;">
    This code can only be used once and should expire shortly.
  </p>

  <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px;">
    If you did not request this sign-in, you can safely ignore this email.
  </p>

  <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">
    PTCG Eventjams
  </p>
</div>
```

Optional personalization:

- `{{ .Email }}` for the recipient email
- `{{ .Data }}` for user metadata when present

Examples:

- `{{ .Data.name }}` if you want to greet passwordless registrants by name

### 3. Set OTP Expiry to Match the App Flow

Path:

- current dashboard: `Authentication -> Sign In / Providers -> Email`
- Supabase docs may still refer to this as `Auth -> Providers -> Email -> Email OTP Expiration`

Recommended value:

- `900` seconds

Important note:

- in the current dashboard UI this setting may be labeled differently than the docs
- look for an email OTP expiry / OTP expiration field inside the Email provider settings
- if you do not see any OTP expiry field at all, your hosted UI may not expose it even though the docs still describe it as configurable

Reason:

- This repo stores `pending_password_setup` with a 15-minute TTL.
- Setting Supabase OTP expiry to 15 minutes keeps the user-facing email code lifetime aligned with the server-side password-setup window.

If you leave Supabase at the default 1 hour while the app uses a 15-minute pending-password TTL, users can still have a valid code but hit an expired password-setup state on the server.

### 4. Configure Rate Limits

Path:

- `Authentication -> Rate Limits`

Recommended starting point:

- Keep OTP send limits enabled
- Keep verify limits enabled

Relevant Supabase defaults from the docs:

- OTP send cooldown for the same user: `60` seconds
- Send OTPs: `30` per hour project-wide
- Verify requests: `360` per hour per IP

Important note:

- the project-wide OTP limit is clearly documented and exposed via `Authentication -> Rate Limits`
- the same-user `60` second resend window is documented by Supabase as default behavior
- however, the current hosted dashboard does not always expose that cooldown as a separate field you can edit directly

For this app, treat the same-user `60` second cooldown as the documented default unless your specific project UI exposes a direct control for it.

### 5. Use Custom SMTP Before Production Rollout

Path:

- `Authentication -> Email -> SMTP Settings`

This matters more than it looks.

Supabase documents that with the built-in email provider, endpoints that send emails are heavily limited and intended for testing. A production passwordless login flow should use custom SMTP.

Practical recommendation:

- configure custom SMTP before enabling OTP login for real users
- use a sender with link tracking disabled for auth emails

### 6. Keep URL Configuration Valid, but Minimal

Path:

- `Authentication -> URL Configuration`

Required state:

- `Site URL` set to the app base URL
- any real frontend origins added to redirect allowlist as needed

Important nuance:

- The OTP login flow implemented here does not require `/confirm` or `/magic-login` redirects.
- URL configuration is still relevant for other auth flows such as password recovery or future email-change flows.

## What This Repo Expects

The active passwordless behavior in the app is:

1. Request code:

```ts
await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: false },
})
```

2. Verify code:

```ts
await supabase.auth.verifyOtp({
  email,
  token: code,
  type: "email",
})
```

Important:

- use `type: "email"`
- do not use deprecated email verify types such as `magiclink` or `signup`

## Quick Verification Checklist

After changing Supabase settings, verify this manually:

1. Request passwordless login from `/login` with an existing account.
2. Confirm the email contains a 6-digit code, not a link.
3. Enter the code on `/login` and confirm a session is created.
4. Register a new account with the passwordless option and confirm the same OTP email arrives.
5. Trigger the password-setup confirmation flow and confirm it also uses the same OTP-style email.
6. Request two codes quickly and confirm the resend cooldown/rate-limit behavior is acceptable.

## Common Misconfiguration

If users still receive links instead of codes, the cause is almost always this:

- the `Magic Link` email template still contains `{{ .ConfirmationURL }}`

If users receive codes but production volume fails unexpectedly, the likely cause is this:

- the project is still using Supabase's built-in email provider instead of custom SMTP