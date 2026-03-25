import mongoose from 'mongoose';

export interface Iotp{
    email?:string
    otp?: string;
    otpExpires?: Date;
}

const otpschema=new mongoose.Schema<Iotp>({
   email:{type:String},
    otp:{type:String},
   otpExpires:{type:Date}
},{
    timestamps:true
}) 

const Otp=mongoose.model<Iotp>("Otp",otpschema); 
 
export default Otp;