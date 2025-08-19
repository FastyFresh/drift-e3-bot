import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

// 404 handler
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  console.error(`Error ${statusCode}: ${error.message}`);
  console.error(error.stack);

  const response: ApiResponse = {
    success: false,
    error: error.message,
    timestamp: Date.now()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    (response as any).stack = error.stack;
  }

  res.status(statusCode).json(response);
};
