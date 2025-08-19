/**
 * Main Entry Point
 * Uses the new modular architecture for trading
 */

import { MainTradingEngine } from '@/core/engine';
import { logger } from '@/utils/logger';

/**
 * Main function to start the trading bot
 */
async function main(): Promise<void> {
  logger.info('Main', '🚀 Starting Drift E3 Trading Bot...');

  const engine = new MainTradingEngine();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info('Main', `📡 Received ${signal}, shutting down gracefully...`);
    try {
      await engine.stop();
      logger.info('Main', '✅ Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Main', '❌ Error during shutdown', error);
      process.exit(1);
    }
  };

  // Setup signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    logger.error('Main', '❌ Uncaught exception', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Main', '❌ Unhandled rejection', reason);
    shutdown('unhandledRejection');
  });

  try {
    // Initialize and start the trading engine
    await engine.initialize();
    await engine.start();
  } catch (error) {
    logger.error('Main', '❌ Failed to start trading engine', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main };
