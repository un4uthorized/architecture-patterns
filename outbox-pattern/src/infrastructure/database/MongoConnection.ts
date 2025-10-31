import { MongoClient, Db } from 'mongodb';

export interface DatabaseConfig {
  url: string;
  databaseName: string;
}

export class MongoConnection {
  private client: MongoClient | null = null;
  private database: Db | null = null;

  constructor(private config: DatabaseConfig) {}

  public async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.config.url);
      await this.client.connect();
      this.database = this.client.db(this.config.databaseName);
      console.log(`Connected to MongoDB: ${this.config.databaseName}`);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.database = null;
      console.log('Disconnected from MongoDB');
    }
  }

  public getDatabase(): Db {
    if (!this.database) {
      throw new Error('Database connection not established. Call connect() first.');
    }
    return this.database;
  }

  public getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Database connection not established. Call connect() first.');
    }
    return this.client;
  }

  public async isConnected(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      await this.client.db('admin').admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}