import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CompanySchema = new Schema(
  {
    name: { type: String, default: "" },
    cnpj: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    address: { type: String, default: "" },
    responsible: { type: String, default: "" },
    about: { type: String, default: "" },
    differentials: { type: String, default: "" },
    // Logo armazenada como data URL (base64) — limitada a ~300KB no upload.
    logo: { type: String, default: "" },
    // Cor primária da marca aplicada nos títulos, tabelas e detalhes do PDF.
    brandColor: { type: String, default: "#4f46e5" },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: "" },
    passwordHash: { type: String, select: false },
    provider: { type: String, enum: ["credentials", "google"], default: "credentials" },

    onboarded: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    plan: { type: String, enum: ["free", "pro"], default: "free" },
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: { type: String, default: "" },
    currentPeriodEnd: { type: Date },

    usage: {
      period: { type: String, default: "" }, // "YYYY-MM"
      count: { type: Number, default: 0 },
    },

    company: { type: CompanySchema, default: () => ({}) },
    preferences: {
      tone: { type: String, enum: ["formal", "consultivo", "direto"], default: "consultivo" },
    },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
export type CompanyData = InferSchemaType<typeof CompanySchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);
