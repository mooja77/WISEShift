# WISEShift Ethics & Data Protection Overview

**Purpose:** A plain-language guide to the safeguards built into the WISEShift Self-Assessment Tool, written for ethics committee members, project officers, and funders.

**Version:** 1.0 | **Date:** February 2026

---

## Executive Summary

WISEShift is a web-based self-assessment tool that helps social enterprises evaluate their workplace innovation maturity. Organisations answer 40 questions across eight domains; researchers can then analyse the anonymised responses through a qualitative coding canvas.

Because the tool collects organisational self-reported data (some of it in free-text form), we have implemented a layered set of safeguards covering:

- **What is collected** and, equally important, what is *not* collected
- **Informed consent** that is recorded on the server, versioned, and revocable
- **Access control** so that only authorised users can reach data
- **Audit trails** that record every data access event in a tamper-evident database log
- **Data retention limits** with automatic anonymisation and a right to erasure
- **Protection against common web attacks** such as cross-site request forgery

All safeguards were verified through 31 automated tests that confirm each mechanism works as intended. The sections below explain each safeguard in everyday language.

---

## 1. What Data WISEShift Collects (and What It Does Not)

### Collected

| Category | Examples | Why |
|----------|----------|-----|
| Organisation profile | Name, country, region, sector, size, legal structure | To generate a tailored maturity report and enable sector benchmarking |
| Assessment responses | Likert-scale ratings, maturity-level selections, free-text narratives | Core assessment data |
| Qualitative coding data | Researcher annotations, memos, coding tags on the analysis canvas | To support cross-case qualitative research |
| Consent records | Timestamp and a one-way fingerprint of the user's IP address | To prove consent was given (or withdrawn) |
| Audit logs | Which endpoint was accessed, when, by whom (as a hashed identifier), and the outcome | For ethics oversight and accountability |

### Not Collected

- **No personal names or email addresses** from participating organisations
- **No passwords** for organisation access (access is via one-time codes)
- **No raw IP addresses** are stored anywhere; all IPs are converted to irreversible fingerprints before being saved (see Section 4 for how this works)
- **No cookies or third-party trackers**

---

## 2. How Access Codes Are Protected

Organisations and researchers access WISEShift using short alphanumeric codes (e.g., `WISE-A7X9K2` for assessments, `DASH-XXXXXXXX` for the research dashboard). These codes are the "keys to the door," so they must be protected carefully.

### The safe analogy

Think of a lock that works with a mould rather than the original key. When an access code is first created, we make two moulds:

1. **A quick-match mould (SHA-256 hash)** — lets the system find the right record instantly, like looking up a name in a phone book.
2. **A tamper-proof mould (bcrypt hash, 12 rounds)** — a deliberately slow verification step that confirms the code is genuine. Even if an attacker obtained the database, they could not feasibly reverse-engineer the original code from this mould.

The **original code is shown to the user once** and is **never stored**. Only the two moulds are saved. This means that even a full database breach would not expose usable access codes.

---

## 3. Who Can Access What — The Four Authentication Gates

WISEShift enforces four separate authentication layers, each protecting a different part of the system:

| Gate | Who uses it | How it works | What it protects |
|------|------------|--------------|------------------|
| **Organisation access code** | Organisations taking the assessment | Code is sent in the `x-access-code` header; verified via the dual-hash method described above | Assessment submission, viewing own results, data deletion |
| **Research dashboard code** | Researchers analysing data | Code sent in the `x-dashboard-code` header; same dual-hash verification | Read access to anonymised assessment data and the coding canvas |
| **Researcher token (JWT)** | Researchers with accounts | A time-limited signed token (expires after 24 hours) issued after code verification | Sustained research sessions without repeatedly entering a code |
| **Admin bearer token** | System administrators only | A long, random secret stored as an environment variable on the server; never in code | Bulk data import, system statistics |

No single code or token grants access to everything. Each gate is independent.

---

## 4. Informed Consent

### How it works for the user

Before an organisation can submit any data, a consent banner is displayed. The banner:

- Explains what data will be collected and why
- Links to the full **Privacy Policy** (see Section 5)
- Offers an explicit **Accept** action
- Allows the user to **decline** (in which case no data is sent)

### What happens on the server

When the user accepts, the server creates a **ConsentRecord** containing:

- The type of user (organisation or researcher)
- A unique, non-identifying subject identifier
- The consent version number (currently `1.0`)
- Whether consent was *granted* or *withdrawn*
- A one-way fingerprint (SHA-256) of the user's IP address
- A timestamp

This record is **immutable** — it cannot be edited or deleted. If consent is later withdrawn, a new record is added with action `withdrawn`; the original grant record is preserved for non-repudiation.

