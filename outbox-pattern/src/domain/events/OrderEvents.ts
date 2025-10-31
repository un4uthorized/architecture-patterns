import { BaseDomainEvent } from './DomainEvent';
import { Order, OrderItem } from '../entities/Order';

export class OrderCreatedEvent extends BaseDomainEvent {
  constructor(order: Order) {
    super(order.id.getValue(), 'OrderCreated', {
      orderId: order.id.getValue(),
      customerId: order.customerId.getValue(),
      items: order.items.map(item => ({
        productId: item.productId.getValue(),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt
    });
  }
}

export class OrderConfirmedEvent extends BaseDomainEvent {
  constructor(order: Order) {
    super(order.id.getValue(), 'OrderConfirmed', {
      orderId: order.id.getValue(),
      customerId: order.customerId.getValue(),
      totalAmount: order.totalAmount,
      confirmedAt: new Date()
    });
  }
}

export class OrderShippedEvent extends BaseDomainEvent {
  constructor(order: Order) {
    super(order.id.getValue(), 'OrderShipped', {
      orderId: order.id.getValue(),
      customerId: order.customerId.getValue(),
      totalAmount: order.totalAmount,
      shippedAt: new Date()
    });
  }
}

export class OrderDeliveredEvent extends BaseDomainEvent {
  constructor(order: Order) {
    super(order.id.getValue(), 'OrderDelivered', {
      orderId: order.id.getValue(),
      customerId: order.customerId.getValue(),
      totalAmount: order.totalAmount,
      deliveredAt: new Date()
    });
  }
}

export class OrderCancelledEvent extends BaseDomainEvent {
  constructor(order: Order) {
    super(order.id.getValue(), 'OrderCancelled', {
      orderId: order.id.getValue(),
      customerId: order.customerId.getValue(),
      totalAmount: order.totalAmount,
      cancelledAt: new Date()
    });
  }
}