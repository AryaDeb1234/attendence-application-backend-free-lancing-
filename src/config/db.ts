import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/test',
  nodeEnv: process.env.NODE_ENV || 'development',
  attendanceAdminEmails: (process.env.ATTENDANCE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean),
};