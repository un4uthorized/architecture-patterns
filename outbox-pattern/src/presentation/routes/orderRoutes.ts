import { FastifyInstance } from 'fastify';
import { OrderController } from '../controllers/OrderController';

export async function orderRoutes(
  fastify: FastifyInstance,
  orderController: OrderController
): Promise<void> {
  
  fastify.post('/orders', {
    schema: {
      description: 'Create a new order',
      tags: ['orders'],
      body: {
        type: 'object',
        required: ['customerId', 'items'],
        properties: {
          customerId: { 
            type: 'string',
            description: 'Customer ID who is placing the order'
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'productName', 'quantity', 'unitPrice'],
              properties: {
                productId: { type: 'string' },
                productName: { type: 'string' },
                quantity: { type: 'number', minimum: 1 },
                unitPrice: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      },
      response: {
        201: {
          description: 'Order created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                totalAmount: { type: 'number' },
                status: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, orderController.createOrder.bind(orderController));

  
  fastify.get('/orders/:orderId', {
    schema: {
      description: 'Get order by ID',
      tags: ['orders'],
      params: {
        type: 'object',
        properties: {
          orderId: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Order retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                customerId: { type: 'string' },
                items: { type: 'array' },
                totalAmount: { type: 'number' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, orderController.getOrder.bind(orderController));

  
  fastify.patch('/orders/:orderId/confirm', {
    schema: {
      description: 'Confirm an order',
      tags: ['orders'],
      params: {
        type: 'object',
        properties: {
          orderId: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Order confirmed successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                status: { type: 'string' },
                confirmedAt: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, orderController.confirmOrder.bind(orderController));

  
  fastify.get('/orders', {
    schema: {
      description: 'List orders for a customer',
      tags: ['orders'],
      querystring: {
        type: 'object',
        properties: {
          customerId: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Orders retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                orders: { type: 'array' },
                total: { type: 'number' }
              }
            },
            message: { type: 'string' }
          }
        }
      }
    }
  }, orderController.listOrders.bind(orderController));
}