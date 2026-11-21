import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ActivitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", index: true },
    proposal: { type: Schema.Types.ObjectId, ref: "Proposal", index: true },
    type: {
      type: String,
      enum: [
        "proposal_created",
        "link_sent",
        "proposal_viewed",
        "stage_changed",
        "proposal_approved",
        "proposal_lost",
        "note",
        "followup_scheduled",
        "client_created",
      ],
      default: "note",
    },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ proposal: 1, createdAt: -1 });
ActivitySchema.index({ client: 1, createdAt: -1 });

export type ActivityDoc = InferSchemaType<typeof ActivitySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Activity: Model<ActivityDoc> =
  (mongoose.models.Activity as Model<ActivityDoc>) ||
  mongoose.model<ActivityDoc>("Activity", ActivitySchema);
