import User from "../models/User";
import { sendOTPEmail } from "./email_service";
import Otp from "../models/Otp";

export const requestOTP = async (email: string) => {
const user = await Otp.create({email});
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendOTPEmail(email,otp);
}; 

export const verfiyOTP = async (email: string, submittedOtp: string) => {
  const otpDoc = await Otp.findOne({
    email,
    otp: submittedOtp,
    otpExpires: { $gt: new Date() },
  });

  if (!otpDoc) throw new Error("Invalid or expired OTP");

  const existuser = await User.findOne({ email });
  if (!existuser) throw new Error("User not found");

  await Otp.deleteOne({ _id: otpDoc._id });

  return existuser;
};
