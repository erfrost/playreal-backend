import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default model("SupportChat", schema);
