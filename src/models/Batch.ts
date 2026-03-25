import mongoose from "mongoose";

export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface IMainClassStudentPair {
  mainClass: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
}

export interface IBatch {
  name: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  teacherEmail: string;
  mainClasses: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
  mainClassStudentPairs: IMainClassStudentPair[];
}

export type ICreateBatchInput = Omit<IBatch, "students" | "mainClassStudentPairs"> & {
  students?: mongoose.Types.ObjectId[];
  mainClassStudentPairs?: IMainClassStudentPair[];
};

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pairSchema = new mongoose.Schema<IMainClassStudentPair>(
  {
    mainClass: { type: mongoose.Schema.Types.ObjectId, ref: "MainClass", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const batchSchema = new mongoose.Schema<IBatch>(
  {
    name: { type: String, required: true, trim: true },
    weekday: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => timeRegex.test(value),
        message: "startTime must be in HH:mm format",
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => timeRegex.test(value),
        message: "endTime must be in HH:mm format",
      },
    },
    teacherEmail: { type: String, required: true, lowercase: true, trim: true },
    mainClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "MainClass", required: true }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    mainClassStudentPairs: {
      type: [pairSchema],
      default: [],
      validate: {
        validator: (pairs: IMainClassStudentPair[]) => {
          const uniquePairs = new Set(
            pairs.map((pair) => `${pair.mainClass.toString()}-${pair.student.toString()}`),
          );
          return uniquePairs.size === pairs.length;
        },
        message: "Duplicate {mainClass, student} pairs are not allowed",
      },
    },
  },
  {
    timestamps: true,
  },
);

const Batch = mongoose.model<IBatch>("Batch", batchSchema);

export default Batch;
