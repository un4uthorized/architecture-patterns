import { Collection, Db } from 'mongodb';
import { Result, ok, err } from 'neverthrow';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { OrderRepository, OrderRepositoryError } from '../../domain/repositories/OrderRepository';
import { Transaction } from '../database/TransactionManager';

interface OrderDocument {
  _id?: string;
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoOrderRepository implements OrderRepository {
  private collection: Collection<OrderDocument>;

  constructor(database: Db) {
    this.collection = database.collection<OrderDocument>('orders');
  }

  public async save(order: Order, transaction?: Transaction): Promise<Result<void, OrderRepositoryError>> {
    try {
      const document: OrderDocument = {
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

      const options = transaction ? { session: transaction.session } : {};
      await this.collection.insertOne(document, options);
      return ok(undefined);
    } catch (error) {
      console.error('Error saving order:', error);
      return err('DATABASE_ERROR');
    }
  }

  public async findById(id: string): Promise<Result<Order | null, OrderRepositoryError>> {
    try {
      const document = await this.collection.findOne({ id });
      
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
      const documents = await this.collection.find({ customerId }).toArray();
      
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

  public async update(order: Order, transaction?: Transaction): Promise<Result<void, OrderRepositoryError>> {
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

      const options = transaction ? { session: transaction.session } : {};
      const result = await this.collection.updateOne(
        { id: order.id.getValue() },
        { $set: document },
        options
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

  public async delete(id: string, transaction?: Transaction): Promise<Result<void, OrderRepositoryError>> {
    try {
      const options = transaction ? { session: transaction.session } : {};
      const result = await this.collection.deleteOne({ id }, options);
      
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