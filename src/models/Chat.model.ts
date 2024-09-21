import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    users: {
      type: [Types.ObjectId],
      required: true,
      validate: {
        validator: function (value: number[]) {
          return value.length === 2;
        },
        message: "В чате допустимо только 2 пользователя",
      },
    },
    unreadMessagesCount: {
      type: Number,
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

export default model("Chat", schema);
