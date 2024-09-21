import tokenService from "../services/token.service";
import * as dotenv from "dotenv";
dotenv.config();

export default async (req: any, res: any, next: any) => {
  if (req.method === "OPTIONS") return next();

  try {
    let accessToken: string = req.headers.authorization
      .split("Bearer")[1]
      .substring(1);

    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = tokenService.validateAccess(accessToken);
    if (!data) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = data;

    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
