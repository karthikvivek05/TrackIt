import { Schema, model, InferSchemaType } from 'mongoose';

const entrySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trackerId: {
      type: Schema.Types.ObjectId,
      ref: 'Tracker',
      required: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    value: { type: Schema.Types.Mixed, default: null },
    note: { type: String, default: '' },
    clientUpdatedAt: { type: Number, default: 0 },
  },
  { timestamps: true },
);

entrySchema.index({ userId: 1, trackerId: 1, date: 1 }, { unique: true });

export type Entry = InferSchemaType<typeof entrySchema>;
export const EntryModel = model('Entry', entrySchema);
