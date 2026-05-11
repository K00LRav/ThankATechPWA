/**
 * Idempotent schema migration script.
 * Applies all DB schema changes without interactive prompts.
 * Run via: node scripts/migrate.mjs
 */
import pg from '/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = [
  // auth tables (Replit Auth — mandatory)
  `CREATE TABLE IF NOT EXISTS sessions (
    sid varchar PRIMARY KEY,
    sess jsonb NOT NULL,
    expire timestamp NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire)`,
  `CREATE TABLE IF NOT EXISTS users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar UNIQUE,
    first_name varchar,
    last_name varchar,
    profile_image_url varchar,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
  )`,

  // profiles
  `CREATE TABLE IF NOT EXISTS profiles (
    id serial PRIMARY KEY,
    user_id varchar UNIQUE,
    full_name text NOT NULL,
    avatar_url text,
    user_type text NOT NULL DEFAULT 'customer',
    phone text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  )`,

  // technicians
  `CREATE TABLE IF NOT EXISTS technicians (
    id serial PRIMARY KEY,
    full_name text NOT NULL,
    avatar_url text,
    specialty text NOT NULL,
    specialties text[] NOT NULL DEFAULT '{}',
    service_area text NOT NULL,
    bio text NOT NULL DEFAULT '',
    hourly_rate numeric(10,2),
    certifications text[] NOT NULL DEFAULT '{}',
    total_thanks integer NOT NULL DEFAULT 0,
    total_earned numeric(12,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE technicians ADD COLUMN IF NOT EXISTS user_id varchar`,
  `ALTER TABLE technicians ADD COLUMN IF NOT EXISTS stripe_account_id varchar`,
  `ALTER TABLE technicians ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false`,
  `CREATE UNIQUE INDEX IF NOT EXISTS technicians_user_id_unique ON technicians(user_id) WHERE user_id IS NOT NULL`,

  // jobs
  `CREATE TABLE IF NOT EXISTS jobs (
    id serial PRIMARY KEY,
    customer_id integer NOT NULL,
    customer_name text NOT NULL DEFAULT '',
    technician_id integer NOT NULL,
    technician_name text NOT NULL DEFAULT '',
    title text NOT NULL,
    description text,
    address text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone
  )`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone`,

  // thank_messages
  `CREATE TABLE IF NOT EXISTS thank_messages (
    id serial PRIMARY KEY,
    job_id integer NOT NULL,
    customer_id integer NOT NULL,
    customer_name text NOT NULL DEFAULT '',
    technician_id integer NOT NULL,
    technician_name text NOT NULL DEFAULT '',
    technician_avatar text,
    message text NOT NULL,
    tip_amount numeric(10,2) NOT NULL DEFAULT 0,
    photo_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE thank_messages ADD COLUMN IF NOT EXISTS stripe_payment_intent_id varchar`,
  `ALTER TABLE thank_messages ADD COLUMN IF NOT EXISTS payment_status varchar NOT NULL DEFAULT 'none'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS thank_messages_job_id_customer_id_unique ON thank_messages(job_id, customer_id)`,

  // points
  `CREATE TABLE IF NOT EXISTS points (
    id serial PRIMARY KEY,
    user_id integer NOT NULL UNIQUE,
    balance integer NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS point_transactions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    job_id integer,
    description text NOT NULL DEFAULT '',
    created_at timestamp with time zone NOT NULL DEFAULT now()
  )`,

  // push_tokens
  `CREATE TABLE IF NOT EXISTS push_tokens (
    id serial PRIMARY KEY,
    profile_id integer NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT push_tokens_profile_id_token_unique UNIQUE (profile_id, token)
  )`,
];

async function run() {
  const client = await pool.connect();
  let ok = 0;
  let skipped = 0;
  try {
    for (const sql of migrations) {
      try {
        await client.query(sql);
        ok++;
      } catch (e) {
        // Already exists or benign conflict — log and continue
        console.warn('  SKIP:', e.message.split('\n')[0]);
        skipped++;
      }
    }
    console.log(`Migration complete: ${ok} applied, ${skipped} skipped`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('Migration failed:', e.message);
  pool.end();
  process.exit(1);
});
