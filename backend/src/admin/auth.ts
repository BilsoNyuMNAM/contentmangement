import type { Request, Response, NextFunction } from "express";

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const adminSecret = process.env.ADMIN_SECRET || "admin123";
    const headerKey = req.headers["x-admin-key"] as string | undefined;
    const authHeader = req.headers["authorization"];
    const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
    
    const providedKey = headerKey || bearerKey;

    if (!providedKey || providedKey !== adminSecret) {
        return res.status(401).json({
            error: "UNAUTHORIZED",
            message: "Invalid or missing admin authentication key."
        });
    }

    next();
}
