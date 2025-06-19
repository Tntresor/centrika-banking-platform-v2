import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

const JWT_SECRET = process.env.JWT_SECRET || 'centrika-secret-key';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        phone: string;
      };
      admin?: {
        adminId: number;
        email: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.userId) {
        // User token
        const user = await storage.getUser(decoded.userId);
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or inactive user'
          });
        }

        req.user = {
          userId: decoded.userId,
          phone: decoded.phone
        };
      }
      
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.adminId) {
        // Admin token
        const admin = await storage.getAdminUser(decoded.email);
        if (!admin || !admin.isActive) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or inactive admin user'
          });
        }

        req.admin = {
          adminId: decoded.adminId,
          email: decoded.email,
          role: decoded.role
        };
      } else {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
};

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        if (decoded.userId) {
          const user = await storage.getUser(decoded.userId);
          if (user && user.isActive) {
            req.user = {
              userId: decoded.userId,
              phone: decoded.phone
            };
          }
        }
      } catch (jwtError) {
        // Token is invalid, but we continue without authentication
        console.log('Invalid token in optional auth:', jwtError.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};
