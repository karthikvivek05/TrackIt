import { Schema, model, InferSchemaType } from 'mongoose';

const trackerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    icon: { type: String, default: '' },
    color: { type: String, default: '#52525b' },
    type: {
      type: String,
      enum: ['habit', 'counter', 'duration', 'checklist'],
      required: true,
    },
    unit: { type: String, default: '' },
  },
  { timestamps: true },
);

export type Tracker = InferSchemaType<typeof trackerSchema>;
export const TrackerModel = model('Tracker', trackerSchema);
