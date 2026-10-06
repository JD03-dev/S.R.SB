import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const id = () => ({ type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true });
const required = (type) => ({ type, allowNull: false });

export const Business = sequelize.define('Business', {
  id: id(),
  name: required(DataTypes.STRING(120)),
  timezone: required(DataTypes.STRING(80)),
  openingTime: required(DataTypes.TIME),
  closingTime: required(DataTypes.TIME),
  breakStart: DataTypes.TIME,
  breakEnd: DataTypes.TIME,
  serviceDurationMinutes: required(DataTypes.INTEGER),
}, { tableName: 'businesses' });

export const WeeklySchedule = sequelize.define('WeeklySchedule', {
  id: id(),
  businessId: required(DataTypes.UUID),
  weekStart: required(DataTypes.DATEONLY),
  publicCode: { ...required(DataTypes.UUID), defaultValue: DataTypes.UUIDV4 },
}, { tableName: 'weekly_schedules' });

export const ScheduleDay = sequelize.define('ScheduleDay', {
  id: id(),
  weeklyScheduleId: required(DataTypes.UUID),
  date: required(DataTypes.DATEONLY),
  status: { ...required(DataTypes.STRING(16)), defaultValue: 'DRAFT' },
}, { tableName: 'schedule_days' });

export const TimeSlot = sequelize.define('TimeSlot', {
  id: id(),
  scheduleDayId: required(DataTypes.UUID),
  startsAt: required(DataTypes.DATE),
  endsAt: required(DataTypes.DATE),
  isBlocked: { ...required(DataTypes.BOOLEAN), defaultValue: false },
}, { tableName: 'time_slots' });

export const Customer = sequelize.define('Customer', {
  id: id(),
  name: required(DataTypes.STRING(120)),
  phone: required(DataTypes.STRING(20)),
}, { tableName: 'customers' });

export const Reservation = sequelize.define('Reservation', {
  id: id(),
  timeSlotId: required(DataTypes.UUID),
  customerId: required(DataTypes.UUID),
  code: required(DataTypes.STRING(9)),
  status: { ...required(DataTypes.STRING(16)), defaultValue: 'CONFIRMED' },
  cancelledAt: DataTypes.DATE,
}, { tableName: 'reservations' });

export const Admin = sequelize.define('Admin', {
  id: id(),
  businessId: required(DataTypes.UUID),
  name: required(DataTypes.STRING(80)),
  email: required(DataTypes.STRING(160)),
  username: required(DataTypes.STRING(30)),
  passwordHash: required(DataTypes.STRING(255)),
  recoveryCodeHash: required(DataTypes.CHAR(64)),
  role: { ...required(DataTypes.STRING(10)), defaultValue: 'ADMIN' },
  createdBy: DataTypes.UUID,
}, { tableName: 'admins' });

export const AdminSession = sequelize.define('AdminSession', {
  id: id(),
  adminId: required(DataTypes.UUID),
  tokenHash: required(DataTypes.CHAR(64)),
  lastSeenAt: { ...required(DataTypes.DATE), defaultValue: DataTypes.NOW },
}, { tableName: 'admin_sessions', updatedAt: false });

Business.hasMany(Admin, { foreignKey: 'businessId', as: 'admins' });
Admin.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
Admin.belongsTo(Admin, { foreignKey: 'createdBy', as: 'creator' });
AdminSession.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

Business.hasMany(WeeklySchedule, { foreignKey: 'businessId', as: 'schedules' });
WeeklySchedule.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
WeeklySchedule.hasMany(ScheduleDay, { foreignKey: 'weeklyScheduleId', as: 'days' });
ScheduleDay.belongsTo(WeeklySchedule, { foreignKey: 'weeklyScheduleId', as: 'schedule' });
ScheduleDay.hasMany(TimeSlot, { foreignKey: 'scheduleDayId', as: 'slots' });
TimeSlot.belongsTo(ScheduleDay, { foreignKey: 'scheduleDayId', as: 'day' });
TimeSlot.hasMany(Reservation, { foreignKey: 'timeSlotId', as: 'reservations' });
Reservation.belongsTo(TimeSlot, { foreignKey: 'timeSlotId', as: 'slot' });
Customer.hasMany(Reservation, { foreignKey: 'customerId', as: 'reservations' });
Reservation.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
