import { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/HealthController';

export async function healthRoutes(
  fastify: FastifyInstance,
  healthController: HealthController
): Promise<void> {
  
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                timestamp: { type: 'string' },
                services: { type: 'object' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, healthController.healthCheck.bind(healthController));

  
  fastify.get('/health/outbox', {
    schema: {
      description: 'Outbox processor status',
      tags: ['health'],
      response: {
        200: {
          description: 'Outbox processor status retrieved',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                outboxProcessor: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    lastChecked: { type: 'string' }
                  }
                }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, healthController.outboxStatus.bind(healthController));
}