import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { MongoConnection } from '../infrastructure/database/MongoConnection';
import { MongoTransactionManager } from '../infrastructure/database/MongoTransactionManager';
import { MongoOrderRepository, MongoOutboxEventRepository } from '../infrastructure/repositories';
import { KafkaMessageProducer } from '../infrastructure/messaging/KafkaMessageProducer';

import { 
  CreateOrderUseCase,
  ConfirmOrderUseCase,
  GetOrderUseCase,
  ListOrdersUseCase
} from '../application/use-cases';
import { OutboxProcessor } from '../application/services/OutboxProcessor';

import { OrderController, HealthController } from './controllers';
import { orderRoutes, healthRoutes } from './routes';

export interface ServerConfig {
  port: number;
  host: string;
  mongoUrl: string;
  mongoDatabase: string;
  kafkaBrokers: string[];
  kafkaClientId: string;
}

export class FastifyServer {
  private app: FastifyInstance;
  private mongoConnection: MongoConnection;
  private kafkaProducer: KafkaMessageProducer;
  private outboxProcessor: OutboxProcessor;

  constructor(private config: ServerConfig) {
    this.app = fastify({
      logger: process.env.NODE_ENV === 'development'
    });

    this.mongoConnection = new MongoConnection({
      url: config.mongoUrl,
      databaseName: config.mongoDatabase
    });

    this.kafkaProducer = new KafkaMessageProducer({
      brokers: config.kafkaBrokers,
      clientId: config.kafkaClientId
    });

    
    this.outboxProcessor = null as any;
  }

  public async start(): Promise<void> {
    try {
      
      await this.mongoConnection.connect();

      
      this.outboxProcessor = new OutboxProcessor(
        new MongoOutboxEventRepository(this.mongoConnection.getDatabase()),
        this.kafkaProducer,
        {
          batchSize: 50,
          maxRetries: 3,
          retryDelayMs: 5000,
          processingIntervalMs: 5000
        }
      );

      
      await this.registerPlugins();

      
      await this.setupRoutes();

      
      await this.outboxProcessor.start();

      
      await this.app.listen({
        port: this.config.port,
        host: this.config.host
      });

      console.log(`Server started on ${this.config.host}:${this.config.port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.outboxProcessor) {
        await this.outboxProcessor.stop();
      }

      await this.mongoConnection.disconnect();

      if (this.app) {
        await this.app.close();
      }

      console.log('Server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    
    await this.app.register(cors, {
      origin: true
    });

    
    await this.app.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Outbox Pattern API',
          description: 'API demonstrating the Outbox Pattern with Fastify, MongoDB and Kafka',
          version: '1.0.0'
        },
        servers: [
          {
            url: `http://${this.config.host}:${this.config.port}`,
            description: 'Development server'
          }
        ]
      }
    });

    await this.app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });
  }

  private async setupRoutes(): Promise<void> {
    
    if (!await this.mongoConnection.isConnected()) {
      throw new Error('Database connection is required before setting up routes');
    }
    
    const database = this.mongoConnection.getDatabase();

    const transactionManager = new MongoTransactionManager(this.mongoConnection);
    
    const orderRepository = new MongoOrderRepository(database);
    const outboxEventRepository = new MongoOutboxEventRepository(database);

    
    const createOrderUseCase = new CreateOrderUseCase(orderRepository, outboxEventRepository, transactionManager);
    const confirmOrderUseCase = new ConfirmOrderUseCase(orderRepository, outboxEventRepository);
    const getOrderUseCase = new GetOrderUseCase(orderRepository);
    const listOrdersUseCase = new ListOrdersUseCase(orderRepository);

    
    const orderController = new OrderController(
      createOrderUseCase,
      confirmOrderUseCase,
      getOrderUseCase,
      listOrdersUseCase
    );

    const healthController = new HealthController(this.outboxProcessor);

    
    await this.app.register(async (fastify) => {
      await orderRoutes(fastify, orderController);
    }, { prefix: '/api/v1' });

    await this.app.register(async (fastify) => {
      await healthRoutes(fastify, healthController);
    }, { prefix: '/api/v1' });

    
    this.app.get('/', async () => {
      return {
        message: 'Outbox Pattern API',
        version: '1.0.0',
        docs: '/docs'
      };
    });
  }

  public getApp(): FastifyInstance {
    return this.app;
  }
}