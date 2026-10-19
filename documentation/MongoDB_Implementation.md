# RupeeWise — MongoDB Implementation

## 1. Overview

RupeeWise uses MySQL and MongoDB for different types of data.

- **MySQL** stores structured relational data such as users, transactions, categories, budgets, and savings goals.
- **MongoDB** stores bank statement import batches, including statement metadata and imported rows.

MongoDB is appropriate for statement imports because different statements may contain different fields. Its document model can represent the imported rows without requiring every row to have an identical structure.

## 2. Database Configuration

The MongoDB connection is implemented in `lib/mongo.ts`.

The connection URI is obtained from the `MONGO_URI` environment variable. The database name is obtained from `MONGO_DB`, with `monthly_expense_imports` as the fallback value.

The application uses the official MongoDB Node.js driver and exposes a `getMongoDb()` function for accessing the database.

The connection promise is cached in `globalThis` outside production to help avoid creating repeated connections during development reloads.

Database connection settings are kept in environment variables rather than hard-coded credentials.

## 3. Collection Design

**Collection:** `bank_statement_imports`

This collection stores each statement submission as a document.

### Document structure

| Field | Data type | Description |
|---|---|---|
| `_id` | ObjectId | MongoDB-generated document identifier. |
| `userId` | Number | Identifies the user who owns the import batch. |
| `sourceName` | String | Name of the imported statement. |
| `importedAt` | Date | Date and time the batch was submitted. |
| `status` | String | Import-processing status. |
| `rowCount` | Number | Number of rows submitted in the batch. |
| `rows` | Array of objects | The submitted statement rows. Each row can contain its own fields. |

### Import statuses

The application defines these status values:

- `PENDING_REVIEW`
- `CONVERTING`
- `CONVERTED`

When a new batch is created by the import API, its initial status is `PENDING_REVIEW`.

### Example document

The following is an illustrative document showing the collection structure:

```json
{
  "_id": "MongoDB-generated ObjectId",
  "userId": 1,
  "sourceName": "October Statement",
  "importedAt": "2026-10-18T12:00:00.000Z",
  "status": "PENDING_REVIEW",
  "rowCount": 2,
  "rows": [
    {
      "date": "2026-10-02",
      "description": "Groceries",
      "amount": 850,
      "transaction_type": "EXPENSE"
    },
    {
      "date": "2026-10-05",
      "description": "Salary",
      "amount": 40000,
      "transaction_type": "INCOME"
    }
  ]
}
```

This example illustrates the data model. The row field names depend on the statement data submitted by the application.

## 4. API Integration

The import API is implemented in `app/api/imports/route.ts`.

It connects the Next.js application to MongoDB through the `getMongoDb()` function and uses the authenticated session to associate imports with users.

### 4.1 POST — Create an import batch

The `POST` handler creates a new document in `bank_statement_imports`.

The process is:

1. Checks whether the user has an authenticated session.
2. Reads the submitted request body.
3. Validates the statement name and imported rows.
4. Creates an import batch with the authenticated user's ID.
5. Sets the import timestamp and initial status.
6. Inserts the batch into MongoDB.
7. Returns the generated identifier and batch information.

### Validation rules

- The request body must be a JSON object.
- The statement name must be a non-empty string of at most 255 characters.
- The rows value must be an array containing between 1 and 500 rows.
- Each row must be an object, not null or an array.
- Authentication is required before creating an import batch.

The API returns HTTP `201` when a batch is created successfully, `400` for invalid input, `401` when the user is not authenticated, and `500` when a server-side operation fails.

### 4.2 GET — Retrieve import batches

The `GET` handler retrieves the signed-in user's import batches.

The database query:

- Filters documents using `userId` from the authenticated session.
- Sorts results by `importedAt` in descending order.
- Limits results to the 20 most recent batches.
- Returns a preview containing at most the first three rows from each batch.

The response includes the batch identifier, statement name, import timestamp, status, row count, and preview.

This provides a way for the application to display recent statement imports without returning every imported row.

## 5. Data Flow

The import workflow can be represented as follows:

1. The signed-in user submits statement data through the application.
2. The Next.js import API verifies the session and validates the request.
3. The API stores the submitted batch in MongoDB.
4. The application can retrieve recent batches through the GET endpoint.
5. Imported rows can be reviewed and processed for conversion into MySQL transaction records.

The MongoDB batch preserves the submitted statement data separately from the normalized transaction records in MySQL.

## 6. Why Both MySQL and MongoDB Are Used

| Requirement | Database | Reason |
|---|---|---|
| Users and account relationships | MySQL | Relational structure, keys, and constraints. |
| Financial transactions | MySQL | Structured records, validation, and aggregation. |
| Monthly and category budgets | MySQL | Relationships and financial integrity. |
| Savings goals | MySQL | Structured records linked to users. |
| Imported statement batches | MongoDB | Flexible documents containing statement rows. |

MySQL remains the source for the application's structured financial records. MongoDB provides a separate document store for imported statement data.

Using both databases demonstrates SQL and NoSQL integration in one application.

## 7. Security and Data Integrity

The import API includes the following protections:

- **Authentication:** Both GET and POST require an authenticated session.
- **User data isolation:** GET queries only the current user's batches.
- **Input validation:** The API validates the request body, statement name, row count, and row structure.
- **Configuration security:** The MongoDB URI is read from an environment variable.
- **Error handling:** Database failures return a generic error response, while detailed errors are logged server-side.

The API checks that each row is an object, but it does not, by itself, verify every possible statement field or guarantee that every row is a valid financial transaction. Additional transaction-level validation is required before importing rows into MySQL.

## 8. Indexing

MongoDB provides a default index on each document's `_id` field.

The displayed import API does not create any additional indexes. Its main query filters on `userId` and sorts on `importedAt`. For a larger dataset, a compound index on `{ userId: 1, importedAt: -1 }` could be evaluated to support this query pattern.

## 9. Testing

The following tests can be used to demonstrate the MongoDB integration:

| Test | Expected result |
|---|---|
| Access GET without signing in | HTTP 401 response. |
| Submit POST without signing in | HTTP 401 response. |
| Submit an invalid request body | HTTP 400 response. |
| Submit a statement with an empty name | HTTP 400 response. |
| Submit an empty array or more than 500 rows | HTTP 400 response. |
| Submit a row that is not an object | HTTP 400 response. |
| Submit a valid batch while signed in | HTTP 201 response with the batch identifier. |
| Retrieve batches while signed in | Only that user's batches are returned, sorted from newest to oldest, with a maximum of 20 results. |

These are the expected results from the API's implementation. Actual testing results should be recorded separately after executing each test.

## 10. Conclusion

MongoDB supports RupeeWise by storing statement imports as flexible documents, while MySQL manages the application's structured financial records.

The integration demonstrates document-based storage, API-driven database access, session-based ownership checks, input validation, and a practical use of both relational and NoSQL databases.