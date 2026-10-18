import mysql from "mysql2/promise";

const globalForMySQL = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

export const pool =
  globalForMySQL.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? "3306"),
    user: process.env.DB_USER ?? "expense_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "monthly_expense_tracker",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForMySQL.mysqlPool = pool;
}