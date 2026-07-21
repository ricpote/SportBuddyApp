import { Request, Response, NextFunction } from "express";
import { auth, db } from "../config/firebase";
import { UserRole, UserStatus } from "../models/user.model";

export type AuthenticatedRequest<
  Params = Record<string, string>,
  ReqBody = any
> = Request<Params, any, ReqBody> & {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    role?: UserRole;
    status?: UserStatus;
    hasAdminToken: boolean;
    hasRoleClaim: boolean;
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
    const roleClaim =
      typeof decodedToken.role === "string" ? decodedToken.role : undefined;
    const userTypeClaim =
      typeof decodedToken.userType === "string"
        ? decodedToken.userType
        : undefined;
    const hasRoleClaim =
      roleClaim !== undefined ||
      userTypeClaim !== undefined ||
      typeof decodedToken.admin === "boolean";
    const hasAdminToken =
      decodedToken.admin === true ||
      roleClaim === "admin" ||
      userTypeClaim === "admin";

    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    let userData = userDoc.exists
      ? (userDoc.data() as {
          role?: UserRole;
          status?: UserStatus;
          bannedUntil?: FirebaseFirestore.Timestamp | Date | null;
        })
      : undefined;

    // Suspensões temporárias expiram sozinhas: se o prazo já passou,
    // reativa a conta em vez de continuar a bloquear o acesso.
    if (userData?.status === "banned" && userData.bannedUntil) {
      const raw = userData.bannedUntil as any;
      const bannedUntil = raw?.toDate ? raw.toDate() : (raw as Date);
      if (bannedUntil <= new Date()) {
        await userDoc.ref.update({
          status: "active",
          bannedUntil: null,
          updatedAt: new Date(),
        });
        userData = { ...userData, status: "active" };
      }
    }

    if (userData?.status === "banned" || userData?.status === "deleted") {
      return res.status(403).json({
        message: "This account is no longer allowed to access the app",
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      role: userData?.role,
      status: userData?.status,
      hasAdminToken,
      hasRoleClaim,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
