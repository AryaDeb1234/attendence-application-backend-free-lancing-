import mongoose, { Types } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  phone: string;
  adhar: string;
  batches:Types.ObjectId[];
  mainClasses: Types.ObjectId[];
  profilePic?: string;
  documents?: string[];
  role: 'Admin' | 'Teacher' |'Student'|'TempAdmin';
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: { type: String },
  adhar: { type: String, unique: true, sparse: true },
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