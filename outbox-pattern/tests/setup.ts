import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongod: MongoMemoryServer;
let mongoClient: MongoClient;
let database: Db;

beforeAll(async () => {
  
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  
  mongoClient = new MongoClient(uri);
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
});

afterAll(async () => {
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  
  await database.collection('orders').deleteMany({});
  await database.collection('outbox_events').deleteMany({});
});


export { database };