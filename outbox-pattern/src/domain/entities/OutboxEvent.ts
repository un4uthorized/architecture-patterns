import { Result, ok, err } from 'neverthrow';
import { OutboxEventId, OrderId } from '../value-objects/Id';

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export interface OutboxEventPayload {
  [key: string]: unknown;
}

export type OutboxEventError =
  | 'AGGREGATE_ID_REQUIRED'
  | 'EVENT_TYPE_REQUIRED'
  | 'PAYLOAD_REQUIRED'
  | 'ALREADY_PROCESSED'
  | 'FAILURE_REASON_REQUIRED'
  | 'CANNOT_RETRY_NON_FAILED_EVENT'
  | 'MAX_RETRIES_EXCEEDED';

export class OutboxEvent {
  public readonly id: OutboxEventId;
  public readonly aggregateId: OrderId;
  public readonly eventType: string;
  public readonly payload: OutboxEventPayload;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  private _status: OutboxEventStatus;
  private _processedAt?: Date;
  private _failureReason?: string;
  private _retryCount: number;

  private constructor(
    id: OutboxEventId,
    aggregateId: OrderId,
    eventType: string,
    payload: OutboxEventPayload,
    status: OutboxEventStatus,
    createdAt: Date,
    updatedAt: Date,
    processedAt?: Date,
    failureReason?: string,
    retryCount: number = 0
  ) {
    this.id = id;
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.payload = { ...payload };
    this._status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this._processedAt = processedAt;
    this._failureReason = failureReason;
    this._retryCount = retryCount;
  }

  public static create(
    aggregateId: OrderId,
    eventType: string,
    payload: OutboxEventPayload,
    id?: OutboxEventId
  ): Result<OutboxEvent, OutboxEventError> {
    if (!aggregateId) {
      return err('AGGREGATE_ID_REQUIRED');
    }
    
    if (!eventType || eventType.trim().length === 0) {
      return err('EVENT_TYPE_REQUIRED');
    }

    if (!payload) {
      return err('PAYLOAD_REQUIRED');
    }

    const eventId = id || OutboxEventId.create();
    const now = new Date();

    return ok(new OutboxEvent(
      eventId,
      aggregateId,
      eventType.trim(),
      payload,
      OutboxEventStatus.PENDING,
      now,
      now
    ));
  }

  public static fromPersistence(
    id: string,
    aggregateId: string,
    eventType: string,
    payload: OutboxEventPayload,
    status: OutboxEventStatus,
    createdAt: Date,
    updatedAt: Date,
    processedAt?: Date,
    failureReason?: string,
    retryCount: number = 0
  ): Result<OutboxEvent, OutboxEventError> {
    try {
      return ok(new OutboxEvent(
        OutboxEventId.fromString(id),
        OrderId.fromString(aggregateId),
        eventType,
        payload,
        status,
        createdAt,
        updatedAt,
        processedAt,
        failureReason,
        retryCount
      ));
    } catch (error) {
      console.error('Failed to restore OutboxEvent from persistence:', error);
      return err('AGGREGATE_ID_REQUIRED');
    }
  }

  public get status(): OutboxEventStatus {
    return this._status;
  }

  public get processedAt(): Date | undefined {
    return this._processedAt;
  }

  public get failureReason(): string | undefined {
    return this._failureReason;
  }

  public get retryCount(): number {
    return this._retryCount;
  }

  public markAsProcessed(): Result<void, OutboxEventError> {
    if (this._status === OutboxEventStatus.PROCESSED) {
      return err('ALREADY_PROCESSED');
    }
    
    this._status = OutboxEventStatus.PROCESSED;
    this._processedAt = new Date();
    this._failureReason = undefined;
    return ok(undefined);
  }

  public markAsFailed(reason: string): Result<void, OutboxEventError> {
    if (!reason || reason.trim().length === 0) {
      return err('FAILURE_REASON_REQUIRED');
    }
    
    this._status = OutboxEventStatus.FAILED;
    this._failureReason = reason.trim();
    this._retryCount += 1;
    return ok(undefined);
  }

  public retry(): Result<void, OutboxEventError> {
    if (this._status !== OutboxEventStatus.FAILED) {
      return err('CANNOT_RETRY_NON_FAILED_EVENT');
    }
    
    this._status = OutboxEventStatus.PENDING;
    this._failureReason = undefined;
    return ok(undefined);
  }

  public canRetry(maxRetries: number = 3): boolean {
    return this._retryCount < maxRetries;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id.getValue(),
      aggregateId: this.aggregateId.getValue(),
      eventType: this.eventType,
      payload: this.payload,
      status: this._status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      processedAt: this._processedAt,
      failureReason: this._failureReason,
      retryCount: this._retryCount
    };
  }
}