import request from 'supertest';
import { database, server } from './setup.integration';

describe('Orders Integration Tests', () => {
  const testCustomerId = 'customer-123';
  
  const validOrderData = {
    customerId: testCustomerId,
    items: [
      {
        productId: 'product-1',
        productName: 'Test Product 1',
        quantity: 2,
        unitPrice: 29.99
      },
      {
        productId: 'product-2',
        productName: 'Test Product 2',
        quantity: 1,
        unitPrice: 15.50
      }
    ]
  };

  describe('POST /api/v1/orders', () => {
    it('should create a new order and save it to MongoDB', async () => {
      const response = await request(server.getApp().server)
        .post('/api/v1/orders')
        .send(validOrderData)
        .expect(201);

      
      expect(response.body).toMatchObject({
        success: true,
        message: 'Order created successfully',
        data: expect.objectContaining({
          orderId: expect.any(String),
          totalAmount: expect.closeTo(75.48, 2), 
          status: 'PENDING'
        })
      });

      const orderId = response.body.data.orderId;

      
      const savedOrder = await database.collection('orders').findOne({ id: orderId });
      expect(savedOrder).toBeTruthy();
      expect(savedOrder).toMatchObject({
        id: orderId,
        customerId: testCustomerId,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'product-1',
            productName: 'Test Product 1',
            quantity: 2,
            unitPrice: 29.99
          }),
          expect.objectContaining({
            productId: 'product-2',
            productName: 'Test Product 2',
            quantity: 1,
            unitPrice: 15.50
          })
        ]),
        totalAmount: expect.closeTo(75.48, 2),
        status: 'PENDING'
      });

      
      const outboxEvents = await database.collection('outbox_events').find({ 
        aggregateId: orderId 
      }).toArray();
      
      expect(outboxEvents).toHaveLength(1);
      expect(outboxEvents[0]).toMatchObject({
        aggregateId: orderId,
        eventType: 'OrderCreated',
        status: 'PENDING' 
      });
    });

    it('should return 400 for invalid order data', async () => {
      const invalidOrderData = {
        customerId: '',
        items: []
      };

      const response = await request(server.getApp().server)
        .post('/api/v1/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to create order'
      });

      
      const ordersCount = await database.collection('orders').countDocuments();
      expect(ordersCount).toBe(0);

      const outboxEventsCount = await database.collection('outbox_events').countDocuments();
      expect(outboxEventsCount).toBe(0);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteOrderData = {
        customerId: testCustomerId
        
      };

      const response = await request(server.getApp().server)
        .post('/api/v1/orders')
        .send(incompleteOrderData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('required property') 
      });
    });
  });

  describe('GET /api/v1/orders/:orderId', () => {
    let createdOrderId: string;

    beforeEach(async () => {
      
      const response = await request(server.getApp().server)
        .post('/api/v1/orders')
        .send(validOrderData)
        .expect(201);
      
      createdOrderId = response.body.data.orderId;
    });

    it('should retrieve an existing order', async () => {
      const response = await request(server.getApp().server)
        .get(`/api/v1/orders/${createdOrderId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          id: createdOrderId,
          customerId: testCustomerId,
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: 'product-1',
              productName: 'Test Product 1',
              quantity: 2,
              unitPrice: 29.99
            })
          ]),
          totalAmount: expect.closeTo(75.48, 2),
          status: 'PENDING'
        })
      });
    });

    it('should return 404 for non-existent order', async () => {
      const nonExistentOrderId = 'non-existent-order-id';

      const response = await request(server.getApp().server)
        .get(`/api/v1/orders/${nonExistentOrderId}`)
        .expect(404); 

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });
  });

  describe('PATCH /api/v1/orders/:orderId/confirm', () => {
    let createdOrderId: string;

    beforeEach(async () => {
      
      const response = await request(server.getApp().server)
        .post('/api/v1/orders')
        .send(validOrderData)
        .expect(201);
      
      createdOrderId = response.body.data.orderId;
    });

    it('should confirm an existing order and update MongoDB', async () => {
      const response = await request(server.getApp().server)
        .patch(`/api/v1/orders/${createdOrderId}/confirm`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          orderId: createdOrderId,
          status: 'CONFIRMED',
          confirmedAt: expect.any(String)
        })
      });

      
      const updatedOrder = await database.collection('orders').findOne({ id: createdOrderId });
      expect(updatedOrder).toBeTruthy();
      expect(updatedOrder!.status).toBe('CONFIRMED');
      

      
      const outboxEvents = await database.collection('outbox_events').find({ 
        aggregateId: createdOrderId,
        eventType: 'OrderConfirmed'
      }).toArray();
      
      expect(outboxEvents).toHaveLength(1);
      expect(outboxEvents[0]).toMatchObject({
        aggregateId: createdOrderId,
        eventType: 'OrderConfirmed',
        status: 'PENDING' 
      });

      
      const allEvents = await database.collection('outbox_events').find({ 
        aggregateId: createdOrderId 
      }).toArray();
      expect(allEvents).toHaveLength(2);
    });

    it('should return error for non-existent order', async () => {
      const nonExistentOrderId = 'non-existent-order-id';

      const response = await request(server.getApp().server)
        .patch(`/api/v1/orders/${nonExistentOrderId}/confirm`)
        .expect(404); 

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });

    it('should handle already confirmed order gracefully', async () => {
      
      await request(server.getApp().server)
        .patch(`/api/v1/orders/${createdOrderId}/confirm`)
        .expect(200);

      
      const response = await request(server.getApp().server)
        .patch(`/api/v1/orders/${createdOrderId}/confirm`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });
  });

  describe('GET /api/v1/orders', () => {
    const customer1 = 'customer-1';
    const customer2 = 'customer-2';

    beforeEach(async () => {
      
      await request(server.getApp().server)
        .post('/api/v1/orders')
        .send({
          customerId: customer1,
          items: [{ productId: 'p1', productName: 'Product 1', quantity: 1, unitPrice: 10.00 }]
        });

      await request(server.getApp().server)
        .post('/api/v1/orders')
        .send({
          customerId: customer1,
          items: [{ productId: 'p2', productName: 'Product 2', quantity: 2, unitPrice: 20.00 }]
        });

      
      await request(server.getApp().server)
        .post('/api/v1/orders')
        .send({
          customerId: customer2,
          items: [{ productId: 'p3', productName: 'Product 3', quantity: 1, unitPrice: 30.00 }]
        });
    });

    it('should list orders for a specific customer', async () => {
      const response = await request(server.getApp().server)
        .get('/api/v1/orders')
        .query({ customerId: customer1 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          orders: expect.any(Array),
          total: 2
        })
      });

      const orders = response.body.data.orders;
      expect(orders).toHaveLength(2);
      
      
      orders.forEach((order: any) => {
        expect(order.customerId).toBe(customer1);
      });

      
      const mongoOrders = await database.collection('orders').find({ customerId: customer1 }).toArray();
      expect(mongoOrders).toHaveLength(2);
    });

    it('should return empty list for customer with no orders', async () => {
      const customerWithNoOrders = 'customer-no-orders';

      const response = await request(server.getApp().server)
        .get('/api/v1/orders')
        .query({ customerId: customerWithNoOrders })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          orders: [],
          total: 0
        })
      });
    });

    it('should return error when no customerId is provided', async () => {
      const response = await request(server.getApp().server)
        .get('/api/v1/orders')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Failed to retrieve orders')
      });
    });
  });

  describe('Data consistency across operations', () => {
    it('should maintain data consistency through complete order lifecycle', async () => {
      
      const createResponse = await request(server.getApp().server)
        .post('/api/v1/orders')
        .send(validOrderData)
        .expect(201);

      const orderId = createResponse.body.data.orderId;

      
      let mongoOrder = await database.collection('orders').findOne({ id: orderId });
      expect(mongoOrder).toBeTruthy();
      expect(mongoOrder!.status).toBe('PENDING');

      
      const getResponse = await request(server.getApp().server)
        .get(`/api/v1/orders/${orderId}`)
        .expect(200);

      expect(getResponse.body.data.id).toBe(orderId);
      expect(getResponse.body.data.status).toBe('PENDING');

      
      await request(server.getApp().server)
        .patch(`/api/v1/orders/${orderId}/confirm`)
        .expect(200);

      
      mongoOrder = await database.collection('orders').findOne({ id: orderId });
      expect(mongoOrder!.status).toBe('CONFIRMED');
      

      
      const getConfirmedResponse = await request(server.getApp().server)
        .get(`/api/v1/orders/${orderId}`)
        .expect(200);

      expect(getConfirmedResponse.body.data.status).toBe('CONFIRMED');

      
      const allEvents = await database.collection('outbox_events').find({ 
        aggregateId: orderId 
      }).toArray();
      
      expect(allEvents).toHaveLength(2);
      
      const eventTypes = allEvents.map(event => event.eventType).sort();
      expect(eventTypes).toEqual(['OrderConfirmed', 'OrderCreated']);
    });
  });
});