import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "booster"],
    },
    email: {
      type: String,
      required: true,
    },
    oauth: {
      type: String,
      enum: ["Google", "Discord"],
    },
    nickname: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    avatar_url: {
      type: String,
    },
    password: {
      type: String,
    },
    games: {
      type: [Schema.Types.ObjectId],
      ref: "Game",
    },
    onlineStatus: {
      type: Boolean,
      required: true,
    },
    lastOnlineDate: {
      type: String,
    },
    payments: [
      {
        type: Types.ObjectId,
        ref: "Payment",
        required: true,
      },
    ],
  },
  { timestamps: true }
);

export default model("User", schema);
