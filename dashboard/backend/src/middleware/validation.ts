import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Configuration validation schema
const configSchema = Joi.object({
  market: Joi.string().optional(),
  strategy: Joi.string().optional(),
  comment: Joi.string().optional(),
  description: Joi.string().optional(),
  parameters: Joi.object({
    bodyOverAtr: Joi.number().min(0).max(10).required(),
    volumeZ: Joi.number().min(0).max(20).required(),
    premiumPct: Joi.number().min(0).max(0.1).required(),
    realizedVol: Joi.number().min(1).max(100).required(),
    spreadBps: Joi.number().min(1).max(1000).required(),
    bigMoveVolumeZ: Joi.number().min(0).max(20).required(),
    bigMoveBodyAtr: Joi.number().min(0).max(10).required(),
    confidenceMultiplier: Joi.number().min(0.1).max(10).required(),
    takeProfitPct: Joi.number().min(0.001).max(0.5).required(),
    stopLossPct: Joi.number().min(0.001).max(0.2).required(),
    trailingStopPct: Joi.number().min(0.001).max(0.1).required()
  }).required()
});

// Middleware to validate configuration
export const validateConfig = (req: Request, res: Response, next: NextFunction) => {
  // Only validate POST and PUT requests
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return next();
  }

  // Skip validation for certain endpoints
  const skipValidation = ['/validate', '/compare'];
  if (skipValidation.some(path => req.path.includes(path))) {
    return next();
  }

  const { error } = configSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid configuration format',
      details: error.details.map(detail => detail.message),
      timestamp: Date.now()
    });
  }

  next();
};

// Pagination validation
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const limit = parseInt(req.query.limit as string);
  const offset = parseInt(req.query.offset as string);

  if (req.query.limit && (isNaN(limit) || limit < 1 || limit > 1000)) {
    res.status(400).json({
      success: false,
      error: 'Invalid limit parameter. Must be between 1 and 1000',
      timestamp: Date.now()
    });
    return;
  }

  if (req.query.offset && (isNaN(offset) || offset < 0)) {
    res.status(400).json({
      success: false,
      error: 'Invalid offset parameter. Must be 0 or greater',
      timestamp: Date.now()
    });
    return;
  }

  next();
};

// Date range validation
export const validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
  const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : undefined;

  if (startDate && isNaN(startDate)) {
    res.status(400).json({
      success: false,
      error: 'Invalid startDate parameter. Must be a valid timestamp',
      timestamp: Date.now()
    });
    return;
  }

  if (endDate && isNaN(endDate)) {
    res.status(400).json({
      success: false,
      error: 'Invalid endDate parameter. Must be a valid timestamp',
      timestamp: Date.now()
    });
    return;
  }

  if (startDate && endDate && startDate >= endDate) {
    res.status(400).json({
      success: false,
      error: 'startDate must be before endDate',
      timestamp: Date.now()
    });
    return;
  }

  next();
};
