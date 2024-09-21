import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
    },
    coefficientMmr: {
      type: Number,
      required: true,
    },
    params: {
      type: [String],
      required: true,
    },
    baseMmrPrice: {
      type: Number,
      required: true,
    },
    baseMmrDays: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    backgroundCard: {
      type: String,
      required: true,
    },
    backgroundHeader: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
    },
    requirementsTitle: {
      type: String,
    },
    requirements: [
      {
        title: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
      },
    ],
    ratingRange: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value: number[]) {
          return value.length === 2 && value[0] < value[1];
        },
        message:
          "Массив должен состоять из двух элементов, причем первый элемент должен быть меньше второго.",
      },
    },
    boosterLink: {
      type: String,
      required: true,
    },
    additionals: [
      {
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
  {
    timestamps: true,
  }
);

export default model("Service", schema);
