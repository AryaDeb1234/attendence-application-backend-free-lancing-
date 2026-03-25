import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utilis/jwt_utilis';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  
    const token=req.headers.authorization?.split(' ')[1];
    if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
   }
  try {
   const decoded = verifyToken(token) as { id: string; role?: string };
   (req as any).user = { id: decoded.id, role: decoded.role }; // Put id and role in request object
   next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
}