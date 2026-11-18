import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProposalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    clientName: { type: String, default: "", trim: true },
    brief: { type: String, required: true },
    tone: { type: String, enum: ["formal", "consultivo", "direto"], default: "consultivo" },
    sections: { type: [String], default: [] },
    suggestMarketPricing: { type: Boolean, default: false },

    // Snapshot dos dados da empresa no momento da geração
    company: {
      name: String,
      cnpj: String,
      email: String,
      phone: String,
      website: String,
      address: String,
      responsible: String,
      about: String,
      differentials: String,
      logo: String,
      brandColor: String,
    },

    content: { type: String, default: "" }, // Markdown
    status: {
      type: String,
      enum: ["generating", "draft", "sent", "approved", "rejected", "final", "error"],
      default: "generating",
    },
    aiModel: { type: String, default: "" },
    error: { type: String, default: "" },

    // Rastreamento do link público interativo (/p/[id])
    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    approvedAt: { type: Date },
    approvedByName: { type: String, default: "" },
    approvedByEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

ProposalSchema.index({ user: 1, createdAt: -1 });

export type ProposalDoc = InferSchemaType<typeof ProposalSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Proposal: Model<ProposalDoc> =
  (mongoose.models.Proposal as Model<ProposalDoc>) ||
  mongoose.model<ProposalDoc>("Proposal", ProposalSchema);
