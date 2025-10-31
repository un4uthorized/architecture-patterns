import { Result, ok, err } from 'neverthrow';
import { OrderId, CustomerId, ProductId } from '../value-objects/Id';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface OrderItem {
  productId: ProductId;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export type OrderError = 
  | 'CUSTOMER_ID_REQUIRED'
  | 'ITEMS_REQUIRED'
  | 'POSITIVE_QUANTITY_REQUIRED'
  | 'NON_NEGATIVE_PRICE_REQUIRED'
  | 'INVALID_STATE_TRANSITION'
  | 'PRODUCT_ID_REQUIRED'
  | 'PRODUCT_NAME_REQUIRED';

export class Order {
  public readonly id: OrderId;
  public readonly customerId: CustomerId;
  public readonly items: OrderItem[];
  public readonly totalAmount: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  private _status: OrderStatus;

  private constructor(
    id: OrderId,
    customerId: CustomerId,
    items: OrderItem[],
    status: OrderStatus,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.customerId = customerId;
    this.items = [...items];
    this.totalAmount = this.calculateTotalAmount();
    this._status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public static create(
    customerId: CustomerId,
    items: OrderItem[],
    id?: OrderId
  ): Result<Order, OrderError> {
    if (!customerId) {
      return err('CUSTOMER_ID_REQUIRED');
    }
    
    if (!items || items.length === 0) {
      return err('ITEMS_REQUIRED');
    }

    const itemValidation = Order.validateItems(items);
    if (itemValidation.isErr()) {
      return err(itemValidation.error);
    }

    const orderId = id || OrderId.create();
    const now = new Date();

    return ok(new Order(
      orderId,
      customerId,
      items,
      OrderStatus.PENDING,
      now,
      now
    ));
  }

  public static fromPersistence(
    id: string,
    customerId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>,
    status: OrderStatus,
    createdAt: Date,
    updatedAt: Date
  ): Result<Order, OrderError> {
    try {
      const orderItems: OrderItem[] = items.map(item => ({
        productId: ProductId.fromString(item.productId),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      return ok(new Order(
        OrderId.fromString(id),
        CustomerId.fromString(customerId),
        orderItems,
        status,
        createdAt,
        updatedAt
      ));
    } catch (error) {
      console.error('Failed to restore Order from persistence:', error);
      return err('CUSTOMER_ID_REQUIRED');
    }
  }

  private static validateItems(items: OrderItem[]): Result<void, OrderError> {
    for (const item of items) {
      if (!item.productId) {
        return err('PRODUCT_ID_REQUIRED');
      }
      if (!item.productName || item.productName.trim().length === 0) {
        return err('PRODUCT_NAME_REQUIRED');
      }
      if (item.quantity <= 0) {
        return err('POSITIVE_QUANTITY_REQUIRED');
      }
      if (item.unitPrice < 0) {
        return err('NON_NEGATIVE_PRICE_REQUIRED');
      }
    }
    return ok(undefined);
  }

  public get status(): OrderStatus {
    return this._status;
  }

  public confirm(): Result<void, OrderError> {
    if (this._status !== OrderStatus.PENDING) {
      return err('INVALID_STATE_TRANSITION');
    }
    this._status = OrderStatus.CONFIRMED;
    return ok(undefined);
  }

  public ship(): Result<void, OrderError> {
    if (this._status !== OrderStatus.CONFIRMED) {
      return err('INVALID_STATE_TRANSITION');
    }
    this._status = OrderStatus.SHIPPED;
    return ok(undefined);
  }

  public deliver(): Result<void, OrderError> {
    if (this._status !== OrderStatus.SHIPPED) {
      return err('INVALID_STATE_TRANSITION');
    }
    this._status = OrderStatus.DELIVERED;
    return ok(undefined);
  }

  public cancel(): Result<void, OrderError> {
    if (this._status === OrderStatus.DELIVERED) {
      return err('INVALID_STATE_TRANSITION');
    }
    if (this._status === OrderStatus.CANCELLED) {
      return err('INVALID_STATE_TRANSITION');
    }
    this._status = OrderStatus.CANCELLED;
    return ok(undefined);
  }

  private calculateTotalAmount(): number {
    return this.items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id.getValue(),
      customerId: this.customerId.getValue(),
      items: this.items.map(item => ({
        productId: item.productId.getValue(),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      totalAmount: this.totalAmount,
      status: this._status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}