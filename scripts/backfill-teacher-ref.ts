import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MainClass from '../src/models/MainClass';
import User from '../src/models/User';
import { config as appConfig } from '../src/config/db';

dotenv.config();

const mongoUrl = process.env.DATABASE_URL || appConfig.dbUrl;

async function run() {
  await mongoose.connect(mongoUrl, { });
  console.log('Connected to DB', mongoUrl);

  const classesWithoutTeacher = await MainClass.find({ $or: [{ teachers: null }, { teachers: { $exists: false } }, { teachers: { $size: 0 } }], teacherEmail: { $exists: true, $ne: null } });
  console.log(`Found ${classesWithoutTeacher.length} main classes without teacher ObjectId but with teacherEmail`);

  let assigned = 0;
  let notFound = 0;

  for (const mc of classesWithoutTeacher) {
    try {
      const email = (mc.teacherEmail || '').toString().toLowerCase();
      if (!email) {
        notFound++;
        continue;
      }

      const user = await User.findOne({ email, role: { $in: ['Teacher', 'Admin'] } });
      if (!user) {
        console.warn(`No user found for email ${email} (mainClass ${mc._id})`);
        notFound++;
        continue;
      }

      mc.teachers = [user._id];
      await mc.save();

      // ensure user's mainClasses includes this class
      const userAny = user as any;
      const existing = Array.isArray(userAny.mainClasses) ? userAny.mainClasses.map((id: any) => id.toString()) : [];
      if (!existing.includes(mc._id.toString())) {
        userAny.mainClasses = [...existing, mc._id];
        await userAny.save();
      }

      assigned++;
    } catch (e) {
      console.error('Error processing main class', mc._id, e);
    }
  }

  // Additionally, ensure user.mainClasses are populated from classes that have teacher set
  const allClassesWithTeacher = await MainClass.find({ teachers: { $exists: true, $ne: null } }).select('_id teachers');
  const teacherMap = new Map<string, string[]>();
  for (const mc of allClassesWithTeacher) {
    const ts = (mc as any).teachers ?? [];
    for (const t of ts) {
      const tid = t?.toString();
      if (!tid) continue;
      teacherMap.set(tid, [...(teacherMap.get(tid) ?? []), mc._id.toString()]);
    }
  }

  let updatedUsers = 0;
  for (const [teacherId, classIds] of teacherMap.entries()) {
    try {
      const user = await User.findById(teacherId);
      if (!user) continue;
      const existing = Array.isArray(user.mainClasses) ? user.mainClasses.map((id: any) => id.toString()) : [];
      const merged = Array.from(new Set([...existing, ...classIds]));
      if (merged.length !== existing.length) {
        (user as any).mainClasses = merged;
        await user.save();
        updatedUsers++;
      }
    } catch (e) {
      console.error('Error updating user', teacherId, e);
    }
  }

  console.log(`Assigned teacher ObjectId to ${assigned} classes, ${notFound} not matched`);
  console.log(`Updated mainClasses on ${updatedUsers} users`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
