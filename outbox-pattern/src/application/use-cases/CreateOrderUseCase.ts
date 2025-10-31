import { Order, OrderItem } from '../../domain/entities/Order';
import { OutboxEvent } from '../../domain/entities/OutboxEvent';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { OutboxEventRepository } from '../../domain/repositories/OutboxEventRepository';
import { OrderCreatedEvent } from '../../domain/events/OrderEvents';
import { CustomerId, ProductId } from '../../domain/value-objects/Id';
import { TransactionManager } from '../../infrastructure/database/TransactionManager';

export interface CreateOrderRequest {
  customerId: string;
  items: OrderItem[];
}

export interface CreateOrderResponse {
  orderId: string;
  totalAmount: number;
  status: string;
}

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private outboxEventRepository: OutboxEventRepository,
    private transactionManager: TransactionManager
  ) {}

  public async execute(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    this.validateRequest(request);

    
    const orderItems: OrderItem[] = request.items.map(item => ({
      ...item,
      productId: ProductId.fromString(item.productId.toString())
    }));

    const orderResult = Order.create(
      CustomerId.fromString(request.customerId),
      orderItems
    );
    
    if (orderResult.isErr()) {
      throw new Error(`Failed to create order: ${orderResult.error}`);
    }
    
    const order = orderResult.value;

    const domainEvent = new OrderCreatedEvent(order);
    const outboxEventResult = OutboxEvent.create(
      order.id,
      domainEvent.eventType,
      domainEvent.payload
    );
    
    if (outboxEventResult.isErr()) {
      throw new Error(`Failed to create outbox event: ${outboxEventResult.error}`);
    }
    
    const outboxEvent = outboxEventResult.value;

    return await this.transactionManager.executeInTransaction(async (transaction) => {
      const saveOrderResult = await this.orderRepository.save(order, transaction);
      if (saveOrderResult.isErr()) {
        throw new Error(`Failed to save order: ${saveOrderResult.error}`);
      }
      
      const saveOutboxResult = await this.outboxEventRepository.save(outboxEvent, transaction);
      if (saveOutboxResult.isErr()) {
        throw new Error(`Failed to save outbox event: ${saveOutboxResult.error}`);
      }

      return {
        orderId: order.id.getValue(),
        totalAmount: order.totalAmount,
        status: order.status
      };
    });
  }

  private validateRequest(request: CreateOrderRequest): void {
    if (!request.customerId) {
      throw new Error('Customer ID is required');
    }

    if (!request.items || request.items.length === 0) {
      throw new Error('Items are required');
    }

    for (const item of request.items) {
      if (!item.productId) {
        throw new Error('Product ID is required for all items');
      }
      if (!item.productName) {
        throw new Error('Product name is required for all items');
      }
      if (item.quantity <= 0) {
        throw new Error('Quantity must be positive for all items');
      }
      if (item.unitPrice < 0) {
        throw new Error('Unit price must be non-negative for all items');
      }
    }
  }
}