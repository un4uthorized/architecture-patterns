import { schema, types } from 'papr';
import { OrderStatus, OutboxEventStatus } from '../../domain/entities';


export const OrderSchema = schema({
  id: types.string({ required: true }),
  customerId: types.string({ required: true }),
  items: types.array(
    types.object({
      productId: types.string({ required: true }),
      productName: types.string({ required: true }),
      quantity: types.number({ required: true }),
      unitPrice: types.number({ required: true })
    }),
    { required: true }
  ),
  totalAmount: types.number({ required: true }),
  status: types.enum(Object.values(OrderStatus), { required: true }),
  createdAt: types.date({ required: true }),
  updatedAt: types.date({ required: true })
});

export type OrderDocument = (typeof OrderSchema)[0];
export type OrderProjection = (typeof OrderSchema)[1];


export const OutboxEventSchema = schema({
  id: types.string({ required: true }),
  aggregateId: types.string({ required: true }),
  eventType: types.string({ required: true }),
  payload: types.object({}, { required: true }),
  status: types.enum(Object.values(OutboxEventStatus), { required: true }),
  createdAt: types.date({ required: true }),
  updatedAt: types.date({ required: true }),
  processedAt: types.date({ required: false }),
  failureReason: types.string({ required: false }),
  retryCount: types.number({ required: true })
});

export type OutboxEventDocument = (typeof OutboxEventSchema)[0];
export type OutboxEventProjection = (typeof OutboxEventSchema)[1];