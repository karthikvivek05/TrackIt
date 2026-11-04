import { Schema, model, InferSchemaType } from 'mongoose';

const problemSchema = new Schema(
  {
    slug: { type: String, required: true },
    title: { type: String, required: true },
    leetcodeNumber: { type: Number },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    links: {
      practice: { type: String, default: '' },
      youtube: { type: String, default: '' },
      article: { type: String, default: '' },
    },
    tags: { type: [String], default: [] },
  },
  { _id: false },
);

const subStepSchema = new Schema(
  {
    slug: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    problems: { type: [problemSchema], default: [] },
  },
  { _id: false },
);

const stepSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    subSteps: { type: [subStepSchema], default: [] },
  },
  { timestamps: true },
);

export type Step = InferSchemaType<typeof stepSchema>;
export const StepModel = model('Step', stepSchema);
