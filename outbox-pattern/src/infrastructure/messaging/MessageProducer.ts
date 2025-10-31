export interface MessageProducer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(topic: string, message: unknown): Promise<void>;
  sendBatch(topic: string, messages: unknown[]): Promise<void>;
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
}

export interface KafkaMessage {
  key?: string;
  value: string;
  headers?: Record<string, string>;
}