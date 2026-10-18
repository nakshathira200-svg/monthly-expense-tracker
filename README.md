# RupeeWise — Monthly Expense Tracker

**DBMS Experiential Learning — Level 3 Project**

**Student Name:** Nakshathira B  
**SRN:** PES2UG24AM096

**GitHub Repository:** https://github.com/nakshathira200-svg/monthly-expense-tracker

---

## 1. Project Overview

RupeeWise is a web-based monthly expense tracking and budgeting application designed to help users manage their personal finances. It provides a dashboard for monitoring income and expenses, supports transaction management, allows monthly budget tracking, and provides a workflow for importing transaction statement data.

The project integrates **MySQL and MongoDB** to demonstrate the practical use of relational and NoSQL databases in a single application.

## 2. Problem Statement

Managing personal finances manually can make it difficult to monitor spending, maintain monthly budgets, categorize transactions, and understand overall financial performance. Transaction information may also be stored in different formats, making it harder to organize and analyze.

RupeeWise addresses these problems through a centralized application that organizes financial transactions, summarizes monthly income and expenses, supports budget management, and provides a structured workflow for importing transaction data.

## 3. Objectives

- Develop a functional web application for personal expense tracking.
- Design and implement a relational database with appropriate primary keys, foreign keys, constraints, and indexes.
- Integrate MySQL for structured financial records and MongoDB for imported transaction batches.
- Demonstrate advanced database concepts, including views, stored procedures, triggers, indexes, and transactions.
- Implement authentication, input validation, and user-specific access to financial records.
- Provide clear monthly financial summaries through a web-based dashboard.

## 4. Scope and Features

### User Authentication
- User registration and login.
- Password hashing before storage.
- Session-based authentication using an HTTP-only cookie.
- Access control for user-specific financial records.

### Transaction Management
- Add income and expense transactions.
- Edit and delete existing transactions.
- Assign transactions to appropriate categories.
- Validate transaction dates, amounts, and category/type compatibility.

### Financial Dashboard and Budgeting
- View income and expense information.
- Monitor monthly financial summaries and net balance.
- Set and retrieve a monthly budget.
- Review transaction information through the dashboard.

### Transaction Statement Import
- Submit transaction statement rows in JSON format.
- Store imported batches and their status in MongoDB.
- Validate imported transaction data.
- Infer categories from transaction descriptions where applicable.
- Convert validated import batches into MySQL transaction records.

## 5. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend/API | Next.js Route Handlers |
| Relational database | MySQL |
| NoSQL database | MongoDB |
| Database connectivity | `mysql2`, MongoDB Node.js driver |
| Password hashing | `bcryptjs` |
| Version control | Git and GitHub |

## 6. Database Design

### 6.1 MySQL

MySQL is used as the primary database for structured financial data requiring relationships, consistency, constraints, and transactional operations.

The database is named `monthly_expense_tracker` and contains the following tables:

| Table | Purpose |
|---|---|
| `users` | Stores user accounts, password hashes, and roles. |
| `categories` | Stores income and expense categories. |
| `transactions` | Stores transaction descriptions, amounts, dates, types, and category references. |
| `monthly_budgets` | Stores users' monthly budget limits. |
| `category_budgets` | Stores budget allocations by category and month. |
| `savings_goals` | Stores savings goal details and progress. |

**Relational integrity:** Primary keys identify records, foreign keys maintain relationships, unique constraints prevent duplicate entries in specified combinations, and check constraints enforce valid positive monetary amounts and other data rules.

The complete table definitions are provided in [`database/schema.sql`](database/schema.sql).

### 6.2 MongoDB

MongoDB is used to store imported transaction statement batches in the `monthly_expense_imports` database, primarily through the `bank_statement_imports` collection.

This approach accommodates imported rows and batch-specific metadata, including processing status, before validated financial records are converted into the structured MySQL transactions table.

MongoDB is suitable for this component because imported statement data can vary in structure, while MySQL remains responsible for the application's core financial records.

## 7. Advanced Database Features

The project demonstrates the following advanced database concepts:

1. **Views:** `vw_monthly_financial_summary` summarizes monthly income, expenses, and transaction counts.
2. **Stored procedures:** `sp_monthly_summary` calculates a selected user's monthly income, expenses, net balance, and transaction count.
3. **Triggers:** Insert and update triggers validate that a transaction's type matches its selected category.
4. **Transactions:** Transactional database operations are used during the conversion of validated import batches into MySQL records.
5. **Indexes:** Indexes support transaction lookups and enforce relevant uniqueness requirements.
6. **NoSQL document storage:** MongoDB stores imported transaction batches and their processing status.

The SQL definitions for these features are provided in [`database/advanced_features.sql`](database/advanced_features.sql).

## 8. System Architecture

The application follows this general architecture:

**User Interface → Next.js API Routes → Database Layer → MySQL and MongoDB**

- The Next.js interface provides the dashboard, authentication pages, and import workflow.
- API routes validate incoming data and enforce session-based access control.
- MySQL stores structured user and financial records.
- MongoDB stores imported transaction batches.
- Environment variables hold database connection settings and the session signing secret.

