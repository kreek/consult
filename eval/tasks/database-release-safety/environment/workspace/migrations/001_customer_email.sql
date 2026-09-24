ALTER TABLE customers ADD COLUMN email text;
CREATE UNIQUE INDEX customers_email_idx ON customers (email);