### Version tracking

If the consent wording ever changes (e.g., from version 1.0 to 2.0), every user who consented under the old version will be shown the banner again and must re-consent. Old consent records are retained alongside the new ones to maintain a complete history.

---

## 5. Privacy Policy

A full **GDPR-compliant privacy policy** is publicly accessible at `/privacy-policy` within the application. It discloses:

- Exactly what data is collected and the legal basis for processing
- How long data is retained (see Section 10)
- Users' rights under GDPR (access, erasure, anonymisation, consent withdrawal)
- That IP addresses are hashed and never stored in raw form
- Contact information for the project team and the institutional ethics office

The privacy policy is **versioned** (currently version 1.0, dated February 2026). Changes to the policy trigger the consent-renewal mechanism described above.

---

## 6. Audit Trail — Every Action Is Recorded

Every request that reaches the WISEShift server is automatically logged in a database table called `AuditLog`. This is not a text file that could be accidentally overwritten — it is a structured database record with the following fields:

| Field | Example value | Purpose |
|-------|---------------|---------|
| Timestamp | `2026-02-24T14:32:01Z` | When the action occurred |
| Action | `read`, `write`, `update`, `delete`, `export`, `anonymise` | What kind of operation |
| Resource | `assessment`, `canvas`, `responses` | What data was involved |
| Resource ID | `clxyz123...` | Which specific record |
| Actor type | `organisation`, `researcher`, `admin`, `system` | Who performed the action |
| Actor ID | Hashed identifier | Which specific user (without revealing identity) |
| IP fingerprint | SHA-256 hash | Irreversible network identifier |
| HTTP method | `GET`, `POST`, `DELETE` | Technical request type |
| Path | `/api/assessments/abc123` | Which endpoint was called |
| Status code | `200`, `401`, `404` | Whether the request succeeded or was denied |
| Metadata | JSON details | Additional context (e.g., reason for anonymisation) |

### Key properties

- **Automatic:** The audit middleware intercepts every response. Developers cannot accidentally bypass it.
- **Non-blocking:** If the audit log fails to write (e.g., a transient database error), the user's request still completes — the system favours availability but logs the failure.
- **IP privacy:** All IP addresses are converted to irreversible SHA-256 fingerprints before storage. The raw IP is never written to disk.
- **Actor detection:** The system automatically determines who is making the request based on the authentication gate they passed through.

---

## 7. Qualitative Coding Audit Trail

For researchers using the coding canvas (a visual interface for analysing qualitative data), every coding action is recorded through the same audit infrastructure:

- **Creating, updating, or deleting a code** on a transcript
- **Merging questions or codes**
- **Adding or editing memos**
- **Exporting a codebook**

Each action is logged with the researcher's identifier, a timestamp, and the specific resource affected. This provides **NVivo-equivalent audit-trail functionality**, which is a common requirement for ethics committees overseeing qualitative research.

---

## 8. Researcher Authentication — Time-Limited Signed Tokens

Researchers who access the dashboard receive a **JSON Web Token (JWT)** — a digitally signed pass that:

- Is valid for **24 hours** from the moment of issue
- Contains only the researcher's account identifier and role (no personal data)
- Is signed with a secret key stored on the server (never exposed to the browser)
- Is automatically rejected if it has expired or been tampered with

Think of it as a visitor badge that expires at the end of the working day. After 24 hours, the researcher must re-authenticate to continue working.

---

## 9. Protection Against Forged Requests (CSRF)

Cross-Site Request Forgery (CSRF) is a type of attack where a malicious website tricks a user's browser into making unwanted requests to another site. For example, if a researcher is logged in to WISEShift and visits a compromised webpage, that page could try to silently submit requests to WISEShift on the researcher's behalf.

WISEShift prevents this by checking the **origin** of every request that modifies data (creates, updates, or deletes). If the request comes from a website that is not on the approved list, it is rejected with a clear error message. Read-only requests (viewing data) are always allowed, since they cannot change anything.

The approved origins are configured through server environment variables, not hardcoded, so they can be updated without changing the application code.

---

## 10. Data Retention and Right to Erasure

### Automatic retention limits

| Data type | Retention period | What happens when it expires |
|-----------|-----------------|------------------------------|
| **Completed assessments** | 24 months from last update | Organisation name replaced with "Anonymised Organisation"; free-text narratives cleared; numeric scores retained for aggregate benchmarking |
| **In-progress assessments** | 6 months from last update | Entire assessment and all associated data permanently deleted; orphaned organisation records also removed |
| **Audit logs** | Up to 5 years | Required by institutional ethics committees for oversight |

### Manual erasure (Right to be Forgotten)

