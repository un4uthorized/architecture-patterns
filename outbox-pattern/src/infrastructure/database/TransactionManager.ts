import { ClientSession } from 'mongodb';

export interface Transaction {
  session: ClientSession;
}

export interface TransactionManager {
  executeInTransaction<T>(operation: (transaction: Transaction) => Promise<T>): Promise<T>;
}