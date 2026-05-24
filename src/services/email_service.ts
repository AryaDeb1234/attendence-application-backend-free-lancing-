// import nodemailer from 'nodemailer';
// 
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // TLS
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
//   connectionTimeout: 15000,
// });

// import { Resend } from 'resend';

// const resend = new Resend(process.env.RESEND_API_KEY);

// const sendEmailViaResend = async (payload: {
//   from: string;
//   to: string | string[];
//   subject: string;
//   html: string;
// }) => {
//   const { data, error } = await resend.emails.send(payload);

//   if (error) {
//     throw new Error(`Email sending failed: ${error.message}`);
//   }

//   return data;
// };
import SibApiV3Sdk from 'sib-api-v3-sdk';

const client = SibApiV3Sdk.ApiClient.instance;

if (!process.env.BREVO_API_KEY) {   
  throw new Error('BREVO_API_KEY is missing in environment variables');
}

client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Attendance App';

const sendEmailViaBrevo = async ({ to, subject, html }: { to: string | string[]; subject: string; html: string }) => {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((email) => email?.trim())
    .filter((email): email is string => Boolean(email));

  if (!recipients.length) {
    throw new Error('No recipient email provided');
  }

  await apiInstance.sendTransacEmail({
    sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
    to: recipients.map((email) => ({ email })),
    subject,
    htmlContent: html,
  });
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0; background: #f4f7fb;">
        <div style="text-align:center; padding: 16px; background:#f4f7fb;">
          <img src="https://res.cloudinary.com/dff3zapap/image/upload/v1774457991/v10mmllxj1qs76g9ztlu.jpg" width="60" style="border-radius:10px;" />
          <h2 style="margin:8px 0 0; font-size:16px; color:#0f172a;">
            Institute of Knowledge
          </h2>
        </div>

        <div style="max-width: 520px; margin: 0 auto 24px; background: #ffffff; border: 1px solid #dbe4f0; border-radius: 12px; overflow: hidden; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #0f4c81 0%, #1d7fa6 100%); color: #ffffff; padding: 16px 20px;">
            <h3 style="margin: 0; font-size: 18px;">Your Verification Code</h3>
          </div>
          <div style="padding: 20px; color: #0f172a;">
            <p style="margin: 0 0 10px; font-size: 14px;">Use the OTP below to continue:</p>
            <p style="margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #0f4c81;">${otp}</p>
            <p style="margin: 0; font-size: 13px; color: #334155;">This OTP expires in 10 minutes.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmailViaBrevo({
    to: email,
    subject: "Your Verification Code",
    html,
  });
};