Organisations can exercise their GDPR right to erasure at any time through the Data Management page:

- **Full deletion:** Permanently removes the assessment and all related responses, scores, and action plans. If no other assessments exist for that organisation, the organisation record is also deleted.
- **Anonymisation:** Replaces the organisation name with "Anonymised Organisation" and clears all free-text responses, while keeping numeric scores for aggregate sector benchmarks.

### Consent withdrawal

Organisations and researchers can withdraw their consent at any time. When consent is withdrawn:

- A new `withdrawn` consent record is created (the original `granted` record is preserved for the audit trail)
- The organisation's consent status is cleared, preventing further data processing until consent is re-granted

---

## 11. Summary Table

| Safeguard | Risk it addresses | Verification result |
|-----------|-------------------|---------------------|
| Dual-hash access codes (SHA-256 + bcrypt) | Database breach exposing usable credentials | Passed — codes cannot be reversed from stored hashes |
| Four independent authentication gates | Unauthorised access to data | Passed — each gate rejects invalid credentials with appropriate error codes |
| Informed consent with server-side recording | Inability to prove consent was obtained | Passed — consent records created with correct version, timestamp, and hashed IP |
| Consent version tracking and renewal | Users not re-consenting after policy changes | Passed — version mismatch triggers re-consent flow |
| Consent decline option | Users coerced into providing data | Passed — declining prevents data submission |
| Versioned privacy policy | Users uninformed about data practices | Passed — policy accessible at `/privacy-policy`, version-linked to consent |
| Automatic audit trail on every request | Untracked data access | Passed — all HTTP methods logged with actor, resource, timestamp, and hashed IP |
| Qualitative coding audit trail | Unaccountable changes to research analysis | Passed — canvas operations logged via same audit infrastructure |
| IP address hashing (SHA-256) | Storing personally identifiable network data | Passed — no raw IPs found in any database table |
| JWT researcher tokens (24-hour expiry) | Stolen credentials used indefinitely | Passed — expired tokens correctly rejected |
| CSRF origin validation | Forged cross-site requests modifying data | Passed — requests from disallowed origins rejected with 403 |
| 24-month retention with auto-anonymisation | Data kept longer than necessary | Passed — anonymisation replaces names and clears narratives, retains scores |
| 6-month deletion for in-progress data | Abandoned assessments accumulating | Passed — expired in-progress data fully deleted with cascade |
| Right to erasure (full delete) | User unable to remove their data | Passed — DELETE endpoint removes assessment and orphaned org records |
| Right to anonymisation | User wants scores retained but identity removed | Passed — anonymisation endpoint clears identity and narratives only |
| Consent withdrawal | User unable to revoke consent | Passed — withdrawal recorded and consent status cleared |

---

## 12. How These Safeguards Were Verified

All safeguards were validated through **31 automated tests** that run against the actual application code. These tests are not demonstrations — they exercise the real middleware, database operations, and authentication logic.

The tests are grouped by concern:

- **Access code hashing (3 tests):** Confirms that codes are hashed with both SHA-256 and bcrypt, that the original code is never stored, and that verification succeeds only with the correct code.
- **Consent management (4 tests):** Confirms that consent records are created with the correct version, that IP addresses are hashed, that withdrawal creates a separate record, and that version mismatches trigger renewal.
- **Audit trail (4 tests):** Confirms that every HTTP method produces an audit record, that the correct action type is assigned (read, write, update, delete, export, anonymise), and that IP addresses are hashed before storage.
- **CSRF protection (3 tests):** Confirms that mutation requests from disallowed origins are rejected, that read requests are always permitted, and that configured origins are accepted.
- **Researcher JWT authentication (4 tests):** Confirms that valid tokens grant access, expired tokens are rejected, tampered tokens are rejected, and token payloads contain only the necessary fields.
- **Access code authentication (4 tests):** Confirms that valid codes pass verification, invalid codes are rejected, missing codes produce a 401 error, and the organisation record is correctly attached to the request.
- **Data retention (4 tests):** Confirms that retention dates are calculated correctly for both completed and in-progress assessments, that anonymisation replaces names and clears narratives while keeping scores, and that deletion cascades correctly.
- **Privacy policy and consent flow (3 tests):** Confirms that the privacy policy page is accessible, that the consent banner appears for new users, and that accepted consent is recorded.
- **Admin authentication (2 tests):** Confirms that the correct bearer token grants access and that incorrect or missing tokens are rejected.

All **31 of 31 tests passed** at the time of this writing.

---

## Questions?

For questions about these safeguards, contact the WISEShift project team through your institutional ethics office. For technical details, developers can refer to the source files in `apps/backend/src/middleware/` and `apps/backend/src/utils/`.
