import { Result } from 'neverthrow';
import { Order } from '../entities/Order';
import { Transaction } from '../../infrastructure/database/TransactionManager';

export type OrderRepositoryError = 
  | 'ORDER_NOT_FOUND' 
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR';

export interface OrderRepository {
  save(order: Order, transaction?: Transaction): Promise<Result<void, OrderRepositoryError>>;
  findById(id: string): Promise<Result<Order | null, OrderRepositoryError>>;
  findByCustomerId(customerId: string): Promise<Result<Order[], OrderRepositoryError>>;
  update(order: Order, transaction?: Transaction): Promise<Result<void, OrderRepositoryError>>;
  delete(id: string, transaction?: Transaction): Promise<Result<void, OrderRepositoryError>>;
}