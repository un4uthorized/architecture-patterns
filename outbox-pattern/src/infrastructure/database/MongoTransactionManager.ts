import { MongoClient, ClientSession } from 'mongodb';
import { TransactionManager, Transaction } from './TransactionManager';
import { MongoConnection } from './MongoConnection';

export class MongoTransactionManager implements TransactionManager {
  private client: MongoClient;

  constructor(private mongoConnection: MongoConnection) {
    this.client = this.mongoConnection.getClient();
  }

  public async executeInTransaction<T>(
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const session: ClientSession = this.client.startSession();
    
    try {
      let result: T;
      
      await session.withTransaction(async () => {
        const transaction: Transaction = { session };
        result = await operation(transaction);
      });
      
      return result!;
    } finally {
      await session.endSession();
    }
  }
}