import mongoose from "mongoose";

export interface IFees {
    mainClass: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    month: string; // e.g., "January 2026"
    baseamount: number;
    // discount: number;
    // lateDays: number;
    // lateFineperDay: number;
    totalAmount: number;
    PaidAt: Date;
}

const feesSchema = new mongoose.Schema<IFees>(
    {
        mainClass: { type: mongoose.Schema.Types.ObjectId, ref: "MainClass", required: true },
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        month: { type: String, required: true }, // e.g., "January 2026"
        baseamount: { type: Number, required: true },
        // discount: { type: Number, default: 0 }, 
        // lateDays: { type: Number, default: 0 },
        // lateFineperDay: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        PaidAt: { type: Date, required: true },
    },
    {
        timestamps: true,
    },
);

const Fees = mongoose.model<IFees>("Fees", feesSchema);

export default Fees;