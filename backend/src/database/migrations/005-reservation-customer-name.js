// Each reservation keeps the name it was made with; the customer row (shared by phone)
// is overwritten by later bookings, so it cannot be the source of the reservation's name.
export async function up({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      ALTER TABLE reservations ADD COLUMN customer_name VARCHAR(120);
      UPDATE reservations r SET customer_name = c.name FROM customers c WHERE c.id = r.customer_id;
      ALTER TABLE reservations ALTER COLUMN customer_name SET NOT NULL;
    `, { transaction });
  });
}

export async function down({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('ALTER TABLE reservations DROP COLUMN customer_name;', { transaction });
  });
}
