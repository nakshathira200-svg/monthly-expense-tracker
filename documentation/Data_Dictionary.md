# RupeeWise — Data Dictionary

## 1. Overview

RupeeWise is a monthly expense tracking application that stores user accounts, transaction categories, financial transactions, monthly budgets, category-specific budgets, and savings goals.

The MySQL database is named `monthly_expense_tracker`. It contains six relational tables:

1. `users`
2. `categories`
3. `transactions`
4. `monthly_budgets`
5. `category_budgets`
6. `savings_goals`

The database uses the InnoDB storage engine and `utf8mb4` character encoding.

## 2. Table: users

**Purpose:** Stores user account details, authentication information, and account roles.

| Column | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `user_id` | BIGINT UNSIGNED | Primary Key, AUTO_INCREMENT, NOT NULL | Unique identifier for each user. |
| `full_name` | VARCHAR(100) | NOT NULL | Full name of the user. |
| `email` | VARCHAR(254) | UNIQUE, NOT NULL | Email address; duplicate email addresses are not allowed. |
| `password_hash` | VARCHAR(255) | NOT NULL | Stores the user's password hash. |
| `role` | ENUM('USER', 'ADMIN') | NOT NULL, DEFAULT 'USER' | Identifies the user's role. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP, NULL allowed | Records when the account was created. |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP, NULL allowed, ON UPDATE CURRENT_TIMESTAMP | Records the latest automatic update time. |

**Constraints and indexes:**
- `user_id` uniquely identifies each user.
- `email` must be unique.
- `role` accepts only `USER` or `ADMIN`.

## 3. Table: categories

**Purpose:** Stores the categories used to classify income and expense transactions.

| Column | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `category_id` | INT UNSIGNED | Primary Key, AUTO_INCREMENT, NOT NULL | Unique identifier for each category. |
| `name` | VARCHAR(60) | NOT NULL | Name of the category. |
| `transaction_type` | ENUM('INCOME', 'EXPENSE') | NOT NULL | Specifies whether the category is for income or expenses. |

**Constraints and indexes:**
- `category_id` is the primary key.
- The combination of `name` and `transaction_type` must be unique through `uq_category_name_type`.
- `transaction_type` accepts only `INCOME` or `EXPENSE`.

## 4. Table: transactions

**Purpose:** Stores the income and expense transactions recorded by users.

| Column | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `transaction_id` | BIGINT UNSIGNED | Primary Key, AUTO_INCREMENT, NOT NULL | Unique identifier for each transaction. |
| `user_id` | BIGINT UNSIGNED | Foreign Key, NOT NULL | References `users.user_id`; identifies the user who owns the transaction. |
| `category_id` | INT UNSIGNED | Foreign Key, NOT NULL | References `categories.category_id`; identifies the transaction category. |
| `transaction_type` | ENUM('INCOME', 'EXPENSE') | NOT NULL | Indicates whether the transaction represents income or an expense. |
| `description` | VARCHAR(150) | NOT NULL | Short description of the transaction. |
| `amount` | DECIMAL(12,2) | NOT NULL, CHECK amount > 0 | Monetary amount of the transaction. |
| `transaction_date` | DATE | NOT NULL | Date on which the transaction occurred. |
| `notes` | VARCHAR(500) | NULL allowed | Optional additional information about the transaction. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP, NULL allowed | Records when the transaction record was created. |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP, NULL allowed, ON UPDATE CURRENT_TIMESTAMP | Updates automatically when the record changes. |

**Constraints and indexes:**
- `transaction_id` is the primary key.
- `user_id` references `users.user_id`.
- `category_id` references `categories.category_id`.
- `chk_transaction_amount` requires the amount to be greater than zero.
- `idx_transactions_user_date` indexes `user_id` and `transaction_date`.
- `idx_transactions_category` indexes `category_id`.

## 5. Table: monthly_budgets

**Purpose:** Stores the total budget set by each user for a particular month.

| Column | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `budget_id` | BIGINT UNSIGNED | Primary Key, AUTO_INCREMENT, NOT NULL | Unique identifier for each monthly budget. |
| `user_id` | BIGINT UNSIGNED | Foreign Key, NOT NULL | References `users.user_id`; identifies the budget owner. |
| `budget_month` | DATE | NOT NULL | Date representing the budget's month. |
| `total_budget` | DECIMAL(12,2) | NOT NULL, CHECK total_budget > 0 | Total budget amount for the month. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP, NULL allowed | Records when the budget record was created. |