interface AttendanceCompleteEmailInput {
  adminEmails: string[];
  batchName: string;
  classDate: Date;
  presentStudents?: Array<{ name: string; adhar?: string; phone?: string; mainClass?: string }>;
  absentStudents: Array<{ name: string; adhar?: string; phone?: string }>;
  presentCount: number;
  absentCount: number;
}

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const sendAttendanceCompleteEmail = async (input: AttendanceCompleteEmailInput) => {
  const { adminEmails, batchName, classDate, presentStudents = [], absentStudents, presentCount, absentCount } = input;
  const formattedDate = formatDateLocal(classDate);

  const presentLines = presentStudents.length
    ? presentStudents
        .map((student, index) => `${index + 1}. ${student.name}${student.mainClass ? ` | ${student.mainClass}` : ""}${student.adhar ? ` | ${student.adhar}` : ""}${student.phone ? ` | ${student.phone}` : ""}`)
        .join("\n")
    : "No present students";

  const absentLines = absentStudents.length
    ? absentStudents
        .map((student, index) => `${index + 1}. ${student.name}${student.adhar ? ` | ${student.adhar}` : ""}${student.phone ? ` | ${student.phone}` : ""}`)
        .join("\n")
    : "No absent students";

  const absentStudentCards = absentStudents.length
    ? absentStudents
        .map(
          (student, index) => `
            <tr>
              <td style="padding: 14px 12px; border-bottom: 1px solid #e7edf5; font-size: 14px; color: #1f2937;">
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px;">Student ${index + 1}</div>
                <div style="margin-bottom: 6px;"><strong>Name:</strong> ${student.name || "N/A"}</div>
                <div style="margin-bottom: 6px; word-break: break-word;"><strong>Aadhaar No:</strong> ${student.adhar || "N/A"}</div>
                <div><strong>Phone Number:</strong> ${student.phone || "N/A"}</div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td style="padding: 16px; text-align: center; font-size: 14px; color: #334155;">
          No absent students for this class.
        </td>
      </tr>
    `;

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @media only screen and (max-width: 600px) {
            .outer-wrap {
              padding: 12px !important;
            }
            .card-cell {
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              padding: 0 0 12px 0 !important;
            }
            .card-cell:last-child {
              padding-bottom: 0 !important;
            }
            .content-pad {
              padding-left: 14px !important;
              padding-right: 14px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0;">
      
      <div style="text-align:center; padding: 16px; background:#f4f7fb;">
  <img src="https://res.cloudinary.com/dff3zapap/image/upload/v1774457991/v10mmllxj1qs76g9ztlu.jpg" width="60" style="border-radius:10px;" />
  <h2 style="margin:8px 0 0; font-size:16px; color:#0f172a;">
    Institute of Knowledge
  </h2> 
</div>
    
  <div class="outer-wrap" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f4f7fb; padding: 24px; color: #0f172a;">
      <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dbe4f0;">
        <div style="background: linear-gradient(135deg, #0f4c81 0%, #1d7fa6 100%); color: #ffffff; padding: 18px 22px;">
          <h2 style="margin: 0; font-size: 20px;">Attendance Completion Report</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.95;">Batch attendance summary and absent student details</p>
        </div>

        <div class="content-pad" style="padding: 18px 22px; background: #f9fbff; border-bottom: 1px solid #e7edf5;">
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>Batch:</strong> ${batchName}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Date:</strong> ${formattedDate}</p>
        </div>

        <div class="content-pad" style="padding: 18px 22px;">
          <table role="presentation" style="width: 100%; border-collapse: separate; border-spacing: 0;">
            <tr>
              <td class="card-cell" style="width: 50%; padding-right: 11px; vertical-align: top;">
                <div style="background: #ecfdf3; border: 1px solid #c8f1da; border-radius: 10px; padding: 12px;">
                  <p style="margin: 0; font-size: 12px; color: #166534;">Present Students</p>
                  <p style="margin: 4px 0 0; font-size: 22px; color: #14532d; font-weight: 700;">${presentCount}</p>
                </div>
              </td>
              <td class="card-cell" style="width: 50%; padding-left: 11px; vertical-align: top;">
                <div style="background: #fff1f2; border: 1px solid #ffd7dc; border-radius: 10px; padding: 12px;">
                  <p style="margin: 0; font-size: 12px; color: #9f1239;">Absent Students</p>
                  <p style="margin: 4px 0 0; font-size: 22px; color: #881337; font-weight: 700;">${absentCount}</p>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <div class="content-pad" style="padding: 0 22px 22px;">
          <h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Absent Student Details</h3>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e7edf5; border-radius: 10px; overflow: hidden;">
            <thead>
              <tr style="background: #eef4fb;">
                <th style="padding: 12px; text-align: left; font-size: 13px; color: #334155;">Student Information</th>
              </tr>
            </thead>
            <tbody>
              ${absentStudentCards}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </body>
    </html>
  `;

  await sendEmailViaBrevo({
    to: adminEmails,
    subject: `Attendance Complete - ${batchName} (${formattedDate})`,
    html,
  });
};

interface FeesReminderEmailInput {
  studentName: string;
  studentEmail: string;
  className: string;
  monthString: string;
  feesAmount: number;
  teacherName: string;
  teacherEmail: string;
}

export const sendFeesReminderEmail = async (input: FeesReminderEmailInput) => {
  const { studentName, studentEmail, className, monthString, feesAmount, teacherName, teacherEmail } = input;

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0; background: #f4f7fb; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
        <div style="text-align:center; padding: 16px; background:#f4f7fb;">
          <img src="https://res.cloudinary.com/dff3zapap/image/upload/v1774457991/v10mmllxj1qs76g9ztlu.jpg" width="60" style="border-radius:10px;" />
          <h2 style="margin:8px 0 0; font-size:16px; color:#0f172a;">
            Institute of Knowledge
          </h2>
        </div>

        <div style="max-width: 520px; margin: 0 auto 24px; background: #ffffff; border: 1px solid #dbe4f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0f4c81 0%, #1d7fa6 100%); color: #ffffff; padding: 18px 20px;">
            <h3 style="margin: 0; font-size: 18px;">📋 Fee Payment Reminder</h3>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Your monthly fees are due</p>
          </div>
          
          <div style="padding: 24px 20px; color: #0f172a;">
            <p style="margin: 0 0 16px; font-size: 15px;">Hello <strong>${studentName}</strong>,</p>
            
            <div style="background: #f0f4f9; border-left: 4px solid #0f4c81; padding: 14px; margin-bottom: 16px; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #334155;">This is a friendly reminder that your fees for <strong>${monthString}</strong> are due.</p>
            </div>

            <div style="background: #ecfdf3; border-left: 4px solid #16a34a; padding: 14px; margin-bottom: 18px; border-radius: 4px;">
              <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Fee Details</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #14532d;">
                <strong style="font-size: 16px; display: block; margin-bottom: 4px;">Rs. ${feesAmount}</strong>
                for <strong>${className}</strong> - <strong>${monthString}</strong>
              </p>
            </div>

            <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
              Please pay your fees as soon as possible to avoid any late charges. If you have already paid, please disregard this email.
            </p>

            <div style="margin: 20px 0; padding: 14px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Class Information</p>
              <p style="margin: 4px 0; font-size: 13px; color: #0f172a;"><strong>Class:</strong> ${className}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #0f172a;"><strong>Month:</strong> ${monthString}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #0f172a;"><strong>Teacher:</strong> ${teacherName}</p>
              <p style="margin: 4px 0; font-size: 13px; color: #0f172a;"><strong>Contact:</strong> <a href="mailto:${teacherEmail}" style="color: #0f4c81; text-decoration: none;">${teacherEmail}</a></p>
            </div>

            <p style="margin: 18px 0 0; font-size: 12px; color: #6b7280;">
              If you have any queries regarding your fees, please contact your instructor.
            </p>
          </div>

          <div style="background: #f9fafb; padding: 14px 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #6b7280;">
              Institute of Knowledge &copy; 2026 | All Rights Reserved
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmailViaBrevo({
    to: studentEmail,
    subject: `Fee Reminder for ${className} - ${monthString}`,
    html,
  });
};