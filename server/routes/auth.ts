import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { validatePhoneNumber } from '../utils/validation';
import type { APIResponse } from '../../shared/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'centrika-secret-key';

// User registration
router.post('/register', async (req, res) => {
  try {
    const { phone, firstName, lastName, email, preferredLanguage = 'en' } = req.body;

    // Validate required fields
    if (!phone || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, first name, and last name are required'
      } as APIResponse);
    }

    // Validate phone number format
    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      } as APIResponse);
    }

    // Check if user already exists
    const existingUser = await storage.getUserByPhone(phone);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this phone number already exists'
      } as APIResponse);
    }

    // Create user
    const user = await storage.createUser({
      phone,
      firstName,
      lastName,
      email,
      preferredLanguage,
      kycStatus: 'pending'
    });

    // Create wallet for user
    await storage.createWallet({
      userId: user.id,
      balance: '0.00',
      currency: 'RWF'
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          kycStatus: user.kycStatus,
          preferredLanguage: user.preferredLanguage
        },
        token
      }
    } as APIResponse);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    } as APIResponse);
  }
});

// User login (OTP simulation)
router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      } as APIResponse);
    }

    // For demo purposes, accept OTP "123456"
    if (otp !== '123456') {
      return res.status(401).json({
        success: false,
        error: 'Invalid OTP'
      } as APIResponse);
    }

    const user = await storage.getUserByPhone(phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as APIResponse);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          kycStatus: user.kycStatus,
          preferredLanguage: user.preferredLanguage
        },
        token
      }
    } as APIResponse);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    } as APIResponse);
  }
});

// Send OTP (simulation)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      } as APIResponse);
    }

    // In a real implementation, this would send an actual OTP via SMS
    // For demo purposes, we'll just return success
    res.json({
      success: true,
      message: 'OTP sent successfully. Use 123456 for demo purposes.'
    } as APIResponse);

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    } as APIResponse);
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      } as APIResponse);
    }

    const admin = await storage.getAdminUser(email);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as APIResponse);
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as APIResponse);
    }

    // Generate JWT token for admin
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role
        },
        token
      }
    } as APIResponse);

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    } as APIResponse);
  }
});

export default router;
