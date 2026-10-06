// Renames the Spanish-looking "agenda" tables/columns to "schedule" without touching data.
export async function up({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      ALTER TABLE weekly_agendas RENAME TO weekly_schedules;
      ALTER TABLE agenda_days RENAME TO schedule_days;
      ALTER TABLE schedule_days RENAME COLUMN weekly_agenda_id TO weekly_schedule_id;
      ALTER TABLE time_slots RENAME COLUMN agenda_day_id TO schedule_day_id;
      ALTER INDEX agenda_days_publication RENAME TO schedule_days_publication;
    `, { transaction });
  });
}

export async function down({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      ALTER INDEX schedule_days_publication RENAME TO agenda_days_publication;
      ALTER TABLE time_slots RENAME COLUMN schedule_day_id TO agenda_day_id;
      ALTER TABLE schedule_days RENAME COLUMN weekly_schedule_id TO weekly_agenda_id;
      ALTER TABLE schedule_days RENAME TO agenda_days;
      ALTER TABLE weekly_schedules RENAME TO weekly_agendas;
    `, { transaction });
  });
}
