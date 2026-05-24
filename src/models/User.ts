import mongoose, { Types } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  phone: string;
  adhar: string;
  fatherName?: string;
  dob?: Date;
  address?: string;
  nationality?: string;
  gender?: 'Male' | 'Female' | 'Other';
  pin?: string;
  schoolCollegeName?: string;
  stream?: string;
  className?: string;
  yearOfPassing?: number;
  marksObtained?: number;
  grade?: string;
  batches:Types.ObjectId[];
  mainClasses: Types.ObjectId[];
  profilePic?: string;
  documents?: string[];
  role: 'Admin' | 'Teacher' |'Student'|'TempAdmin';
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String },
  adhar: { type: String, unique: true, sparse: true },
  fatherName: { type: String, trim: true },
  dob: { type: Date },
  address: { type: String, trim: true },
  nationality: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  pin: { type: String, trim: true },
  schoolCollegeName: { type: String, trim: true },
  stream: { type: String, trim: true },
  className: { type: String, trim: true },
  yearOfPassing: { type: Number },
  marksObtained: { type: Number },
  grade: { type: String, trim: true },
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  mainClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MainClass' }],
  profilePic: { type: String, trim: true },
  documents: {
    type: [{ type: String, trim: true }],
    default: [],
    validate: {
      validator: (value: string[]) => value.length <= 3,
      message: 'documents can contain at most 3 images',
    },
  },
  role: { type: String, enum: ['Admin', 'Teacher', 'Student','TempAdmin'], required: true }
}, {
  timestamps: true 
});


const User = mongoose.model<IUser>('User', userSchema);

export default User;