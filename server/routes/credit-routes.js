const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { AppError, ErrorCodes } = require('../utils/errors');

// Validation schemas
const overdraftRequestSchema = Joi.object({
  amount: Joi.number().positive().max(1000000).required(),
  purpose: Joi.string().max(200).optional()
});

const creditRequestSchema = Joi.object({
  amount: Joi.number().positive().max(5000000).required(),
  termMonths: Joi.number().integer().min(3).max(12).required(),
  purpose: Joi.string().max(500).required()
});

const repaymentSchema = Joi.object({
  facilityId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required()
});

module.exports = (creditService, authMiddleware) => {
  
  // Request overdraft facility
  router.post('/overdraft', authMiddleware, async (req, res) => {
    try {
      const { error, value } = overdraftRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await creditService.requestOverdraft(
        req.user.id,
        value.amount,
        req.ip
      );

      res.json({
        success: true,
        message: 'Overdraft facility approved',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process overdraft request'
      });
    }
  });

  // Request credit facility
  router.post('/credit', authMiddleware, async (req, res) => {
    try {
      const { error, value } = creditRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await creditService.requestCredit(
        req.user.id,
        value.amount,
        value.termMonths,
        value.purpose,
        req.ip
      );

      res.json({
        success: true,
        message: 'Credit application submitted successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process credit request'
      });
    }
  });

  // Get user's credit facilities
  router.get('/facilities', authMiddleware, async (req, res) => {
    try {
      const facilities = await creditService.getUserCreditFacilities(req.user.id);
      
      res.json({
        success: true,
        data: facilities
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve credit facilities'
      });
    }
  });

  // Process repayment
  router.post('/repayment', authMiddleware, async (req, res) => {
    try {
      const { error, value } = repaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await creditService.processRepayment(
        value.facilityId,
        value.amount,
        req.user.id,
        req.ip
      );

      res.json({
        success: true,
        message: 'Repayment processed successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process repayment'
      });
    }
  });

  return router;
};