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
    type: {
      type: String,
      required: true,
      enum: ["payment", "withdrawal", "receiving"],
    },
    address: {
      type: String,
    },
    items: [
      {
        serviceId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        image: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        ratingRange: {
          type: [Number],
          required: true,
        },
        additionals: [
          {
            _id: {
              type: Types.ObjectId,
              required: true,
            },
            title: {
              type: String,
              required: true,
            },
            price: {
              type: Number,
              required: true,
            },
            days: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ["success", "pending", "cancelled"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Payment", schema);
