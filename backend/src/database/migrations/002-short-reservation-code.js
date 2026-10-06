// Short reservation codes (SB-XXXXXX) are easier to read aloud and type than UUIDs.
export async function up({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      ALTER TABLE reservations
        ALTER COLUMN code TYPE VARCHAR(9)
        USING 'SB-' || UPPER(SUBSTRING(REPLACE(code::text, '-', '') FROM 1 FOR 6));
      ALTER TABLE reservations
        ADD CONSTRAINT reservations_code_format CHECK (code ~ '^SB-[A-Z0-9]{6}$');
    `, { transaction });
  });
}

export async function down({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      ALTER TABLE reservations DROP CONSTRAINT reservations_code_format;
      ALTER TABLE reservations ALTER COLUMN code TYPE UUID USING gen_random_uuid();
    `, { transaction });
  });
}
