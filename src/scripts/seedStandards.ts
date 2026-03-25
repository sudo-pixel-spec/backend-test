import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const StandardSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  active: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
});

const Standard = mongoose.model('Standard', StandardSchema);

const INITIAL_STANDARDS = [
  { code: 'CBSE_6', name: 'Grade 6' },
  { code: 'CBSE_7', name: 'Grade 7' },
  { code: 'CBSE_8', name: 'Grade 8' },
  { code: 'CBSE_9', name: 'Grade 9' },
  { code: 'CBSE_10', name: 'Grade 10' },
  { code: 'CBSE_11', name: 'Grade 11' },
  { code: 'CBSE_12', name: 'Grade 12' },
];

async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not defined');

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    for (const s of INITIAL_STANDARDS) {
      await Standard.updateOne(
        { code: s.code },
        { $set: { name: s.name, active: true, deletedAt: null } },
        { upsert: true }
      );
      console.log(`Seeded standard: ${s.code}`);
    }

    console.log('Seeding completed');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
