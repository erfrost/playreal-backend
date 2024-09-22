import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      required: true,
      ref: "User",
    },
    amount: {
      type: Number,
      required: true,
    },
    items: [
      {
        type: Types.ObjectId,
        ref: "Service",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "canceled"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Payment", schema);
