 import express from 'express'; 
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import { config } from './config/db';
import authRoutes from './routes/Auth_routes';
import classRoutes from './routes/Class_routes';
import userRoutes from './routes/user_routes';
import attendenceRoutes from './routes/attendence_routes';
import feesRoutes from './routes/fees_routes';
import mainClassRoutes from './routes/mainclass_routes';
import { errorHandler } from './middleware/errorMiddleware';
import { initializeFeesReminderCron } from './services/fees_cron_service';

dotenv.config();

const app = express();


app.use(cors({
  origin: [
    "http://localhost:3000"
  ],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Express TypeScript Server!');
});

app.use('/auth', authRoutes);
app.use('/batch', classRoutes);
app.use('/user', userRoutes);
app.use('/attendence', attendenceRoutes);
app.use('/fees', feesRoutes);
app.use('/mainclass', mainClassRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

const connectDB = async () => {
  try {
    await mongoose.connect(config.dbUrl);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Failed:', error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();

    // Start cron only after DB is ready
    initializeFeesReminderCron();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error);
  }
};

startServer();

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
