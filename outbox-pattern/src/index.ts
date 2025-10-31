import dotenv from 'dotenv';
import { FastifyServer, ServerConfig } from './presentation/FastifyServer';


dotenv.config();


const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017',
  mongoDatabase: process.env.MONGODB_DATABASE || 'outbox-pattern',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'outbox-pattern-service'
};


async function bootstrap(): Promise<void> {
  const server = new FastifyServer(config);

  
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}


bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});