import { Order } from '../../domain/entities/Order';
import { OutboxEvent } from '../../domain/entities/OutboxEvent';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { OutboxEventRepository } from '../../domain/repositories/OutboxEventRepository';
import { OrderConfirmedEvent } from '../../domain/events/OrderEvents';

export interface ConfirmOrderRequest {
  orderId: string;
}

export interface ConfirmOrderResponse {
  orderId: string;
  status: string;
  confirmedAt: Date;
}

export class ConfirmOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private outboxEventRepository: OutboxEventRepository
  ) {}

  public async execute(request: ConfirmOrderRequest): Promise<ConfirmOrderResponse> {
    if (!request.orderId) {
      throw new Error('Order ID is required');
    }

    const orderResult = await this.orderRepository.findById(request.orderId);
    if (orderResult.isErr()) {
      throw new Error(`Failed to find order: ${orderResult.error}`);
    }
    
    const order = orderResult.value;
    if (!order) {
      throw new Error(`Order with id ${request.orderId} not found`);
    }

    const confirmResult = order.confirm();
    if (confirmResult.isErr()) {
      throw new Error(`Failed to confirm order: ${confirmResult.error}`);
    }

    const domainEvent = new OrderConfirmedEvent(order);
    const outboxEventResult = OutboxEvent.create(
      order.id,
      domainEvent.eventType,
      domainEvent.payload
    );
    
    if (outboxEventResult.isErr()) {
      throw new Error(`Failed to create outbox event: ${outboxEventResult.error}`);
    }
    
    const outboxEvent = outboxEventResult.value;

    try {
      const updateResult = await this.orderRepository.update(order);
      if (updateResult.isErr()) {
        throw new Error(`Failed to update order: ${updateResult.error}`);
      }
      
      const saveResult = await this.outboxEventRepository.save(outboxEvent);
      if (saveResult.isErr()) {
        throw new Error(`Failed to save outbox event: ${saveResult.error}`);
      }

      return {
        orderId: order.id.getValue(),
        status: order.status,
        confirmedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to confirm order: ${error}`);
    }
  }
}