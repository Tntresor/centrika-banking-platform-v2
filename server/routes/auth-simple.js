const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { storage } = require('../storage-supabase');
const { validatePassword, getJWTSecret, getPasswordRequirements } = require('../utils/security');
const { userService } = require('../services/user-service');

const router = express.Router();
const JWT_SECRET = getJWTSecret();

// User registration endpoint with enhanced security
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;

    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate password strength
    const passwordValidation = getPasswordRequirements(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters long and contain uppercase, lowercase, number, and special character',
        requirements: passwordValidation.requirements
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByPhone(phone);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Create user using secure service
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    const result = await userService.createUser({
      firstName,
      lastName,
      phone,
      password,
      email: `${phone}@centrika.rw`,
      preferredLanguage: 'en'
    }, clientInfo);

    res.json({
      success: true,
      message: 'Account created successfully',
      data: { userId: result.user.id }
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('Password does not meet security requirements')) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    } else if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }
});

// Simple signup endpoint (legacy)
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await storage.getUserByPhone(phoneNumber);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Create new user
    const userData = {
      firstName,
      lastName,
      phone: phoneNumber,
      email: `${phoneNumber}@centrika.rw`,
      passwordHash: await bcrypt.hash('default123', 10),
      kycStatus: 'pending',
    };

    const savedUser = await storage.createUser(userData);

    // Create wallet for user
    await storage.createWallet({
      userId: savedUser.id,
      balance: '0.00',
      currency: 'RWF'
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: savedUser.id,
        phoneNumber: savedUser.phone,
        kycStatus: savedUser.kyc_status,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: savedUser.id,
        firstName: savedUser.first_name,
        lastName: savedUser.last_name,
        phoneNumber: savedUser.phone,
        kycStatus: savedUser.kyc_status,
      },
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
});

// User login endpoint with enhanced security
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }

    // Authenticate user using secure service
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    const user = await userService.authenticateUser(phone, password, clientInfo);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token with enhanced security
    const token = jwt.sign(
      { 
        userId: user.id,
        phone: user.phone,
        kycStatus: user.kycStatus
      },
      JWT_SECRET,
      { 
        expiresIn: process.env.NODE_ENV === 'production' ? '2h' : '24h',
        issuer: 'centrika-neobank',
        audience: 'centrika-users'
      }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          kycStatus: user.kycStatus
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Simple signin endpoint (legacy)
router.post('/signin', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Find user by phone number
    const user = await storage.getUserByPhone(phoneNumber);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        phoneNumber: user.phone,
        kycStatus: user.kyc_status,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone,
        kycStatus: user.kyc_status,
      },
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

module.exports = router;