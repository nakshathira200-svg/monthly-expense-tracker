USE monthly_expense_tracker;

-- FEATURE 1: View for monthly income and spending summaries
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


-- FEATURE 2: Stored procedure for a selected user's month
DROP PROCEDURE IF EXISTS sp_monthly_summary;

DELIMITER $$

CREATE PROCEDURE sp_monthly_summary(
    IN p_user_id BIGINT UNSIGNED,
    IN p_month DATE
)
BEGIN
    DECLARE v_month_start DATE;
    DECLARE v_next_month DATE;

    SET v_month_start =
        DATE_SUB(p_month, INTERVAL (DAYOFMONTH(p_month) - 1) DAY);

    SET v_next_month =
        DATE_ADD(v_month_start, INTERVAL 1 MONTH);

    SELECT
        DATE_FORMAT(v_month_start, '%Y-%m') AS month,
        COALESCE(
            SUM(
                CASE
                    WHEN t.transaction_type = 'INCOME'
                    THEN t.amount ELSE 0
                END
            ), 0
        ) AS total_income,
        COALESCE(
            SUM(
                CASE
                    WHEN t.transaction_type = 'EXPENSE'
                    THEN t.amount ELSE 0
                END
            ), 0
        ) AS total_expenses,
        COALESCE(
            SUM(
                CASE
                    WHEN t.transaction_type = 'INCOME'
                    THEN t.amount
                    WHEN t.transaction_type = 'EXPENSE'
                    THEN -t.amount
                    ELSE 0
                END
            ), 0
        ) AS net_balance,
        COUNT(t.transaction_id) AS transaction_count
    FROM users u
    LEFT JOIN transactions t
        ON t.user_id = u.user_id
        AND t.transaction_date >= v_month_start
        AND t.transaction_date < v_next_month
    WHERE u.user_id = p_user_id
    GROUP BY u.user_id;
END$$


-- FEATURE 3: Trigger to validate category/type on insertion
DROP TRIGGER IF EXISTS trg_transaction_category_insert;

CREATE TRIGGER trg_transaction_category_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_category_type VARCHAR(10);

    SELECT transaction_type
    INTO v_category_type
    FROM categories
    WHERE category_id = NEW.category_id;

    IF v_category_type IS NULL
       OR v_category_type <> NEW.transaction_type THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Transaction type must match category type';
    END IF;
END$$


-- Apply the same validation when an existing record is edited
DROP TRIGGER IF EXISTS trg_transaction_category_update;

CREATE TRIGGER trg_transaction_category_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_category_type VARCHAR(10);

    SELECT transaction_type
    INTO v_category_type
    FROM categories
    WHERE category_id = NEW.category_id;

    IF v_category_type IS NULL
       OR v_category_type <> NEW.transaction_type THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Transaction type must match category type';
    END IF;
END$$

DELIMITER ;