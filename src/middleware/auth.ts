import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Database, User } from '../db/dbInstance';

const JWT_SECRET = process.env.JWT_SECRET || 'secure-highhost-secret-string';

// Interface expansion to link custom authenticated fields to Express requests
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Global JWT Authentication check
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Auth token missing' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired session token' });
      return;
    }

    const matchedUser = Database.getUsers().find(u => u.userId === decodedUser.userId);
    if (!matchedUser) {
      res.status(403).json({ error: 'User associated with session not found' });
      return;
    }

    req.user = matchedUser;
    next();
  });
};

// Access controller for Admin-exclusive roles
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Access restricted to System Admins only' });
    return;
  }
  next();
};

// Access controller for Subscription features level (checks if active and package packages)
export const requireFeature = (requiredPackage: 'basic' | 'premium' | 'plus') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated status' });
      return;
    }

    const sub = Database.getSubscriptions().find(s => s.userId === req.user?.userId);
    if (!sub || sub.status !== 'active') {
      res.status(403).json({ error: 'Berlangganan diperlukan untuk mengakses fitur ini.' });
      return;
    }

    const tierHierarchy = { basic: 1, premium: 2, plus: 3 };
    const currentLevel = tierHierarchy[sub.package] || 0;
    const requiredLevel = tierHierarchy[requiredPackage] || 1;

    if (currentLevel < requiredLevel) {
      res.status(403).json({ error: `Fitur eksklusif ini membutuhkan paket ${requiredPackage.toUpperCase()} atau lebih tinggi.` });
      return;
    }

    next();
  };
};
