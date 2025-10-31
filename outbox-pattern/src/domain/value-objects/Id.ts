import { v4 as uuidv4 } from 'uuid';

export abstract class BaseId {
  protected constructor(protected readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('ID cannot be empty');
    }
    this._value = _value.trim();
  }

  public getValue(): string {
    return this._value;
  }

  public equals(other: BaseId): boolean {
    if (!(other instanceof BaseId)) {
      return false;
    }
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  public toJSON(): string {
    return this._value;
  }
}

export class OrderId extends BaseId {
  private constructor(value: string) {
    super(value);
  }

  public static create(): OrderId {
    return new OrderId(`order_${uuidv4()}`);
  }

  public static fromString(value: string): OrderId {
    if (!value.startsWith('order_')) {
      throw new Error('Invalid OrderId format. Must start with "order_"');
    }
    return new OrderId(value);
  }
}

export class CustomerId extends BaseId {
  private constructor(value: string) {
    super(value);
  }

  public static create(): CustomerId {
    return new CustomerId(`customer_${uuidv4()}`);
  }

  public static fromString(value: string): CustomerId {
    return new CustomerId(value);
  }
}

export class ProductId extends BaseId {
  private constructor(value: string) {
    super(value);
  }

  public static create(): ProductId {
    return new ProductId(`product_${uuidv4()}`);
  }

  public static fromString(value: string): ProductId {
    return new ProductId(value);
  }
}

export class OutboxEventId extends BaseId {
  private constructor(value: string) {
    super(value);
  }

  public static create(): OutboxEventId {
    return new OutboxEventId(uuidv4());
  }

  public static fromString(value: string): OutboxEventId {
    return new OutboxEventId(value);
  }
}