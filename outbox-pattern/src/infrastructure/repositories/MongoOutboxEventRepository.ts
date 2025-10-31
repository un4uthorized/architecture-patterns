import { Collection, Db } from 'mongodb';
import { Result, ok, err } from 'neverthrow';
import { OutboxEvent, OutboxEventStatus, OutboxEventPayload } from '../../domain/entities/OutboxEvent';
import { OutboxEventRepository, OutboxEventRepositoryError } from '../../domain/repositories/OutboxEventRepository';
import { OutboxEventId, OrderId } from '../../domain/value-objects/Id';
import { Transaction } from '../database/TransactionManager';

interface OutboxEventDocument {
  _id?: string;
  id: string;
  aggregateId: string;
  eventType: string;
  payload: OutboxEventPayload;
  status: OutboxEventStatus;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failureReason?: string;
  retryCount: number;
}

export class MongoOutboxEventRepository implements OutboxEventRepository {
  private collection: Collection<OutboxEventDocument>;

  constructor(database: Db) {
    this.collection = database.collection<OutboxEventDocument>('outbox_events');
  }

  public async save(event: OutboxEvent, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>> {
    try {
      const document: OutboxEventDocument = {
        id: event.id.getValue(),
        aggregateId: event.aggregateId.getValue(),
        eventType: event.eventType,
        payload: event.payload,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        processedAt: event.processedAt,
        failureReason: event.failureReason,
        retryCount: event.retryCount
      };

      const options = transaction ? { session: transaction.session } : {};
      await this.collection.insertOne(document, options);
      return ok(undefined);
    } catch (error) {
      console.error('Error saving outbox event:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findById(id: string): Promise<Result<OutboxEvent | null, OutboxEventRepositoryError>> {
    try {
      const document = await this.collection.findOne({ id });
      
      if (!document) {
        return ok(null);
      }

      const eventResult = this.mapDocumentToOutboxEvent(document);
      if (eventResult.isErr()) {
        return err(eventResult.error);
      }

      return ok(eventResult.value);
    } catch (error) {
      console.error('Error finding outbox event by id:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findPendingEvents(limit: number = 100): Promise<Result<OutboxEvent[], OutboxEventRepositoryError>> {
    try {
      const documents = await this.collection
        .find({ status: OutboxEventStatus.PENDING })
        .sort({ createdAt: 1 })
        .limit(limit)
        .toArray();

      const events: OutboxEvent[] = [];
      for (const doc of documents) {
        const eventResult = this.mapDocumentToOutboxEvent(doc);
        if (eventResult.isErr()) {
          return err(eventResult.error);
        }
        events.push(eventResult.value);
      }

      return ok(events);
    } catch (error) {
      console.error('Error finding pending outbox events:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findByStatus(status: OutboxEventStatus, limit: number = 100): Promise<Result<OutboxEvent[], OutboxEventRepositoryError>> {
    try {
      const documents = await this.collection
        .find({ status })
        .sort({ createdAt: 1 })
        .limit(limit)
        .toArray();

      const events: OutboxEvent[] = [];
      for (const doc of documents) {
        const eventResult = this.mapDocumentToOutboxEvent(doc);
        if (eventResult.isErr()) {
          return err(eventResult.error);
        }
        events.push(eventResult.value);
      }

      return ok(events);
    } catch (error) {
      console.error('Error finding outbox events by status:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findByAggregateId(aggregateId: string): Promise<Result<OutboxEvent[], OutboxEventRepositoryError>> {
    try {
      const documents = await this.collection
        .find({ aggregateId })
        .sort({ createdAt: 1 })
        .toArray();

      const events: OutboxEvent[] = [];
      for (const doc of documents) {
        const eventResult = this.mapDocumentToOutboxEvent(doc);
        if (eventResult.isErr()) {
          return err(eventResult.error);
        }
        events.push(eventResult.value);
      }

      return ok(events);
    } catch (error) {
      console.error('Error finding outbox events by aggregate id:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async update(event: OutboxEvent, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>> {
    try {
      const document: Partial<OutboxEventDocument> = {
        aggregateId: event.aggregateId.getValue(),
        eventType: event.eventType,
        payload: event.payload,
        status: event.status,
        updatedAt: event.updatedAt,
        processedAt: event.processedAt,
        failureReason: event.failureReason,
        retryCount: event.retryCount
      };

      const options = transaction ? { session: transaction.session } : {};
      const result = await this.collection.updateOne(
        { id: event.id.getValue() },
        { $set: document },
        options
      );

      if (result.matchedCount === 0) {
        return err('EVENT_NOT_FOUND');
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error updating outbox event:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async delete(id: string, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>> {
    try {
      const options = transaction ? { session: transaction.session } : {};
      const result = await this.collection.deleteOne({ id }, options);

      if (result.deletedCount === 0) {
        return err('EVENT_NOT_FOUND');
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error deleting outbox event:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async markAsProcessed(id: string, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>> {
    try {
      const options = transaction ? { session: transaction.session } : {};
      const result = await this.collection.updateOne(
        { id },
        {
          $set: {
            status: OutboxEventStatus.PROCESSED,
            processedAt: new Date(),
            updatedAt: new Date()
          }
        },
        options
      );

      if (result.matchedCount === 0) {
        return err('EVENT_NOT_FOUND');
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error marking outbox event as processed:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async markAsFailed(id: string, reason: string, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>> {
    try {
      const options = transaction ? { session: transaction.session } : {};
      const result = await this.collection.updateOne(
        { id },
        {
          $set: {
            status: OutboxEventStatus.FAILED,
            failureReason: reason,
            updatedAt: new Date()
          },
          $inc: {
            retryCount: 1
          }
        },
        options
      );

      if (result.matchedCount === 0) {
        return err('EVENT_NOT_FOUND');
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error marking outbox event as failed:', error);
      return err('DATABASE_ERROR');
    }
  }

  private mapDocumentToOutboxEvent(document: OutboxEventDocument): Result<OutboxEvent, OutboxEventRepositoryError> {
    try {
      const eventResult = OutboxEvent.fromPersistence(
        document.id,
        document.aggregateId,
        document.eventType,
        document.payload,
        document.status,
        document.createdAt,
        document.updatedAt,
        document.processedAt,
        document.failureReason,
        document.retryCount
      );

      if (eventResult.isErr()) {
        return err('VALIDATION_ERROR');
      }

      return ok(eventResult.value);
    } catch (error) {
      console.error('Error mapping document to outbox event:', error);
      return err('VALIDATION_ERROR');
    }
  }
}