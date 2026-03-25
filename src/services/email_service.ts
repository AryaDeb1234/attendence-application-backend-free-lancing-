import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, 
  }
});

export const sendOTPEmail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: '"INSTITUTE OF KNOWLEDGE" <noreply@myapp.com>',
    to: email,
    subject: "Your Verification Code",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
};

interface AttendanceCompleteEmailInput {
  adminEmails: string[];
  batchName: string;
  classDate: Date;
  presentStudents?: Array<{ name: string; email?: string; phone?: string; mainClass?: string }>;
  absentStudents: Array<{ name: string; email?: string; phone?: string }>;
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
        .map((student, index) => `${index + 1}. ${student.name}${student.mainClass ? ` | ${student.mainClass}` : ""}${student.email ? ` | ${student.email}` : ""}${student.phone ? ` | ${student.phone}` : ""}`)
        .join("\n")
    : "No present students";

  const absentLines = absentStudents.length
    ? absentStudents
        .map((student, index) => `${index + 1}. ${student.name}${student.email ? ` | ${student.email}` : ""}${student.phone ? ` | ${student.phone}` : ""}`)
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
                <div style="margin-bottom: 6px; word-break: break-word;"><strong>Gmail:</strong> ${student.email || "N/A"}</div>
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

  await transporter.sendMail({
    from: '"INSTITUTE OF KNOWLEDGE" <noreply@myapp.com>',
    to: adminEmails.join(","),
    subject: `Attendance Complete - ${batchName} (${formattedDate})`,
    text:
      `Batch: ${batchName}\n` +
      `Date: ${formattedDate}\n` +
      `Present Count: ${presentCount}\n` +
      `Absent Count: ${absentCount}\n\n` +
      `Present Students:\n${presentLines}\n\n` +
      `Absent Students:\n${absentLines}`,
    html,
  });
};