## 9. Prerequisites

Install the following before running the application:

- Node.js and npm.
- MySQL Server.
- MongoDB Server.
- Git.

## 10. Setup and Execution Instructions

### Step 1: Clone the repository

```bash
git clone https://github.com/nakshathira200-svg/monthly-expense-tracker.git
cd monthly-expense-tracker
npm install
```

### Step 2: Create the MySQL database

Open MySQL using an account with permission to create databases:

```bash
mysql -u root -p
```

Run:

```sql
CREATE DATABASE monthly_expense_tracker;
```

For a fresh installation, create a dedicated application user and grant the required permissions. Choose your own strong password:

```sql
CREATE USER 'expense_app'@'localhost'
IDENTIFIED BY 'replace_with_your_own_strong_password';

GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE
ON monthly_expense_tracker.*
TO 'expense_app'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

If the database or application user already exists, reuse the existing configuration rather than recreating it.

### Step 3: Create the database tables

From the project root, run:

```bash
mysql -u root -p monthly_expense_tracker < database/schema.sql
```

Then create the view, stored procedure, and triggers:

```bash
mysql -u root -p monthly_expense_tracker < database/advanced_features.sql
```

**Important:** `schema.sql` contains table-drop statements. Run it against a new or backed-up database because re-running it against an existing database can remove its tables and data.

### Step 4: Populate the transaction categories

For a fresh database, insert the initial categories required by the application and its import workflow. Open MySQL:

```bash
mysql -u root -p monthly_expense_tracker
```

Execute:

```sql
INSERT INTO categories (name, transaction_type) VALUES
('Salary', 'INCOME'),
('Freelance', 'INCOME'),
('Other', 'INCOME'),
('Housing', 'EXPENSE'),
('Groceries', 'EXPENSE'),
('Transport', 'EXPENSE'),
('Bills & utilities', 'EXPENSE'),
('Food & dining', 'EXPENSE'),
('Shopping', 'EXPENSE'),
('Health', 'EXPENSE'),
('Subscriptions', 'EXPENSE'),
('Other', 'EXPENSE');

EXIT;
```

Skip this insert if the categories have already been populated.

### Step 5: Configure environment variables

Create a `.env.local` file in the project root, next to `package.json`.

Add the following configuration and replace the placeholders with your own values:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=expense_app
DB_PASSWORD=replace_with_your_mysql_password
DB_NAME=monthly_expense_tracker

MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=monthly_expense_imports

SESSION_SECRET=replace_with_a_random_secret
```

Generate a strong session secret using:

```bash
openssl rand -base64 32
```

Use the generated value for `SESSION_SECRET`.

**Security note:** Never commit `.env.local` or expose its contents. Database credentials and session secrets must remain outside source control.

### Step 6: Start MongoDB

Ensure the MongoDB service is running locally before using the import functionality.

On macOS with the Homebrew MongoDB service installed, you can start it with:

```bash
brew services start mongodb/brew/mongodb-community
```

### Step 7: Run the application

Start the development server:

```bash
npm run dev
```

Open the application in your browser:

http://localhost:3000

Register an account to access the authenticated application.

### Step 8: Verify the build

Run the following checks from the project root:

```bash
npx tsc --noEmit
npm run build
```

To run the production build locally after a successful build:

```bash
npm run start
```

## 11. Testing and Validation

The following areas have been manually verified during development:

- User registration, login, session verification, and logout.
- Rejection of protected API requests when no valid session exists.
- Creating, editing, and deleting user-owned transactions.
- Saving transaction import batches in MongoDB and converting validated rows into MySQL transactions.
- Rejection of mismatched transaction categories and transaction types by database triggers.
- Execution of the monthly financial summary view and stored procedure.
- TypeScript validation and production build.

These checks demonstrate the integration between the web application, database operations, and validation logic.

## 12. Security and Data Integrity

RupeeWise follows basic security and database integrity practices:

- Passwords are hashed rather than stored in plain text.
- Session tokens are signed and stored in an HTTP-only cookie.
- Protected API routes verify authentication and restrict access to the signed-in user's records.
- Database queries use parameterized statements for user-provided values.
- Database connection details and session secrets are stored in environment variables.
- Database constraints and triggers help maintain consistent financial records.

## 13. Future Enhancements

Possible extensions to the project include:

- Direct CSV or spreadsheet file upload and parsing.
- More detailed category-wise spending analytics and visual reports.
- A complete savings-goal management interface.
- Exportable monthly financial statements.
- Additional reporting and budget-comparison features.

## 14. Conclusion

RupeeWise demonstrates how a functional web application can combine relational and NoSQL databases to address a real-world personal finance problem. By integrating transaction management, budgeting, statement imports, authentication, and advanced SQL features, the project connects database design concepts with practical application development.

The project illustrates the role of relational integrity, database-side validation, stored procedures, views, triggers, indexes, and document storage in building a more structured and maintainable financial application.
