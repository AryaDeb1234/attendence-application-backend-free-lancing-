import mongoose from "mongoose";

export interface Iclass {
    batch: mongoose.Types.ObjectId;
    mainClass: mongoose.Types.ObjectId;
    Present_students: mongoose.Types.ObjectId[];
    Absent_students: mongoose.Types.ObjectId[];
    date: Date;
}

const classSchema = new mongoose.Schema<Iclass>(
    {
        batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
        mainClass: { type: mongoose.Schema.Types.ObjectId, ref: "MainClass", required: true },
        Present_students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        Absent_students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        date: { type: Date, required: true },
    },
    {
        timestamps: true,
    },
);

const Class = mongoose.model<Iclass>("Class", classSchema);

export default Class;