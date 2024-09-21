import express from "express";
import multer from "multer";
import * as dotenv from "dotenv";
import { audioMulterConfig, imagesMulterConfig } from "../multer.config";
dotenv.config();

const imagesUpload = multer(imagesMulterConfig as multer.Options);
const audioUpload = multer(audioMulterConfig as multer.Options);

const router = express.Router({ mergeParams: true });

interface File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

router.post("/uploadImage", imagesUpload.single("image"), async (req, res) => {
  try {
    const file: File | undefined = req.file;
    if (!file) {
      return res.status(500).json({ message: "Файл не был загружен" });
    }

    const path: string = process.env.BASE_IMAGES_URL + file.filename;

    res.status(200).json({ image_url: path });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/uploadAudio", audioUpload.single("audio"), async (req, res) => {
  try {
    const file: File | undefined = req.file;
    if (!file) {
      return res.status(500).json({ message: "Файл не был загружен" });
    }

    const path: string = process.env.BASE_AUDIOS_URL + file.filename;

    res.status(200).json({ audio_url: path });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
