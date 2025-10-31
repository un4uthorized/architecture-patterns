import { OutboxEventRepository } from '../../domain/repositories/OutboxEventRepository';
import { MessageProducer } from '../../infrastructure/messaging/MessageProducer';
import { OutboxEvent, OutboxEventStatus } from '../../domain/entities/OutboxEvent';

export interface OutboxProcessorConfig {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  processingIntervalMs: number;
}

export class OutboxProcessor {
  private isRunning: boolean = false;
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private outboxEventRepository: OutboxEventRepository,
    private messageProducer: MessageProducer,
    private config: OutboxProcessorConfig
  ) {}

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Outbox processor is already running');
      return;
    }

    console.log('Starting outbox processor...');
    this.isRunning = true;

    
    await this.messageProducer.connect();

    
    this.intervalId = setInterval(async () => {
      try {
        await this.processOutboxEvents();
      } catch (error) {
        console.error('Error processing outbox events:', error);
      }
    }, this.config.processingIntervalMs);

    console.log('Outbox processor started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Outbox processor is not running');
      return;
    }

    console.log('Stopping outbox processor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    
    await this.messageProducer.disconnect();

    console.log('Outbox processor stopped');
  }

  public async processOutboxEvents(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      
      const pendingEventsResult = await this.outboxEventRepository.findPendingEvents(
        this.config.batchSize
      );

      if (pendingEventsResult.isErr()) {
        console.error('Error fetching pending events:', pendingEventsResult.error);
        return;
      }

      const pendingEvents = pendingEventsResult.value;
      if (pendingEvents.length === 0) {
        return;
      }

      console.log(`Processing ${pendingEvents.length} outbox events...`);

      
      for (const event of pendingEvents) {
        await this.processEvent(event);
      }

      console.log(`Successfully processed ${pendingEvents.length} outbox events`);
    } catch (error) {
      console.error('Error in processOutboxEvents:', error);
      throw error;
    }
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    try {
      
      const topic = this.getTopicForEvent(event.eventType);

      
      const message = {
        eventId: event.id,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        occurredOn: event.createdAt.toISOString()
      };

      
      await this.messageProducer.send(topic, message);

      
      await this.outboxEventRepository.markAsProcessed(event.id.getValue());

      console.log(`Successfully processed event ${event.id.getValue()} of type ${event.eventType}`);
    } catch (error) {
      console.error(`Failed to process event ${event.id.getValue()}:`, error);

      
      if (event.canRetry(this.config.maxRetries)) {
        await this.outboxEventRepository.markAsFailed(
          event.id.getValue(),
          `Processing failed: ${error}`
        );
        console.log(`Event ${event.id.getValue()} marked for retry (attempt ${event.retryCount + 1})`);
      } else {
        await this.outboxEventRepository.markAsFailed(
          event.id.getValue(),
          `Max retries exceeded: ${error}`
        );
        console.error(`Event ${event.id.getValue()} failed permanently after ${event.retryCount} retries`);
      }
    }
  }

  private getTopicForEvent(eventType: string): string {
    
    const topicMap: Record<string, string> = {
      'OrderCreated': 'order.created',
      'OrderConfirmed': 'order.confirmed',
      'OrderShipped': 'order.shipped',
      'OrderDelivered': 'order.delivered',
      'OrderCancelled': 'order.cancelled'
    };

    const topic = topicMap[eventType];
    if (!topic) {
      throw new Error(`No topic mapping found for event type: ${eventType}`);
    }

    return topic;
  }

  public async processFailedEvents(): Promise<void> {
    try {
      const failedEventsResult = await this.outboxEventRepository.findByStatus(
        OutboxEventStatus.FAILED,
        this.config.batchSize
      );

      if (failedEventsResult.isErr()) {
        console.error('Error fetching failed events:', failedEventsResult.error);
        return;
      }

      const failedEvents = failedEventsResult.value;
      if (failedEvents.length === 0) {
        return;
      }

      console.log(`Found ${failedEvents.length} failed events to retry...`);

      for (const event of failedEvents) {
        if (event.canRetry(this.config.maxRetries)) {
          
          const retryResult = event.retry();
          if (retryResult.isErr()) {
            console.error(`Failed to retry event ${event.id.getValue()}:`, retryResult.error);
            continue;
          }
          
          const updateResult = await this.outboxEventRepository.update(event);
          if (updateResult.isErr()) {
            console.error(`Failed to update event ${event.id.getValue()}:`, updateResult.error);
            continue;
          }
          
          console.log(`Event ${event.id.getValue()} reset for retry`);
        }
      }
    } catch (error) {
      console.error('Error processing failed events:', error);
      throw error;
    }
  }

  public isProcessorRunning(): boolean {
    return this.isRunning;
  }
}