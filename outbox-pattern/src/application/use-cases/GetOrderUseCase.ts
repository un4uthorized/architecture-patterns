import { OrderRepository } from '../../domain/repositories/OrderRepository';

export interface GetOrderRequest {
  orderId: string;
}

export interface GetOrderResponse {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  public async execute(request: GetOrderRequest): Promise<GetOrderResponse | null> {
    if (!request.orderId) {
      throw new Error('Order ID is required');
    }

    const orderResult = await this.orderRepository.findById(request.orderId);
    
    if (orderResult.isErr()) {
      throw new Error(`Failed to find order: ${orderResult.error}`);
    }
    
    const order = orderResult.value;
    if (!order) {
      return null;
    }

    return {
      id: order.id.getValue(),
      customerId: order.customerId.getValue(),
      items: order.items.map(item => ({
        productId: item.productId.getValue(),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }
}