import express, { Router } from "express";
import axios, { AxiosResponse } from "axios";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";
import UserModel from "../models/User.model";
import TokenModel from "../models/Token.model";
import { isEmail } from "validator";
import bcrypt from "bcryptjs";
import TokenService from "../services/token.service";
import { isValidNickname, isValidPassword } from "../utils/validation";
dotenv.config();

interface UserData {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}
interface SignUpPayload {
  email: string;
  nickname: string;
  password: string;
  role: "user" | "booster";
}
interface SignInPayload {
  email: string;
  password: string;
  role: "user" | "booster";
}

const router: Router = express.Router({ mergeParams: true });

async function getGoogleUserData(access_token: string) {
  const res: AxiosResponse = await axios.get(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
  );

  return res.data;
}

router.post("/oauth/google-redirect", async (req, res) => {
  try {
    const redirectUrl: string = "http://localhost:3000/googleLogin";

    const oauthClient: OAuth2Client = new OAuth2Client(
      process.env.GOOGLE_ClIENT_ID,
      process.env.GOOGLE_SECRET,
      redirectUrl
    );

    const authorizeUrl: string = oauthClient.generateAuthUrl({
      access_type: "offline",
      scope:
        "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid",
      prompt: "consent",
    });

    res.status(200).json({ url: authorizeUrl });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
});

router.post("/oauth/google-exchange", async (req, res) => {
  try {
    const code: string | undefined = req.body.code;
    const role: "user" | "booster" = req.body.role;

    if (!code) {
      return res.status(400).json({
        message: "Токен не был передан на сервер",
      });
    }
    if (!role) {
      return res.status(400).json({
        message: "Роль не выбрана",
      });
    }

    const decodedCode = decodeURIComponent(code);

    const redirectUrl: string = "http://localhost:3000/googleLogin";
    const oauthClient: OAuth2Client = new OAuth2Client(
      process.env.GOOGLE_ClIENT_ID,
      process.env.GOOGLE_SECRET,
      redirectUrl
    );

    const response = await oauthClient.getToken(decodedCode);

    await oauthClient.setCredentials(response.tokens);

    const tokens = oauthClient.credentials;

    const userData: UserData = await getGoogleUserData(
      tokens.access_token as string
    );

    const isExistingUser = await UserModel.findOne({
      email: userData.email,
      oauth: "Google",
      role,
    });
    if (!isExistingUser) {
      const newUser = await UserModel.create({
        email: userData.email,
        oauth: "Google",
        nickname: userData.given_name,
        description: "",
        avatar_url: userData.picture,
        role,
        games: [],
        onlineStatus: false,
      });
      await newUser.save();

      const tokens = TokenService.generate({ _id: newUser._id });

      await TokenService.save(newUser._id.toString(), tokens.refresh_token);

      res.status(200).json({ userId: newUser._id, ...tokens });
    } else {
      isExistingUser.nickname = userData.given_name;
      isExistingUser.avatar_url = userData.picture;
      await isExistingUser.save();

      const tokens = TokenService.generate({ _id: isExistingUser._id });
      await TokenService.save(
        isExistingUser._id.toString(),
        tokens.refresh_token
      );

      res.status(200).json({ userId: isExistingUser._id, ...tokens });
    }
  } catch (error: any) {
    res.status(500).json({ message: error });
  }
});

router.post("/oauth/discord-redirect", async (req, res) => {
  try {
    // const redirectUrl: string = "http://localhost:3000/discordLogin";

    res.status(200).json({
      url: "https://discord.com/oauth2/authorize?client_id=1265396772293836851&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2FdiscordLogin&scope=email+openid+identify",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
});

router.post("/oauth/discord-exchange", async (req, res) => {
  try {
    const code: string | undefined = req.body.code;
    const role: "user" | "booster" = req.body.role;

    if (!code) {
      return res.status(400).json({
        message: "Токен не был передан на сервер",
      });
    }
    if (!role) {
      return res.status(400).json({
        message: "Роль не выбрана",
      });
    }

    const response = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID as string,
        client_secret: process.env.DISCORD_SECRET as string,
        grant_type: "authorization_code",
        code: decodeURIComponent(code),
        redirect_uri: "http://localhost:3000/discordLogin",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const tokens = response.data;

    if (!tokens.access_token) throw new Error("Access token not found");

    const { data: userData } = await axios.get(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const isExistingUser = await UserModel.findOne({
      email: userData.email,
      oauth: "Discord",
      role,
    });

    if (!isExistingUser) {
      const newUser = await UserModel.create({
        email: userData.email,
        oauth: "Discord",
        nickname: userData.username,
        description: "",
        avatar_url: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`,
        role,
        games: [],
        onlineStatus: false,
      });
      await newUser.save();

      const tokens = TokenService.generate({ _id: newUser._id });

      await TokenService.save(newUser._id.toString(), tokens.refresh_token);

      res.status(200).json({ userId: newUser._id, ...tokens });
    } else {
      isExistingUser.nickname = userData.username;
      isExistingUser.avatar_url = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
      await isExistingUser.save();

      const tokens = TokenService.generate({ _id: isExistingUser._id });

      await TokenService.save(
        isExistingUser._id.toString(),
        tokens.refresh_token
      );

      res.status(200).json({ userId: isExistingUser._id, ...tokens });
    }
  } catch (error: any) {
    res.status(500).json({ message: error });
  }
});

router.post("/signUp", async (req, res) => {
  try {
    const { email, nickname, password, role }: SignUpPayload = req.body;

    if (!email || !nickname || !password || !role) {
      return res.status(400).json({ message: "Не все поля заполнены" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({
        message: "Некорректный email",
      });
    }
    if (!isValidNickname(nickname)) {
      return res.status(400).json({
        message:
          "Никнейм может содержать только буквы и цифры. Минимальная длина - 3 символов. Максимальная - 15",
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Пароль может содержать только латинские символы, цифры и специальные знаки. Минимальная длина - 7 символов. Максимальная - 20",
      });
    }
    if (role !== "user" && role !== "booster") {
      return res.status(400).json({
        message: "Роль не выбрана",
      });
    }

    const isExistingUser = await UserModel.findOne({
      email,
      oauth: undefined,
      role,
    });
    if (isExistingUser) {
      return res.status(400).json({
        message: "Пользователь с таким email уже зарегистрирован",
      });
    }

    const hashedPassword: string = await bcrypt.hash(password, 12);

    const newUser = await UserModel.create({
      nickname,
      description: "",
      email,
      password: hashedPassword,
      role,
      games: [],
      onlineStatus: false,
    });
    await newUser.save();

    const tokens = TokenService.generate({ _id: newUser._id });

    await TokenService.save(newUser._id.toString(), tokens.refresh_token);

    res.status(200).json({ userId: newUser._id, ...tokens });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
});

router.post("/signIn", async (req, res) => {
  try {
    const { email, password, role }: SignInPayload = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Не все поля заполнены" });
    }

    const currentUser = await UserModel.findOne({
      email,
      role,
    });
    if (!currentUser || currentUser.role !== role || !currentUser.password) {
      return res.status(400).json({
        message: "Неверный email, пароль или роль",
      });
    }

    const isPasswordEqual = await bcrypt.compare(
      password,
      currentUser.password
    );
    if (!isPasswordEqual) {
      return res.status(201).send({
        message: "Неверный email или пароль",
      });
    }

    const tokens = TokenService.generate({ _id: currentUser._id });
    await TokenService.save(currentUser._id.toString(), tokens.refresh_token);

    res.status(200).send({ ...tokens, userId: currentUser._id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
});

export default router;
