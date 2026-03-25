import mongoose from "mongoose";

export interface I_S_Batch {
    rollno: number;
    student: mongoose.Types.ObjectId;
    mainClass: mongoose.Types.ObjectId;
    joinDate: Date;
    startDate: Date;
    endDate: Date;
    batchcompletion: boolean;
    examcompletion: boolean;
    certificateIssued: boolean;
}

const studentBatchSchema = new mongoose.Schema<I_S_Batch>(
    {
        rollno: { type: Number, required: true },
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        mainClass: { type: mongoose.Schema.Types.ObjectId, ref: "MainClass", required: true },
        joinDate: { type: Date, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        batchcompletion: { type: Boolean, default: false },
        examcompletion: { type: Boolean, default: false },
        certificateIssued: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

const Student_Batch = mongoose.model<I_S_Batch>("Student_Batch", studentBatchSchema);

export default Student_Batch;