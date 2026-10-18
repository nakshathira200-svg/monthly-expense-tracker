# RupeeWise — SQL Implementation

## 1. Overview

RupeeWise uses MySQL to manage user accounts, financial transactions, categories, monthly budgets, category budgets, and savings goals.

The database demonstrates advanced SQL functionality through a view, a stored procedure, and two triggers. These features support financial reporting and enforce data consistency.

## 2. Feature 1: Monthly Financial Summary View

**View name:** `vw_monthly_financial_summary`

**Purpose:** Provides monthly income, expense, and transaction-count summaries for each user.

**SQL implementation:**

```sql
CREATE OR REPLACE VIEW vw_monthly_financial_summary AS
SELECT
    t.user_id,
    DATE_FORMAT(t.transaction_date, '%Y-%m') AS transaction_month,
    SUM(
        CASE
            WHEN t.transaction_type = 'INCOME'
            THEN t.amount ELSE 0
        END
    ) AS total_income,
    SUM(
        CASE
            WHEN t.transaction_type = 'EXPENSE'
            THEN t.amount ELSE 0
        END
    ) AS total_expenses,
    COUNT(*) AS transaction_count
FROM transactions t
GROUP BY
    t.user_id,
    DATE_FORMAT(t.transaction_date, '%Y-%m');
```

**How it works:**
- `DATE_FORMAT()` groups transaction dates by year and month.
- `CASE` separates income from expenses.
- `SUM()` calculates total income and expenses.
- `COUNT()` counts transactions.
- `GROUP BY` produces a result for each user and month.

**Example query:**

```sql
SELECT *
FROM vw_monthly_financial_summary
ORDER BY transaction_month DESC;
```

**Benefit:** Simplifies repeated monthly financial reporting.

**Limitation:** The view displays user-month combinations that have transactions. Months without transactions are not included.

## 3. Feature 2: Monthly Summary Stored Procedure

**Procedure name:** `sp_monthly_summary`

**Purpose:** Calculates the total income, total expenses, net balance, and transaction count for a specified user and month.

**Input parameters:**

| Parameter | Data type | Purpose |
|---|---|---|
| `p_user_id` | BIGINT UNSIGNED | Identifies the user. |
| `p_month` | DATE | Specifies a date within the month to summarize. |

**How it works:**

1. Calculates the first day of the requested month.
2. Calculates the first day of the next month.
3. Retrieves the selected user's transactions within that date range.
4. Calculates income and expenses using conditional aggregation.
5. Calculates net balance as income minus expenses.
6. Uses `COALESCE()` to return zero for missing monetary totals.

**Net balance formula:**

Net balance = Total income − Total expenses

**Example execution:**

```sql
CALL sp_monthly_summary(1, '2026-10-01');
```

Replace `1` with an existing user ID when testing.

**Benefit:** Provides a reusable monthly report without requiring the application to rewrite the aggregation logic for every request.

The procedure uses a `LEFT JOIN`, allowing an existing user with no transactions for the selected month to receive zero monetary totals. A nonexistent user produces no result row.

## 4. Feature 3: Insert Validation Trigger

**Trigger name:** `trg_transaction_category_insert`

**Timing:** `BEFORE INSERT` on the `transactions` table.

**Purpose:** Ensures that a transaction's type matches the type of its selected category before insertion.

**How it works:**

1. Reads the proposed category ID using `NEW.category_id`.
2. Retrieves the category's `transaction_type`.
3. Compares it with `NEW.transaction_type`.
4. Raises an error if the types do not match.

The trigger uses:

```sql
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'Transaction type must match category type';
```

**Benefit:** Prevents inconsistent income and expense transactions from being inserted, including through direct SQL operations.

## 5. Feature 4: Update Validation Trigger

**Trigger name:** `trg_transaction_category_update`

**Timing:** `BEFORE UPDATE` on the `transactions` table.

**Purpose:** Applies the same category/type validation when an existing transaction is modified.

**How it works:**

1. Reads the proposed category using `NEW.category_id`.
2. Retrieves the category's transaction type.
3. Compares the category type with `NEW.transaction_type`.
4. Rejects an inconsistent update using `SIGNAL SQLSTATE '45000'`.

**Benefit:** Maintains data consistency when users edit transactions, preventing a valid record from becoming inconsistent after an update.

## 6. SQL Concepts Demonstrated

| SQL concept | Application in RupeeWise |
|---|---|
| View | Reusable monthly financial summaries |
| Stored procedure | Parameterized monthly financial reporting |
| Triggers | Validation before inserts and updates |
| `CASE` | Conditional income and expense calculations |
| `SUM()` | Calculation of monetary totals |
| `COUNT()` | Transaction counting |
| `GROUP BY` | Grouping transactions by user and month |
| `LEFT JOIN` | Preserving the selected user when no transactions match |
| `COALESCE()` | Replacing missing monetary totals with zero |
| Date functions | Calculation of calendar-month boundaries |
| `SIGNAL SQLSTATE` | Raising an error when validation fails |

## 7. Testing and Verification

### Test 1: Query the summary view

```sql
SELECT *
FROM vw_monthly_financial_summary;
```

**Expected result:** Monthly income totals, expense totals, and transaction counts for user-month combinations containing transactions.

### Test 2: Execute the stored procedure

```sql
CALL sp_monthly_summary(1, '2026-10-01');
```

**Expected result:** A monthly report containing income, expenses, net balance, and transaction count for the selected existing user.

### Test 3: Test insert validation

Attempt to insert a transaction whose transaction type does not match its category type.

**Expected result:** The insert is rejected with the message:

`Transaction type must match category type`

### Test 4: Test update validation

Attempt to update an existing transaction so that its category and transaction type no longer match.

**Expected result:** The update is rejected with the same validation message.

### Test 5: Verify database objects

```sql
SHOW FULL TABLES;

SHOW PROCEDURE STATUS
WHERE Db = 'monthly_expense_tracker';

SHOW TRIGGERS;
```

**Expected result:** The database lists its installed objects, including the view, stored procedure, and triggers when successfully created.

## 8. Conclusion

RupeeWise demonstrates the use of advanced SQL features for financial reporting and data integrity.

The monthly financial summary view simplifies aggregation, the stored procedure generates reports for selected users and months, and the insert and update triggers enforce category/type consistency.

Together, these features demonstrate the practical use of views, stored procedures, triggers, conditional aggregation, joins, date functions, and database-level validation.