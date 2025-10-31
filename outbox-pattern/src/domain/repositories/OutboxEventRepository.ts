import { Result } from 'neverthrow';
import { OutboxEvent, OutboxEventStatus } from '../entities/OutboxEvent';
import { Transaction } from '../../infrastructure/database/TransactionManager';

export type OutboxEventRepositoryError = 
  | 'EVENT_NOT_FOUND' 
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR';

export interface OutboxEventRepository {
  save(event: OutboxEvent, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>>;
  findById(id: string): Promise<Result<OutboxEvent | null, OutboxEventRepositoryError>>;
  findPendingEvents(limit?: number): Promise<Result<OutboxEvent[], OutboxEventRepositoryError>>;
  findByStatus(status: OutboxEventStatus, limit?: number): Promise<Result<OutboxEvent[], OutboxEventRepositoryError>>;
  findByAggregateId(aggregateId: string): Promise<Result<OutboxEvent[], OutboxEventRepositoryError>>;
  update(event: OutboxEvent, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>>;
  delete(id: string, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>>;
  markAsProcessed(id: string, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>>;
  markAsFailed(id: string, reason: string, transaction?: Transaction): Promise<Result<void, OutboxEventRepositoryError>>;
}