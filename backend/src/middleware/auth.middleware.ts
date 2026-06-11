import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";

export type AuthenticatedRequest<
  Params = Record<string, string>,
  ReqBody = any
> = Request<Params, any, ReqBody> & {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
};

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Missing or invalid Authorization header",
    });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}