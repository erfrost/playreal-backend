import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import TokenModel from "../models/Token.model";
dotenv.config();

class TokenService {
  generate(payload: any) {
    const accessToken: string = jwt.sign(
      payload,
      process.env.ACCESS_SECRET as string,
      {
        expiresIn: "1h",
      }
    );
    const refreshToken: string = jwt.sign(
      payload,
      process.env.REFRESH_SECRET as string
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiresIn: 3600,
    };
  }

  async save(userId: string, refreshToken: string) {
    const data = await TokenModel.findOne({ user: userId });
    if (data) {
      data.refreshToken = refreshToken;
      return data.save();
    }

    const token = await TokenModel.create({
      user: userId,
      refreshToken,
    });
    return token;
  }

  validateRefresh(refreshToken: string) {
    try {
      const verify = jwt.verify(
        refreshToken,
        process.env.REFRESH_SECRET as string
      );
      return verify;
    } catch (error) {
      return null;
    }
  }

  validateAccess(accessToken: string) {
    try {
      return jwt.verify(accessToken, process.env.ACCESS_SECRET as string);
    } catch (error) {
      return null;
    }
  }

  async findToken(refreshToken: string) {
    try {
      return await TokenModel.findOne({ refreshToken });
    } catch (error) {
      return null;
    }
  }
}

export default new TokenService();
