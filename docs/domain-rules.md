Domain Rules
a) Core Principles 

These apply everywhere:

1. Money is never deleted

   * Transactions are immutable.
   * Corrections happen via adjustments or reversals.

2. Derived data > stored data

   * Balances are computed from transactions.
   * Progress is computed, not manually edited.

3. Soft deletes only

   * Users, accounts, budgets use `deleted_at`
   * Historical data must remain queryable.

4. Every monetary change must be auditable

   * Who caused it?
   * When?
   * Why (source: manual, import, system)?



b). User Domain Rules

# User Identity

* A user is uniquely identified by `email`
* Email cannot be changed without re-verification
* One user owns all related entities

# Deletion

* Users cannot be hard-deleted
* When a user is deleted:

  * Accounts become inactive
  * Budgets stop evaluating
  * Data remains for compliance/audit



c). Account Domain Rules

# Ownership

* Each account belongs to exactly one user
* Accounts cannot be shared (v1 constraint)

# Account State

* Accounts can be:

  * `active`
  * `archived` (hidden, read-only)
* Archived accounts:

  * Cannot accept new transactions
  * Still contribute to historical reports

# Balance

* Account balance is computed
* Balance = sum(all transactions linked to account)
* No `balance` column is authoritative

# Currency

* Each account has one currency
* Cross-currency transfers are not supported (v1)



d). Transaction Domain Rules

# Immutability

* Transactions are append-only
* Fields that can never change:

  * amount
  * account
  * timestamp

# Editing

Allowed edits:

* category
* notes
* tags

Disallowed edits:

* amount
* account
* currency

# Deletion

* Transactions are never deleted
* “Delete” means:

  * Create a reversing transaction
  * Link via `reversal_of_transaction_id`

# Types

Transactions have exactly one type:

* income
* expense
* transfer



e). Transfer Rules (Critical)

Transfers are two transactions, always:

| Side                | Amount |
| ------------------- | ------ |
| Source account      | -X     |
| Destination account | +X     |

Rules:

* Both must succeed or both fail (atomic)
* Must share a `transfer_id`
* Cannot be categorized as income or expense


f). Category Rules

# Ownership

* Categories belong to users
* Default system categories exist
* Users can override but not delete system categories

# Assignment

* Each transaction has one category
* Splitting transactions across categories is not supported (v1)



g). Budget Rules

# Definition

A budget is:

* User-owned
* Category-based
* Time-bound (monthly)

h). Evaluation

* Budget usage is computed:

  ```
  sum(transactions in category & month)
  ```

i). Overages

* Budgets can be exceeded
* Exceeding triggers:

  * visual alert
  * optional notification (future)

j). Deletion

* Deleting a budget does NOT affect transactions
* Historical budget performance is preserved



k). Goal Rules

# Goal Types

Goals are always positive accumulation:

* savings
* payoff (treated as inverted savings)

### Progress

* Progress is derived from linked accounts
* Users cannot manually edit progress

### Completion

* A goal completes when progress ≥ target
* Completed goals are locked

---

## 9. Time & Period Rules

* All timestamps stored in UTC
* Display localized in frontend
* Monthly periods are calendar-based
* No rolling budgets (v1)

---

## 10. Import & External Data (Future-Proofing)

### Imports (Plaid / CSV)

* Imported transactions are tagged with `source`
* Imports must be idempotent
* Duplicate detection via:

  * amount
  * date
  * merchant
  * account

---

## 11. Permissions & Security

* Users can only read/write their own data
* No cross-user aggregation
* Admin access does not bypass ownership rules

---

## 12. What Is Explicitly NOT Supported (v1)



*  Shared accounts
*  Multi-currency budgets
*  Transaction splits
*  Investment execution
*  Credit score pulling

---


