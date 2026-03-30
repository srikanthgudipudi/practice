import { pool } from './index';

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_type AS ENUM ('CASH','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','UPI','CHEQUE','OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE frequency_type AS ENUM ('DAILY','WEEKLY','MONTHLY','YEARLY');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE alert_type AS ENUM ('BUDGET_THRESHOLD','CATEGORY_THRESHOLD','LARGE_TRANSACTION');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          user_role NOT NULL DEFAULT 'USER',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(100) NOT NULL,
        icon       VARCHAR(50),
        color      VARCHAR(7),
        parent_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type             transaction_type NOT NULL,
        amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        description      VARCHAR(255),
        category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
        payment_type     payment_type NOT NULL DEFAULT 'CASH',
        payee_name       VARCHAR(100),
        transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
        is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
        recurring_id     UUID,
        receipt_url      VARCHAR(500),
        ocr_raw          JSONB,
        ocr_verified     BOOLEAN NOT NULL DEFAULT FALSE,
        notes            TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Recurring transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title            VARCHAR(255) NOT NULL,
        type             transaction_type NOT NULL,
        amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
        payment_type     payment_type NOT NULL DEFAULT 'CASH',
        frequency        frequency_type NOT NULL,
        start_date       DATE NOT NULL,
        end_date         DATE,
        next_due_date    DATE NOT NULL,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add FK from transactions to recurring_transactions
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions
          ADD CONSTRAINT fk_recurring FOREIGN KEY (recurring_id)
          REFERENCES recurring_transactions(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Monthly budgets
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year         SMALLINT NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, month, year)
      );
    `);

    // Category budgets
    await client.query(`
      CREATE TABLE IF NOT EXISTS category_budgets (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year        SMALLINT NOT NULL,
        amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, category_id, month, year)
      );
    `);

    // Alert configs
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_configs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type            alert_type NOT NULL,
        threshold_value NUMERIC(10,2) NOT NULL,
        category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_transactions(next_due_date) WHERE is_active = TRUE;`);

    // Seed default categories
    await client.query(`
      INSERT INTO categories (name, icon, color, is_default) VALUES
        ('Food',              'restaurant',       '#FF6B6B', TRUE),
        ('Transport',         'directions_car',   '#4ECDC4', TRUE),
        ('Bills & Utilities', 'receipt_long',     '#45B7D1', TRUE),
        ('Health',            'favorite',         '#96CEB4', TRUE),
        ('Entertainment',     'movie',            '#FFEAA7', TRUE),
        ('Shopping',          'shopping_bag',     '#DDA0DD', TRUE),
        ('Education',         'school',           '#98D8C8', TRUE),
        ('Personal Care',     'self_improvement', '#F7DC6F', TRUE),
        ('Others',            'category',         '#BDC3C7', TRUE)
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
