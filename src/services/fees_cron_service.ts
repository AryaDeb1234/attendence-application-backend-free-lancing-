import cron from 'node-cron';
import MainClass from '../models/MainClass';
import User from '../models/User';
import Student_Batch from '../models/Student_Batch';
import Fees from '../models/Fees';
import { sendFeesReminderEmail } from './email_service';

const getMonthString = (date: Date): string => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const initializeFeesReminderCron = () => {
  const cronExpression = '0 0 1 * *';

  const task = cron.schedule(cronExpression, async () => {
    console.log(`[Fees Reminder Cron] Triggered at ${new Date().toISOString()}`);

    try {
      const activeMainClasses = await MainClass.find({ isActive: true }).populate('teachers', 'name email');

      if (activeMainClasses.length === 0) {
        console.log('[Fees Reminder Cron] No active main classes found');
        return;
      }

      const currentMonthString = getMonthString(new Date());
      console.log(
        `[Fees Reminder Cron] Processing fee reminders for ${currentMonthString}`
      );

      for (const mainClass of activeMainClasses) {
        try {
          const studentBatches = await Student_Batch.find({
            mainClass: mainClass._id,
          }).populate('student');

          if (studentBatches.length === 0) {
            console.log(
              `[Fees Reminder Cron] No students found in class: ${mainClass.name}`
            );
            continue;
          }

          for (const studentBatch of studentBatches) {
            try {
              const student = await User.findById(
                studentBatch.student
              );

              if (!student || !student.email) {
                console.log(
                  `[Fees Reminder Cron] Student ${studentBatch.student} has no email, skipping`
                );
                continue;
              }

              const existingFees = await Fees.findOne({
                mainClass: mainClass._id,
                student: student._id,
                month: currentMonthString,
              });

              if (existingFees?.PaidAt) {
                console.log(
                  `[Fees Reminder Cron] ${student.email} already paid for ${currentMonthString}, skipping reminder`
                );
                continue;
              }

              if (!existingFees) {
                const newFees = new Fees({
                  mainClass: mainClass._id,
                  student: student._id,
                  month: currentMonthString,
                  baseamount: mainClass.fees,
                  totalAmount: mainClass.fees,
                });

                await newFees.save();
                console.log(
                  `[Fees Reminder Cron] Created fees record for student ${student.name} in class ${mainClass.name}`
                );
              }

              const teachersArr = (mainClass as any).teachers ?? [];
              const teacherList = teachersArr.map((t: any) => ({ name: t?.name, email: t?.email }));

              await sendFeesReminderEmail({
                studentName: student.name,
                studentEmail: student.email,
                className: mainClass.name,
                monthString: currentMonthString,
                feesAmount: mainClass.fees,
                teachers: teacherList,
              });

              console.log(
                `[Fees Reminder Cron] Sent reminder email to ${student.email} for ${mainClass.name}`
              );
            } catch (studentError) {
              console.error(
                `[Fees Reminder Cron] Error processing student ${studentBatch.student}:`,
                studentError
              );
              continue;
            }
          }
        } catch (classError) {
          console.error(
            `[Fees Reminder Cron] Error processing main class ${mainClass._id}:`,
            classError
          );
          continue;
        }
      }

      console.log(
        `[Fees Reminder Cron] Completed processing fee reminders for ${currentMonthString}`
      );
    } catch (error) {
      console.error('[Fees Reminder Cron] Error:', error);
    }
  });

  console.log('[Fees Reminder Cron] Scheduled to run on the 1st of every month at 00:00');

  return task;
};

export const triggerFeesReminderManually = async () => {
  console.log(
    `[Fees Reminder Manual] Triggered manually at ${new Date().toISOString()}`
  );

  try {
    const activeMainClasses = await MainClass.find({ isActive: true }).populate('teachers', 'name email');

    if (activeMainClasses.length === 0) {
      console.log('[Fees Reminder Manual] No active main classes found');
      return { success: false, message: 'No active classes found' };
    }

    const currentMonthString = getMonthString(new Date());
    let totalEmailsSent = 0;
    let totalFeeRecordsCreated = 0;

    for (const mainClass of activeMainClasses) {
      const studentBatches = await Student_Batch.find({
        mainClass: mainClass._id,
      }).populate('student');

      for (const studentBatch of studentBatches) {
        const student = await User.findById(studentBatch.student);

        if (!student || !student.email) {
          continue;
        }

        const existingFees = await Fees.findOne({
          mainClass: mainClass._id,
          student: student._id,
          month: currentMonthString,
        });

        if (existingFees?.PaidAt) {
          continue;
        }

        if (!existingFees) {
          const newFees = new Fees({
            mainClass: mainClass._id,
            student: student._id,
            month: currentMonthString,
            baseamount: mainClass.fees,
            totalAmount: mainClass.fees,
          });

          await newFees.save();
          totalFeeRecordsCreated++;
        }

        const teachersArr = (mainClass as any).teachers ?? [];
        const teacherList = teachersArr.map((t: any) => ({ name: t?.name, email: t?.email }));

        await sendFeesReminderEmail({
          studentName: student.name,
          studentEmail: student.email,
          className: mainClass.name,
          monthString: currentMonthString,
          feesAmount: mainClass.fees,
          teachers: teacherList,
        });

        totalEmailsSent++;
      }
    }

    return {
      success: true,
      message: 'Manual trigger completed',
      totalEmailsSent,
      totalFeeRecordsCreated,
      month: currentMonthString,
    };
  } catch (error) {
    console.error('[Fees Reminder Manual] Error:', error);
    return { success: false, message: 'Error triggered manually', error };
  }
};
