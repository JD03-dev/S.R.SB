export async function up({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      CREATE TABLE admins (
        id UUID PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(160) NOT NULL,
        username VARCHAR(30) NOT NULL CHECK (username ~ '^[a-z0-9._]{3,30}$'),
        password_hash VARCHAR(255) NOT NULL,
        recovery_code_hash CHAR(64) NOT NULL UNIQUE,
        role VARCHAR(10) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('OWNER', 'ADMIN')),
        created_by UUID REFERENCES admins(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (email = LOWER(email))
      );
      CREATE UNIQUE INDEX admins_username_unique ON admins (username);
      CREATE UNIQUE INDEX admins_email_unique ON admins (email);
      -- Only the first registered account (Santiago) is the owner.
      CREATE UNIQUE INDEX admins_single_owner ON admins (role) WHERE role = 'OWNER';

      CREATE TABLE admin_sessions (
        id UUID PRIMARY KEY,
        admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        token_hash CHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      -- At most one admin session can exist in the whole system.
      CREATE UNIQUE INDEX admin_sessions_single_active ON admin_sessions ((true));
    `, { transaction });
  });
}

export async function down({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('DROP TABLE admin_sessions; DROP TABLE admins;', { transaction });
  });
}
