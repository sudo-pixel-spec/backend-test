import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["earn", "spend"], required: true },
    currency: { type: String, enum: ["coins", "diamonds"], required: true },
    amount: { type: Number, required: true },
    reason: { type: String }
  },
  { timestamps: true }
);

export const WalletTransaction = mongoose.model("WalletTransaction", WalletTransactionSchema);
