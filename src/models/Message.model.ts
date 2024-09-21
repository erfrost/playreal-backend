import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    chatId: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    senderId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    files: {
      type: [String],
    },
    audio: {
      type: String,
    },
    isRead: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Message", schema);
