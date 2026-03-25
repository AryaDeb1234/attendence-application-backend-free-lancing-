import express from 'express';
import { config } from './config/db';
import authRoutes from './routes/Auth_routes';
import classRoutes from './routes/Class_routes';
import userRoutes from './routes/user_routes';
import attendenceRoutes from './routes/attendence_routes';
import feesRoutes from './routes/fees_routes';
import mainClassRoutes from './routes/mainclass_routes';
import { errorHandler } from './middleware/errorMiddleware';
import mongoose from 'mongoose'; 

const app = express();

app.get('/', (req, res) => {
  res.send('Welcome to the Express TypeScript Server!');
}
);
 
export const connectDB = async () => {
  try {
    await mongoose.connect(config.dbUrl);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Failed:', error);
    process.exit(1);
  }
};   
 

connectDB();  


app.use(express.json());

 

app.use('/auth', authRoutes);
app.use('/batch', classRoutes);
app.use('/user', userRoutes);
app.use('/attendence', attendenceRoutes);
app.use('/fees', feesRoutes);
app.use('/mainclass', mainClassRoutes);




app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 Server running on :${config.port}`);
});