**Constraints and indexes:**
- `budget_id` is the primary key.
- `user_id` references `users.user_id`.
- The combination of `user_id` and `budget_month` must be unique through `uq_user_budget_month`.
- `chk_total_budget` requires the total budget to be greater than zero.

## 6. Table: category_budgets

**Purpose:** Stores a user's budget for a specific category and month.

| Column | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `category_budget_id` | BIGINT UNSIGNED | Primary Key, AUTO_INCREMENT, NOT NULL | Unique identifier for each category budget. |
| `user_id` | BIGINT UNSIGNED | Foreign Key, NOT NULL | References `users.user_id`; identifies the budget owner. |
| `category_id` | INT UNSIGNED | Foreign Key, NOT NULL | References `categories.category_id`; identifies the category being budgeted. |
| `budget_month` | DATE | NOT NULL | Date representing the budget's month. |
| `budget_amount` | DECIMAL(12,2) | NOT NULL, CHECK budget_amount > 0 | Budget amount allocated to the category. |

**Constraints and indexes:**
- `category_budget_id` is the primary key.
- `user_id` references `users.user_id`.
- `category_id` references `categories.category_id`.
- The combination of `user_id`, `category_id`, and `budget_month` must be unique through `uq_user_category_month`.
- `chk_category_budget` requires the category budget to be greater than zero.
- `category_id` has an index named `fk_category_budget_category`.

## 7. Table: savings_goals

**Purpose:** Stores users' savings targets, progress amounts, target dates, and goal statuses.

| Column | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `goal_id` | BIGINT UNSIGNED | Primary Key, AUTO_INCREMENT, NOT NULL | Unique identifier for each savings goal. |
| `user_id` | BIGINT UNSIGNED | Foreign Key, NOT NULL | References `users.user_id`; identifies the goal owner. |
| `title` | VARCHAR(120) | NOT NULL | Name or description of the savings goal. |
| `target_amount` | DECIMAL(12,2) | NOT NULL, CHECK target_amount > 0 | Amount the user aims to save. |
| `current_amount` | DECIMAL(12,2) | NOT NULL, DEFAULT 0.00, CHECK current_amount >= 0 | Amount currently saved toward the goal. |
| `target_date` | DATE | NULL allowed | Optional target date for achieving the goal. |
| `status` | ENUM('ACTIVE', 'COMPLETED', 'PAUSED') | NOT NULL, DEFAULT 'ACTIVE' | Current status of the savings goal. |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP, NULL allowed | Records when the savings goal was created. |

**Constraints and indexes:**
- `goal_id` is the primary key.
- `user_id` references `users.user_id`.
- `chk_goal_target` requires the target amount to be greater than zero.
- `chk_goal_current` requires the current savings amount to be zero or greater.
- `status` accepts only `ACTIVE`, `COMPLETED`, or `PAUSED`.
- `user_id` has an index named `fk_savings_goal_user`.

## 8. Relationships Between Tables

| Parent Table | Child Table | Relationship | Foreign Key |
|---|---|---|---|
| `users` | `transactions` | One-to-Many (1:N) | `transactions.user_id` |
| `categories` | `transactions` | One-to-Many (1:N) | `transactions.category_id` |
| `users` | `monthly_budgets` | One-to-Many (1:N) | `monthly_budgets.user_id` |
| `users` | `category_budgets` | One-to-Many (1:N) | `category_budgets.user_id` |
| `categories` | `category_budgets` | One-to-Many (1:N) | `category_budgets.category_id` |
| `users` | `savings_goals` | One-to-Many (1:N) | `savings_goals.user_id` |

A user can have multiple transactions, monthly budgets, category budgets, and savings goals. A category can be associated with multiple transactions and category budgets.

## 9. Data Integrity and Validation

The schema enforces several data integrity rules:

- **Primary keys:** Each table has a unique identifier for its records.
- **Foreign keys:** Related records must reference existing parent records.
- **Unique constraints:** Duplicate user email addresses, duplicate category name/type combinations, duplicate user/month budgets, and duplicate user/category/month budgets are prevented.
- **CHECK constraints:** Transaction amounts and budget amounts must be positive. Savings target amounts must be positive, and current savings cannot be negative.
- **ENUM constraints:** Transaction types, user roles, and savings goal statuses are restricted to defined values.
- **Defaults:** Default values are provided for user roles, savings progress, goal status, and timestamps where defined.

These constraints help maintain consistency and validity in the relational database.
