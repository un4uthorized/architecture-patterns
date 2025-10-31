import { Kafka, Producer, Partitioners } from 'kafkajs';
import { MessageProducer, KafkaConfig, KafkaMessage } from './MessageProducer';

export class KafkaMessageProducer implements MessageProducer {
  private kafka: Kafka;
  private producer: Producer;
  private connected: boolean = false;

  constructor(private config: KafkaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers
    });
    
    this.producer = this.kafka.producer({
      maxInFlightRequests: 5,
      idempotent: true,
      createPartitioner: Partitioners.LegacyPartitioner
    });
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.producer.connect();
      this.connected = true;
      console.log('Kafka producer connected');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.producer.disconnect();
      this.connected = false;
      console.log('Kafka producer disconnected');
    } catch (error) {
      console.error('Failed to disconnect Kafka producer:', error);
      throw error;
    }
  }

  public async send(topic: string, message: unknown): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer is not connected. Call connect() first.');
    }

    try {
      const kafkaMessage: KafkaMessage = this.serializeMessage(message);
      
      await this.producer.send({
        topic,
        messages: [kafkaMessage]
      });

      console.log(`Message sent to topic ${topic}`);
    } catch (error) {
      console.error(`Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  public async sendBatch(topic: string, messages: unknown[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer is not connected. Call connect() first.');
    }

    if (messages.length === 0) {
      return;
    }

    try {
      const kafkaMessages: KafkaMessage[] = messages.map(msg => this.serializeMessage(msg));
      
      await this.producer.send({
        topic,
        messages: kafkaMessages
      });

      console.log(`${messages.length} messages sent to topic ${topic}`);
    } catch (error) {
      console.error(`Failed to send batch messages to topic ${topic}:`, error);
      throw error;
    }
  }

  private serializeMessage(message: unknown): KafkaMessage {
    try {
      const serialized = JSON.stringify(message);
      return {
        value: serialized,
        headers: {
          'content-type': 'application/json',
          'timestamp': new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to serialize message: ${error}`);
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }
}