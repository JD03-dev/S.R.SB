export async function up({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      CREATE TABLE businesses (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        timezone VARCHAR(80) NOT NULL,
        opening_time TIME NOT NULL DEFAULT '08:00',
        closing_time TIME NOT NULL DEFAULT '20:00',
        break_start TIME DEFAULT '12:00',
        break_end TIME DEFAULT '13:00',
        service_duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (service_duration_minutes > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (opening_time < closing_time),
        CHECK ((break_start IS NULL AND break_end IS NULL) OR
          (break_start IS NOT NULL AND break_end IS NOT NULL AND
           break_start >= opening_time AND break_end <= closing_time AND break_start < break_end))
      );
      CREATE TABLE weekly_agendas (
        id UUID PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
        week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
        public_code UUID NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (business_id, week_start)
      );
      CREATE TABLE agenda_days (
        id UUID PRIMARY KEY,
        weekly_agenda_id UUID NOT NULL REFERENCES weekly_agendas(id) ON DELETE RESTRICT,
        date DATE NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'DISABLED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (weekly_agenda_id, date)
      );
      CREATE TABLE time_slots (
        id UUID PRIMARY KEY,
        agenda_day_id UUID NOT NULL REFERENCES agenda_days(id) ON DELETE RESTRICT,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (starts_at < ends_at),
        UNIQUE (agenda_day_id, starts_at)
      );
      CREATE TABLE customers (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE reservations (
        id UUID PRIMARY KEY,
        time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE RESTRICT,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        code UUID NOT NULL UNIQUE,
        status VARCHAR(16) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL))
      );
      -- Una cancelación conserva el historial y libera la capacidad del espacio.
      CREATE UNIQUE INDEX reservations_one_active_per_slot
        ON reservations (time_slot_id) WHERE status IN ('CONFIRMED', 'COMPLETED');
      CREATE INDEX reservations_customer_id ON reservations (customer_id);
      CREATE INDEX agenda_days_publication ON agenda_days (weekly_agenda_id, status);
    `, { transaction });
  });
}

export async function down({ context: sequelize }) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`
      DROP TABLE reservations;
      DROP TABLE customers;
      DROP TABLE time_slots;
      DROP TABLE agenda_days;
      DROP TABLE weekly_agendas;
      DROP TABLE businesses;
    `, { transaction });
  });
}
