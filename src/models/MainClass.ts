import mongoose from "mongoose";

export interface IMainClass {
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  fees: number;
  teachers: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
  batches: mongoose.Types.ObjectId[];
  isActive: boolean;
}

export type ICreateMainClassInput = Omit<IMainClass, "teacherName" | "students" | "batches" | "isActive" | "endDate"> & {
  endDate?: Date;
  teachers?: mongoose.Types.ObjectId[];
  students?: mongoose.Types.ObjectId[];
  batches?: mongoose.Types.ObjectId[];
  isActive?: boolean;
};

const mainClassSchema = new mongoose.Schema<IMainClass>(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    duration: { type: Number, required: true, min: 1 },
    endDate: { type: Date, required: true },
    fees: { type: Number, required: true, min: 0 },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

const MainClass = mongoose.model<IMainClass>("MainClass", mainClassSchema);

export default MainClass;
