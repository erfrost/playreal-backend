import multer from "multer";
import path from "path";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";

// imag
const imagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "/images"));
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${slugify(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

export const imagesMulterConfig: multer.Multer = multer({
  storage: imagesStorage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

// audio
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./audios");
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${slugify(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

export const audioMulterConfig: multer.Multer = multer({
  storage: audioStorage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});
