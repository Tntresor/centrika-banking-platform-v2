const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { storage } = require('../storage');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'centrika_dev_secret_key_2024';

// Simple signup endpoint
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

// Simple signin endpoint
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