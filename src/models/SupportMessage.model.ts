import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    supportChatId: {
      type: Types.ObjectId,
      ref: "SupportChat",
      required: true,
    },
    senderId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default model("SupportMessage", schema);
