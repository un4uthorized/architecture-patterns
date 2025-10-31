import { FastifyRequest, FastifyReply } from 'fastify';
import { OutboxProcessor } from '../../application/services/OutboxProcessor';

export class HealthController {
  constructor(private outboxProcessor: OutboxProcessor) {}

  public async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const isOutboxRunning = this.outboxProcessor.isProcessorRunning();
      
      reply.code(200).send({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            outboxProcessor: isOutboxRunning ? 'running' : 'stopped'
          }
        },
        message: 'Service is healthy'
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Health check failed'
      });
    }
  }

  public async outboxStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const isRunning = this.outboxProcessor.isProcessorRunning();
      
      reply.code(200).send({
        success: true,
        data: {
          outboxProcessor: {
            status: isRunning ? 'running' : 'stopped',
            lastChecked: new Date().toISOString()
          }
        },
        message: 'Outbox processor status retrieved successfully'
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve outbox processor status'
      });
    }
  }
}