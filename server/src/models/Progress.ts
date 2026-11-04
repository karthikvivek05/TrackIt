import { Schema, model, InferSchemaType } from 'mongoose';

const progressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problemSlug: { type: String, required: true },
    status: {
      type: String,
      enum: ['Not Started', 'Solved'],
      default: 'Not Started',
    },
    starred: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    solvedAt: { type: Date, default: null },
    lastRevisedAt: { type: Date, default: null },
    timeTakenMin: { type: Number, default: null },
    attempts: { type: Number, default: 0 },
    revisionCount: { type: Number, default: 0 },
    history: {
      type: [{ status: String, at: Date }],
      default: [],
    },
  },
  { timestamps: true },
);

progressSchema.index({ userId: 1, problemSlug: 1 }, { unique: true });

export type Progress = InferSchemaType<typeof progressSchema>;
export const ProgressModel = model('Progress', progressSchema);
