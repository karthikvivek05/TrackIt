import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { StepModel } from '../models/Step.js';

const dataPath = fileURLToPath(new URL('../../data/a2z.json', import.meta.url));

async function main() {
  await connectDB();
  const raw = await readFile(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  const steps = Array.isArray(data.steps) ? data.steps : [];
  let problemCount = 0;

  for (const step of steps) {
    await StepModel.updateOne(
      { slug: step.slug },
      { $set: step },
      { upsert: true },
    );
    problemCount += (step.subSteps || []).reduce(
      (n: number, s: any) => n + (s.problems?.length || 0),
      0,
    );
  }

  // Full sync: remove any steps no longer present in the JSON file.
  const slugs = steps.map((s: any) => s.slug);
  await StepModel.deleteMany({ slug: { $nin: slugs } });

  console.log(`[seed] upserted ${steps.length} steps (${problemCount} problems)`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
