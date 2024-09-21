import { Request } from "express";

export interface RequestWithUser extends Request {
  user: any;
}

export interface MessageDto {
  recipient_id: string;
  text: string;
  files: string[];
  audio: string;
}
export interface ReadDto {
  chatId: string;
  userId: string;
}
//
