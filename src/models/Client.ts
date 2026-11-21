import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ClientSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    company: { type: String, default: "", trim: true, maxlength: 160 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    role: { type: String, default: "", trim: true, maxlength: 120 },
    source: {
      type: String,
      enum: ["instagram", "indicacao", "whatsapp", "google", "prospeccao", "outro"],
      default: "outro",
    },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "", maxlength: 5000 },
    temperature: {
      type: String,
      enum: ["cold", "warm", "hot"],
      default: "warm",
    },
    nextFollowUpAt: { type: Date },
    nextFollowUpTask: { type: String, default: "", maxlength: 240 },
  },
  { timestamps: true }
);

ClientSchema.index({ user: 1, name: 1 });
ClientSchema.index({ user: 1, createdAt: -1 });

export type ClientDoc = InferSchemaType<typeof ClientSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Client: Model<ClientDoc> =
  (mongoose.models.Client as Model<ClientDoc>) ||
  mongoose.model<ClientDoc>("Client", ClientSchema);
