import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { FastifyServer, ServerConfig } from '../src/presentation/FastifyServer';

let mongod: MongoMemoryServer;
let mongoClient: MongoClient;
let database: Db;
let server: FastifyServer;
let mongoUrl: string;

beforeAll(async () => {
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  
  const originalEmit = process.emit;
  process.emit = function (name: string, data: any, ...args: any[]) {
    if (
      name === 'warning' &&
      typeof data === 'object' &&
      data.name === 'TimeoutNegativeWarning'
    ) {
      return false;
    }
    return originalEmit.apply(process, arguments as any);
  } as any;
  
  mongod = await MongoMemoryServer.create();
  mongoUrl = mongod.getUri();
  
  
  mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  database = mongoClient.db('test-outbox-pattern');
  
  
  await database.createCollection('orders');
  await database.createCollection('outbox_events');
  
  
  await database.collection('orders').createIndex({ "id": 1 }, { unique: true });
  await database.collection('orders').createIndex({ "customerId": 1 });
  await database.collection('orders').createIndex({ "createdAt": 1 });
  
  await database.collection('outbox_events').createIndex({ "id": 1 }, { unique: true });
  await database.collection('outbox_events').createIndex({ "processed": 1 });
  await database.collection('outbox_events').createIndex({ "createdAt": 1 });
  await database.collection('outbox_events').createIndex({ "eventType": 1 });

  
  const serverConfig: ServerConfig = {
    port: 0, 
    host: '127.0.0.1',
    mongoUrl: mongoUrl,
    mongoDatabase: 'test-outbox-pattern',
    kafkaBrokers: ['localhost:9092'], 
    kafkaClientId: 'test-outbox-pattern-client'
  };

  server = new FastifyServer(serverConfig);
  await server.start();
}, 60000); 

afterAll(async () => {
  
  if (server) {
    await server.stop();
  }

  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  
  if (mongod) {
    await mongod.stop();
  }
}, 30000);

beforeEach(async () => {
  
  await database.collection('orders').deleteMany({});
  await database.collection('outbox_events').deleteMany({});
});

afterEach(async () => {
  
});


export { database, server, mongoUrl };