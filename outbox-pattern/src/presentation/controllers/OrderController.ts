import { FastifyRequest, FastifyReply } from 'fastify';
import { 
  CreateOrderUseCase, 
  CreateOrderRequest,
  ConfirmOrderUseCase,
  GetOrderUseCase,
  ListOrdersUseCase
} from '../../application/use-cases';

export class OrderController {
  constructor(
    private createOrderUseCase: CreateOrderUseCase,
    private confirmOrderUseCase: ConfirmOrderUseCase,
    private getOrderUseCase: GetOrderUseCase,
    private listOrdersUseCase: ListOrdersUseCase
  ) {}

  public async createOrder(
    request: FastifyRequest<{ Body: CreateOrderRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const result = await this.createOrderUseCase.execute(request.body);
      
      reply.code(201).send({
        success: true,
        data: result,
        message: 'Order created successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create order'
      });
    }
  }

  public async confirmOrder(
    request: FastifyRequest<{ Params: { orderId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const result = await this.confirmOrderUseCase.execute({
        orderId: request.params.orderId
      });
      
      reply.code(200).send({
        success: true,
        data: result,
        message: 'Order confirmed successfully'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      reply.code(statusCode).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to confirm order'
      });
    }
  }

  public async getOrder(
    request: FastifyRequest<{ Params: { orderId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const result = await this.getOrderUseCase.execute({
        orderId: request.params.orderId
      });
      
      if (!result) {
        reply.code(404).send({
          success: false,
          error: 'Order not found',
          message: `Order with id ${request.params.orderId} not found`
        });
        return;
      }
      
      reply.code(200).send({
        success: true,
        data: result,
        message: 'Order retrieved successfully'
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve order'
      });
    }
  }

  public async listOrders(
    request: FastifyRequest<{ Querystring: { customerId?: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const result = await this.listOrdersUseCase.execute({
        customerId: request.query.customerId
      });
      
      reply.code(200).send({
        success: true,
        data: result,
        message: 'Orders retrieved successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve orders'
      });
    }
  }
}