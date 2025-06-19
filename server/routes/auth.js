const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const storage = require('../storage/MemoryStorage');
const auth = require('../middleware/auth');
const LedgerService = require('../services/LedgerService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'centrika_dev_secret_key_2024';

// Sign up endpoint
router.post('/signup', [
  body('firstName').trim().isLength({ min: 2 }).escape(),
  body('lastName').trim().isLength({ min: 2 }).escape(),
  body('phoneNumber').matches(/^(\+250|250)?[0-9]{9}$/),
  body('idNumber').matches(/^[0-9]{16}$/),
  body('kycStatus').optional().isIn(['pending', 'approved', 'rejected']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { firstName, lastName, phoneNumber, idNumber, kycStatus = 'approved' } = req.body;

    // Check if user already exists
    const existingUser = await storage.findUserByPhone(phoneNumber);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Check if ID number is already used
    const existingId = await storage.findUserByIdNumber(idNumber);
    if (existingId) {
      return res.status(409).json({
        success: false,
        message: 'This ID number is already registered',
      });
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      phoneNumber,
      idNumber,
      kycStatus,
    });

    const savedUser = await storage.createUser(newUser);

    // Initialize user ledger account
    await LedgerService.createAccount(savedUser.id, 'USER_WALLET', {
      userId: savedUser.id,
      currency: 'RWF',
      accountType: 'WALLET',
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: savedUser.id,
        phoneNumber: savedUser.phoneNumber,
        kycStatus: savedUser.kycStatus,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without sensitive information
    const userResponse = {
      id: savedUser.id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phoneNumber: savedUser.phoneNumber,
      kycStatus: savedUser.kycStatus,
      createdAt: savedUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse,
      token,
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user account',
    });
  }
});

// Sign in endpoint
router.post('/signin', [
  body('phoneNumber').matches(/^(\+250|250)?[0-9]{9}$/),
  body('pin').optional().isLength({ min: 4, max: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { phoneNumber, pin } = req.body;

    // Find user by phone number
    const user = await storage.findUserByPhone(phoneNumber);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // For Phase 1, we'll implement PIN verification
    // For now, allow signin without PIN for demo
    if (pin && user.pin) {
      const isValidPin = await bcrypt.compare(pin, user.pin);
      if (!isValidPin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid PIN',
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        phoneNumber: user.phoneNumber,
        kycStatus: user.kycStatus,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLogin = new Date();
    await storage.updateUser(user.id, { lastLogin: user.lastLogin });

    // Return user data without sensitive information
    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token,
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// Set PIN endpoint
router.post('/set-pin', auth, [
  body('pin').isLength({ min: 4, max: 6 }).matches(/^[0-9]+$/),
  body('confirmPin').isLength({ min: 4, max: 6 }).matches(/^[0-9]+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { pin, confirmPin } = req.body;
    const userId = req.user.userId;

    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: 'PINs do not match',
      });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 12);

    // Update user with new PIN
    await storage.updateUser(userId, { pin: hashedPin });

    res.json({
      success: true,
      message: 'PIN set successfully',
    });

  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set PIN',
    });
  }
});

// Verify token endpoint
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await storage.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    res.json({
      success: true,
      user: userResponse,
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
    });
  }
});

// Change PIN endpoint
router.post('/change-pin', auth, [
  body('currentPin').isLength({ min: 4, max: 6 }),
  body('newPin').isLength({ min: 4, max: 6 }).matches(/^[0-9]+$/),
  body('confirmPin').isLength({ min: 4, max: 6 }).matches(/^[0-9]+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { currentPin, newPin, confirmPin } = req.body;
    const userId = req.user.userId;

    if (newPin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: 'New PINs do not match',
      });
    }

    const user = await storage.findUserById(userId);
    if (!user || !user.pin) {
      return res.status(400).json({
        success: false,
        message: 'No PIN set for this account',
      });
    }

    // Verify current PIN
    const isValidPin = await bcrypt.compare(currentPin, user.pin);
    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        message: 'Current PIN is incorrect',
      });
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(newPin, 12);

    // Update user with new PIN
    await storage.updateUser(userId, { pin: hashedPin });

    res.json({
      success: true,
      message: 'PIN changed successfully',
    });

  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change PIN',
    });
  }
});

// Refresh token endpoint
router.post('/refresh', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await storage.findUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new token
    const token = jwt.sign(
      { 
        userId: user.id,
        phoneNumber: user.phoneNumber,
        kycStatus: user.kycStatus,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
    });
  }
});

module.exports = router;
