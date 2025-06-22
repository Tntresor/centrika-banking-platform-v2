const express = require('express');
const { AppError, ErrorCodes } = require('../utils/errors');

function createAuthRoutes(serviceFactory, middlewareFactory) {
  const router = express.Router();

  // Registration endpoint
  router.post('/register', 
    middlewareFactory.rateLimit('user_creation'),
    async (req, res, next) => {
      try {
        const userService = serviceFactory.getService('user');
        const auditService = serviceFactory.getService('audit');
        
        const { firstName, lastName, phone, email, password, preferredLanguage } = req.body;
        
        // Create user
        const result = await userService.createUser({
          firstName,
          lastName,
          phone,
          email,
          password,
          preferredLanguage
        }, req.clientInfo);

        // Log successful registration
        await auditService.log('USER_REGISTERED', result.user.id, {
          email: result.user.email,
          phone: result.user.phone,
          clientInfo: req.clientInfo,
          correlationId: req.correlationId
        });

        res.status(201).json({
          success: true,
          message: 'Account created successfully',
          data: {
            userId: result.user.id,
            kycStatus: result.user.kycStatus,
            walletId: result.wallet.id
          }
        });

      } catch (error) {
        next(error);
      }
    }
  );

  // Login endpoint
  router.post('/login',
    middlewareFactory.rateLimit('login_attempt'),
    async (req, res, next) => {
      try {
        const userService = serviceFactory.getService('user');
        const auditService = serviceFactory.getService('audit');
        
        const { phone, password } = req.body;
        
        // Authenticate user
        const user = await userService.authenticateUser(phone, password, req.clientInfo);
        
        if (!user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid phone number or password'
            }
          });
        }

        // Generate session token (simplified - would use JWT service)
        const encryptionService = serviceFactory.getService('encryption');
        const sessionToken = encryptionService.generateToken(32);

        // Log successful login
        await auditService.log('USER_LOGIN', user.id, {
          clientInfo: req.clientInfo,
          correlationId: req.correlationId
        });

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              email: user.email,
              kycStatus: user.kycStatus
            },
            token: sessionToken
          }
        });

      } catch (error) {
        next(error);
      }
    }
  );

  // Change password endpoint
  router.post('/change-password',
    middlewareFactory.rateLimit('password_change'),
    async (req, res, next) => {
      try {
        const userService = serviceFactory.getService('user');
        const auditService = serviceFactory.getService('audit');
        
        const { userId, currentPassword, newPassword } = req.body;
        
        if (!userId || !currentPassword || !newPassword) {
          throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields');
        }

        // Change password
        const result = await userService.changePassword(
          userId, 
          currentPassword, 
          newPassword, 
          req.clientInfo
        );

        // Log password change
        await auditService.log('PASSWORD_CHANGED', userId, {
          clientInfo: req.clientInfo,
          correlationId: req.correlationId
        });

        res.json({
          success: true,
          message: 'Password changed successfully'
        });

      } catch (error) {
        next(error);
      }
    }
  );

  // Account status endpoint
  router.get('/status/:phone',
    middlewareFactory.rateLimit('api_general'),
    async (req, res, next) => {
      try {
        const storageService = serviceFactory.getService('storage');
        const { phone } = req.params;
        
        // Check if account is locked
        const isLocked = await storageService.isAccountLocked(phone);
        
        res.json({
          success: true,
          data: {
            phone,
            isLocked,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = createAuthRoutes;