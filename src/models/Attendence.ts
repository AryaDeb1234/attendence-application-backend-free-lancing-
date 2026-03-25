import mongoose from "mongoose";

export interface IAttendence {
    batch: mongoose.Types.ObjectId;
    mainClass: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    date: Date;
    status: 'present' | 'absent';
}

const attendenceSchema = new mongoose.Schema<IAttendence>(
    {
        batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
        mainClass: { type: mongoose.Schema.Types.ObjectId, ref: "MainClass", required: true },
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, required: true },
        status: { type: String, enum: ['present', 'absent'], default: 'absent',required: true },
    },
    {
        timestamps: true,
    },
);

const Attendence = mongoose.model<IAttendence>("Attendence", attendenceSchema);

export default Attendence;