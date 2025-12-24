````md
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
````

Common HTTP codes:

* `400` Validation error
* `401` Not authenticated / invalid token
* `403` Authenticated but not allowed (rare; prefer 404 for ownership)
* `404` Not found (or not owned)
* `409` Conflict (unique constraint, invalid state transition)
* `422` Domain rule violation

---

## 1) Authentication

### 1.1 POST `/auth/register`

Create a new user and return an auth token.

**Request**

```json
{
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "password": "strong-password"
}
```

**Rules**

* `email` must be unique.
* Password is stored securely (hashed); never returned.

**Response (201)**

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "created_at": "2025-01-01T12:00:00Z"
  },
  "token": "jwt-token"
}
```

**Errors**

* `400` invalid input
* `409` email already exists

---

### 1.2 POST `/auth/login`

Authenticate user and return token.

**Request**

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

**Response (200)**

```json
{
  "token": "jwt-token"
}
```

**Errors**

* `401` invalid credentials

---

### 1.3 POST `/auth/logout` (Optional, token-based)

If using stateless JWT, logout is handled client-side by dropping token.
If you implement refresh tokens, add token revocation here.

**Response (204)**

---

## 2) User

### 2.1 GET `/me`

Get current authenticated user profile.

**Response (200)**

```json
{
  "id": "usr_123",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-02T12:00:00Z"
}
```

---

### 2.2 PATCH `/me`

Update profile fields (not email).

**Request**

```json
{
  "full_name": "Jane A. Doe"
}
```

**Response (200)**

```json
{
  "id": "usr_123",
  "email": "user@example.com",
  "full_name": "Jane A. Doe",
  "updated_at": "2025-01-03T12:00:00Z"
}
```

**Errors**

* `400` invalid input

---

## 3) Accounts

### 3.1 POST `/accounts`

Create a new account.

**Request**

```json
{
  "account_name": "Checking",
  "account_type": "checking",
  "institution": "Chase",
  "currency": "USD"
}
```

**Rules**

* Account belongs to authenticated user.
* Currency is immutable after creation.

**Response (201)**

```json
{
  "account_id": "acct_123",
  "account_name": "Checking",
  "account_type": "checking",
  "institution": "Chase",
  "currency": "USD",
  "status": "active",
  "created_at": "2025-01-01T12:00:00Z"
}
```

**Errors**

* `400` invalid input

---

### 3.2 GET `/accounts`

List accounts for user.

**Query Params**

* `include_archived` (optional): `true|false` (default: false)

**Response (200)**

```json
[
  {
    "account_id": "acct_123",
    "account_name": "Checking",
    "account_type": "checking",
    "institution": "Chase",
    "currency": "USD",
    "status": "active",
    "computed_balance": 1240.5,
    "updated_at": "2025-01-02T12:00:00Z"
  }
]
```

**Notes**

* `computed_balance` is derived from transactions.

---

### 3.3 GET `/accounts/:id`

Get one account (owned by user).

**Response (200)**

```json
{
  "account_id": "acct_123",
  "account_name": "Checking",
  "account_type": "checking",
  "institution": "Chase",
  "currency": "USD",
  "status": "active",
  "computed_balance": 1240.5,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-02T12:00:00Z"
}
```

**Errors**

* `404` not found / not owned

---

### 3.4 PATCH `/accounts/:id`

Update editable fields.

**Request**

```json
{
  "account_name": "Main Checking",
  "institution": "Chase"
}
```

**Rules**

* `currency` cannot change.
* `account_type` changes are allowed only if you want them; otherwise disallow.

**Response (200)**

```json
{
  "account_id": "acct_123",
  "account_name": "Main Checking",
  "account_type": "checking",
  "institution": "Chase",
  "currency": "USD",
  "status": "active",
  "updated_at": "2025-01-03T12:00:00Z"
}
```

**Errors**

* `400` invalid input
* `422` attempt to change immutable fields
* `404` not found / not owned

---

### 3.5 PATCH `/accounts/:id/archive`

Archive an account (soft-disable).

**Rules**

* Archived accounts cannot accept new transactions.
* Historical queries may still include them.

**Response (200)**

```json
{
  "account_id": "acct_123",
  "status": "archived",
  "updated_at": "2025-01-03T12:00:00Z"
}
```

**Errors**

* `404` not found / not owned
* `409` already archived

---

### 3.6 PATCH `/accounts/:id/unarchive`

Restore an archived account.

**Response (200)**

```json
{
  "account_id": "acct_123",
  "status": "active",
  "updated_at": "2025-01-04T12:00:00Z"
}
```

---

## 4) Categories

### 4.1 GET `/categories`

List categories for user (system + user-created).

**Response (200)**

```json
[
  {
    "category_id": "cat_food",
    "name": "Food",
    "type": "expense",
    "is_system": true
  },
  {
    "category_id": "cat_salary",
    "name": "Salary",
    "type": "income",
    "is_system": true
  }
]
```

---

### 4.2 POST `/categories`

Create a user category.

**Request**

```json
{
  "name": "Coffee",
  "type": "expense"
}
```

**Response (201)**

```json
{
  "category_id": "cat_789",
  "name": "Coffee",
  "type": "expense",
  "is_system": false
}
```

**Errors**

* `400` invalid input
* `409` duplicate category name (if enforced)

---

### 4.3 PATCH `/categories/:id`

Rename a user-created category.

**Rules**

* System categories cannot be modified in v1.

**Request**

```json
{
  "name": "Café"
}
```

**Response (200)**

```json
{
  "category_id": "cat_789",
  "name": "Café",
  "type": "expense",
  "is_system": false
}
```

**Errors**

* `404` not found / not owned
* `422` attempt to modify system category

---

## 5) Transactions

### 5.1 POST `/transactions`

Create an income/expense transaction.

**Request**

```json
{
  "account_id": "acct_123",
  "amount": -45.75,
  "category_id": "cat_food",
  "date": "2025-01-10",
  "note": "Lunch"
}
```

**Rules**

* `amount > 0` => income, `amount < 0` => expense
* `amount` cannot be 0
* Account must be `active`
* Category must exist and be compatible with income/expense (if enforced)

**Response (201)**

```json
{
  "transaction_id": "txn_123",
  "account_id": "acct_123",
  "amount": -45.75,
  "category_id": "cat_food",
  "date": "2025-01-10",
  "note": "Lunch",
  "source": "manual",
  "created_at": "2025-01-10T16:02:00Z"
}
```

**Errors**

* `400` invalid input
* `409` account archived
* `422` domain rule violation (e.g., amount=0)

---

### 5.2 GET `/transactions`

List transactions with filters.

**Query Params**

* `month` (optional): `YYYY-MM` (calendar month)
* `from` (optional): `YYYY-MM-DD`
* `to` (optional): `YYYY-MM-DD`
* `account_id` (optional)
* `category_id` (optional)
* `type` (optional): `income|expense|transfer`
* `limit` (optional): default 50
* `cursor` (optional): pagination cursor

**Response (200)**

```json
{
  "data": [
    {
      "transaction_id": "txn_123",
      "account_id": "acct_123",
      "amount": -45.75,
      "type": "expense",
      "category": {
        "category_id": "cat_food",
        "name": "Food"
      },
      "date": "2025-01-10",
      "note": "Lunch",
      "source": "manual",
      "created_at": "2025-01-10T16:02:00Z"
    }
  ],
  "next_cursor": null
}
```

---

### 5.3 GET `/transactions/:id`

Get one transaction.

**Response (200)**

```json
{
  "transaction_id": "txn_123",
  "account_id": "acct_123",
  "amount": -45.75,
  "type": "expense",
  "category_id": "cat_food",
  "date": "2025-01-10",
  "note": "Lunch",
  "source": "manual",
  "created_at": "2025-01-10T16:02:00Z"
}
```

**Errors**

* `404` not found / not owned

---

### 5.4 PATCH `/transactions/:id`

Edit transaction metadata only.

**Request**

```json
{
  "category_id": "cat_coffee",
  "note": "Lunch + coffee"
}
```

**Rules**

* Cannot change `amount`, `account_id`, `date` in v1 (unless you explicitly allow date changes).
* If category changes, must remain compatible.

**Response (200)**

```json
{
  "transaction_id": "txn_123",
  "category_id": "cat_coffee",
  "note": "Lunch + coffee",
  "updated_at": "2025-01-11T12:00:00Z"
}
```

**Errors**

* `422` attempt to edit immutable fields
* `404` not found / not owned

---

## 6) Transfers

Transfers are two transactions tied by a shared `transfer_id`.

### 6.1 POST `/transfers`

Create an atomic transfer between two accounts.

**Request**

```json
{
  "from_account_id": "acct_123",
  "to_account_id": "acct_456",
  "amount": 200.00,
  "date": "2025-01-12",
  "note": "Move to savings"
}
```

**Rules**

* `amount > 0`
* Both accounts must be active and owned by user
* Both accounts must have same currency (v1)
* Creates:

  * one transaction `-amount` on from-account
  * one transaction `+amount` on to-account
* Both must succeed or both fail (atomic)

**Response (201)**

```json
{
  "transfer_id": "xfer_123",
  "from_transaction_id": "txn_901",
  "to_transaction_id": "txn_902",
  "amount": 200.0,
  "date": "2025-01-12"
}
```

**Errors**

* `409` account archived
* `422` cross-currency transfer not supported

---

### 6.2 GET `/transfers`

List transfers.

**Query Params**

* `month` (optional): `YYYY-MM`
* `from_account_id` (optional)
* `to_account_id` (optional)

**Response (200)**

```json
[
  {
    "transfer_id": "xfer_123",
    "from_account_id": "acct_123",
    "to_account_id": "acct_456",
    "amount": 200.0,
    "date": "2025-01-12",
    "note": "Move to savings"
  }
]
```

---

## 7) Budgets

### 7.1 POST `/budgets`

Create a monthly budget for a category.

**Request**

```json
{
  "category_id": "cat_food",
  "monthly_limit": 300.0
}
```

**Rules**

* One active budget per category per user (recommended)
* Monthly budgets are calendar-based

**Response (201)**

```json
{
  "budget_id": "bud_123",
  "category_id": "cat_food",
  "monthly_limit": 300.0,
  "status": "active"
}
```

**Errors**

* `409` budget already exists for category (if enforced)

---

### 7.2 GET `/budgets`

List budgets with computed month performance.

**Query Params**

* `month` (optional): `YYYY-MM` (default: current month)

**Response (200)**

```json
[
  {
    "budget_id": "bud_123",
    "category": { "category_id": "cat_food", "name": "Food" },
    "monthly_limit": 300.0,
    "spent": 275.0,
    "remaining": 25.0,
    "month": "2025-01"
  }
]
```

---

### 7.3 PATCH `/budgets/:id`

Update budget limit.

**Request**

```json
{
  "monthly_limit": 350.0
}
```

**Response (200)**

```json
{
  "budget_id": "bud_123",
  "monthly_limit": 350.0,
  "updated_at": "2025-01-15T12:00:00Z"
}
```

---

### 7.4 PATCH `/budgets/:id/archive`

Archive budget.

**Response (200)**

```json
{
  "budget_id": "bud_123",
  "status": "archived"
}
```

---

## 8) Goals

### 8.1 POST `/goals`

Create a goal.

**Request**

```json
{
  "name": "Emergency Fund",
  "target_amount": 5000.0,
  "linked_account_ids": ["acct_456"]
}
```

**Rules**

* Progress is computed from linked accounts (implementation-defined, e.g., current balance or net deposits)

**Response (201)**

```json
{
  "goal_id": "goal_123",
  "name": "Emergency Fund",
  "target_amount": 5000.0,
  "status": "active"
}
```

---

### 8.2 GET `/goals`

List goals with computed progress.

**Response (200)**

```json
[
  {
    "goal_id": "goal_123",
    "name": "Emergency Fund",
    "target_amount": 5000.0,
    "current_amount": 1200.0,
    "progress_percent": 24.0,
    "status": "active"
  }
]
```

---

### 8.3 PATCH `/goals/:id`

Update goal metadata.

**Request**

```json
{
  "name": "Emergency Fund (6 months)",
  "target_amount": 6000.0
}
```

**Response (200)**

```json
{
  "goal_id": "goal_123",
  "name": "Emergency Fund (6 months)",
  "target_amount": 6000.0,
  "updated_at": "2025-01-20T12:00:00Z"
}
```

---

### 8.4 PATCH `/goals/:id/complete`

Manually mark as complete (optional). If you prefer auto-complete only, omit this endpoint.

**Response (200)**

```json
{
  "goal_id": "goal_123",
  "status": "completed",
  "completed_at": "2025-02-01T00:00:00Z"
}
```

---

## 9) Reports (MVP Analytics)

### 9.1 GET `/reports/spending-by-category`

Return spending totals grouped by category for a month.

**Query Params**

* `month`: `YYYY-MM` (required)
* `account_id` (optional)

**Response (200)**

```json
{
  "month": "2025-01",
  "currency": "USD",
  "data": [
    { "category_id": "cat_food", "category_name": "Food", "spent": 275.0 },
    { "category_id": "cat_transport", "category_name": "Transport", "spent": 90.0 }
  ]
}
```

---

### 9.2 GET `/reports/cashflow`

Income vs expense for a date range.

**Query Params**

* `from`: `YYYY-MM-DD` (required)
* `to`: `YYYY-MM-DD` (required)

**Response (200)**

```json
{
  "from": "2025-01-01",
  "to": "2025-01-31",
  "currency": "USD",
  "income": 3200.0,
  "expense": 2100.0,
  "net": 1100.0
}
```

---

10) Bank Integrations (Plaid)
10.1 POST /integrations/plaid/link-token

Purpose
Create a Plaid Link token for frontend initialization.

Rules

Token is short-lived

Tied to authenticated user

Response (200)

{
  "link_token": "link-sandbox-abc123"
}

10.2 POST /integrations/plaid/exchange-token

Purpose
Exchange Plaid public_token for access_token.

Request

{
  "public_token": "public-sandbox-xyz"
}


Rules

Access token is encrypted at rest

One Plaid item may map to multiple accounts

Response (201)

{
  "item_id": "plaid_item_123",
  "institution": "Chase"
}

10.3 POST /integrations/plaid/import

Purpose
Import transactions from Plaid.

Rules

Import must be idempotent

Duplicate detection uses:

amount

date

merchant

account_id

Imported transactions are immutable

Source is tagged as plaid

Request

{
  "account_id": "acct_123",
  "from": "2025-01-01",
  "to": "2025-01-31"
}


Response (202)

{
  "job_id": "job_123",
  "status": "queued"
}

10.4 GET /integrations/plaid/import/:job_id

Purpose
Check import job status.

Response (200)

{
  "job_id": "job_123",
  "status": "completed",
  "imported": 84,
  "skipped_duplicates": 6
}

📂 11) CSV Import
11.1 POST /imports/csv

Purpose
Upload and import transactions from CSV.

Rules

CSV must map to a single account

Preview is required before commit

Imported transactions are tagged csv

Request

multipart/form-data
- file: transactions.csv
- account_id: acct_123


Response (200)

{
  "preview": [
    {
      "date": "2025-01-05",
      "amount": -23.50,
      "merchant": "Starbucks"
    }
  ],
  "preview_id": "preview_123"
}

11.2 POST /imports/csv/commit

Purpose
Finalize CSV import.

Request

{
  "preview_id": "preview_123"
}


Response (201)

{
  "imported": 42,
  "skipped_duplicates": 3
}

♻️ 12) Transaction Adjustments & Reversals
12.1 POST /transactions/:id/reverse

Purpose
Reverse a transaction without deleting it.

Rules

Original transaction remains immutable

Reversal creates a new transaction with -amount

Both are linked

Request

{
  "note": "Duplicate charge"
}


Response (201)

{
  "original_transaction_id": "txn_123",
  "reversal_transaction_id": "txn_456"
}

12.2 POST /transactions/adjust

Purpose
Adjust a transaction via delta correction.

Rules

Creates a delta transaction

Does NOT modify original amount

Request

{
  "original_transaction_id": "txn_123",
  "delta_amount": 5.00,
  "note": "Tip correction"
}


Response (201)

{
  "adjustment_transaction_id": "txn_789"
}

🔔 13) Notifications
13.1 GET /notifications

Purpose
Retrieve user notifications.

Response (200)

[
  {
    "notification_id": "not_123",
    "type": "budget_exceeded",
    "message": "Food budget exceeded by $25",
    "created_at": "2025-01-18T12:00:00Z",
    "read": false
  }
]

13.2 PATCH /notifications/:id/read

Purpose
Mark notification as read.

Response (200)

{
  "notification_id": "not_123",
  "read": true
}

13.3 Notification Triggers (System Rules)

Budget exceeded

Large transaction detected

Goal completed

Plaid import completed

Failed import / duplicate spike

📈 14) Investments (Tracking Only)
14.1 POST /investments/accounts

Purpose
Create an investment account (tracking only).

Request

{
  "account_name": "Brokerage",
  "institution": "Robinhood",
  "currency": "USD"
}


Response (201)

{
  "investment_account_id": "inv_acct_123"
}

14.2 POST /investments/holdings

Purpose
Add or update a holding.

Rules

No real trading

Holdings are informational

Valuations are derived

Request

{
  "investment_account_id": "inv_acct_123",
  "symbol": "AAPL",
  "quantity": 10,
  "average_cost": 150
}


Response (201)

{
  "holding_id": "hold_123"
}

14.3 GET /investments/portfolio

Purpose
View portfolio summary.

Response (200)

{
  "total_value": 18450.00,
  "currency": "USD",
  "holdings": [
    {
      "symbol": "AAPL",
      "quantity": 10,
      "market_value": 1900.00
    }
  ]
}
