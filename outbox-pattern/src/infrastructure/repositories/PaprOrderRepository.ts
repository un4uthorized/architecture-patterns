import { Result, ok, err } from 'neverthrow';
import Papr, { Model } from 'papr';
import { Order, OrderError } from '../../domain/entities/Order';
import { OrderRepository, OrderRepositoryError } from '../../domain/repositories/OrderRepository';
import { OrderDocument, OrderSchema } from '../database/schemas';

export class PaprOrderRepository implements OrderRepository {
  private orders: Model<OrderDocument, any>;

  constructor(private papr: Papr) {
    this.orders = this.papr.model('orders', OrderSchema);
  }

  public async save(order: Order): Promise<Result<void, OrderRepositoryError>> {
    try {
      const document: Omit<OrderDocument, '_id'> = {
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

      await this.orders.insertOne(document as any);
      return ok(undefined);
    } catch (error) {
      console.error('Error saving order:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findById(id: string): Promise<Result<Order | null, OrderRepositoryError>> {
    try {
      const document = await this.orders.findOne({ id } as any);
      
      if (!document) {
        return ok(null);
      }

      const order = Order.fromPersistence(
        document.id,
        document.customerId,
        document.items,
        document.status,
        document.createdAt,
        document.updatedAt
      );

      if (order.isErr()) {
        return err('VALIDATION_ERROR');
      }

      return ok(order.value);
    } catch (error) {
      console.error('Error finding order by id:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findByCustomerId(customerId: string): Promise<Result<Order[], OrderRepositoryError>> {
    try {
      const documents = await this.orders.find({ customerId } as any);
      
      const orders: Order[] = [];
      for (const doc of documents) {
        const order = Order.fromPersistence(
          doc.id,
          doc.customerId,
          doc.items,
          doc.status,
          doc.createdAt,
          doc.updatedAt
        );

        if (order.isErr()) {
          return err('VALIDATION_ERROR');
        }

        orders.push(order.value);
      }

      return ok(orders);
    } catch (error) {
      console.error('Error finding orders by customer id:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async update(order: Order): Promise<Result<void, OrderRepositoryError>> {
    try {
      const document: Partial<OrderDocument> = {
        customerId: order.customerId.getValue(),
        items: order.items.map(item => ({
          productId: item.productId.getValue(),
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        updatedAt: new Date()
      };

      const result = await this.orders.updateOne(
        { id: order.id.getValue() } as any,
        { $set: document }
      );

      if (result.matchedCount === 0) {
        return err('ORDER_NOT_FOUND');
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error updating order:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async delete(id: string): Promise<Result<void, OrderRepositoryError>> {
    try {
      const result = await this.orders.deleteOne({ id } as any);
      
      if (result.deletedCount === 0) {
        return err('ORDER_NOT_FOUND');
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error deleting order:', error);
      return err('DATABASE_ERROR');
    }
  }
}