# Money App API Specification (api-spec.md)

**Version:** v1  
**Base URL:** `/api/v1`  
**Audience:** Frontend + Backend developers  
**Goal:** Define the API contract for the Money App (budgeting, goals, transactions, accounts) consistent with domain rules.

---

## 0) Global Conventions

### 0.1 Authentication
- All endpoints require authentication **except**:
  - `POST /auth/register`
  - `POST /auth/login`
- Auth uses JWT:
  - Header: `Authorization: Bearer <token>`

### 0.2 Ownership & Authorization (Critical)
- Every resource is owned by the authenticated user.
- The client never supplies `user_id`.
- If a resource does not belong to the user:
  - Return `404` (do not leak existence)

### 0.3 Soft Deletion
- Resources may be soft-deleted or archived (implementation-defined).
- Soft-deleted/archived resources:
  - remain queryable for historical reporting (depending on endpoint)
  - cannot be modified unless explicitly stated

### 0.4 Money & Currency
- `amount` is a number (decimal) in the account’s currency.
- v1 does **not** support cross-currency transfers.
- Account currency is immutable after account creation.

### 0.5 Time
- Store timestamps in UTC.
- Requests may accept date-only strings (`YYYY-MM-DD`) for user-friendly entry.
- Monthly budgeting/reporting is calendar-based.

### 0.6 Transaction Immutability
- Transactions are append-only.
- Corrections occur via reversal/adjustment patterns (future endpoints), not hard deletes.
- v1 allows editing metadata only (category/note/tags) if supported by schema.

### 0.7 Error Format
All errors return:
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": { "optional": "object" }
  }
}
