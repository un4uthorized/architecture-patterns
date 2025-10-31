db = db.getSiblingDB('outbox-pattern');

db.createUser({
  user: 'appuser',
  pwd: 'apppassword',
  roles: [
    {
      role: 'readWrite',
      db: 'outbox-pattern'
    }
  ]
});

db.createCollection('orders');
db.createCollection('outbox_events');

db.orders.createIndex({ "id": 1 }, { unique: true });
db.orders.createIndex({ "customerId": 1 });
db.orders.createIndex({ "createdAt": 1 });

db.outbox_events.createIndex({ "id": 1 }, { unique: true });
db.outbox_events.createIndex({ "processed": 1 });
db.outbox_events.createIndex({ "createdAt": 1 });
db.outbox_events.createIndex({ "eventType": 1 });

print('Database initialization completed');