import { MiddlewareHandler } from 'hono';
import { Role, Permission, hasPermission } from 'mango-farm-authorization';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        requestId: c.get('requestId')
      }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Dev session extraction
    let user: AuthUser;
    if (token.startsWith('user_') || token === 'local_token') {
      user = {
        id: token === 'local_token' ? 'user_001' : token,
        email: 'admin@mangofarm.com',
        role: 'admin',
      };
    } else {
      user = {
        id: 'user_001',
        email: 'user@mangofarm.com',
        role: 'user',
      };
    }

    c.set('user', user);
    await next();
  };
};

export const requirePermission = (permission: Permission): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!user) {
      return c.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        requestId: c.get('requestId')
      }, 401);
    }

    if (!hasPermission(user.role, permission)) {
      return c.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient permissions'
        },
        requestId: c.get('requestId')
      }, 403);
    }

    await next();
  };
};
