import { OrderRepository } from '../../domain/repositories/OrderRepository';

export interface ListOrdersRequest {
  customerId?: string;
}

export interface OrderSummary {
  id: string;
  customerId: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
}

export interface ListOrdersResponse {
  orders: OrderSummary[];
  total: number;
}

export class ListOrdersUseCase {
  constructor(private orderRepository: OrderRepository) {}

  public async execute(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    let ordersResult;

    if (request.customerId) {
      ordersResult = await this.orderRepository.findByCustomerId(request.customerId);
    } else {
      throw new Error('Customer ID is required for listing orders');
    }

    if (ordersResult.isErr()) {
      throw new Error(`Failed to find orders: ${ordersResult.error}`);
    }

    const orders = ordersResult.value;
    const orderSummaries: OrderSummary[] = orders.map(order => ({
      id: order.id.getValue(),
      customerId: order.customerId.getValue(),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt
    }));

    return {
      orders: orderSummaries,
      total: orderSummaries.length
    };
  }
}