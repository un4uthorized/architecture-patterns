# Outbox Pattern

## 🏗️ Arquitetura

```
src/
├── domain/                 # Camada de Domínio
│   ├── entities/          # Entidades de negócio
│   ├── events/            # Eventos de domínio
│   └── repositories/      # Interfaces dos repositórios
├── application/           # Camada de Aplicação
│   ├── use-cases/        # Casos de uso
│   └── services/         # Serviços de aplicação
├── infrastructure/       # Camada de Infraestrutura
│   ├── database/         # Conexão com banco de dados
│   ├── messaging/        # Cliente Kafka
│   └── repositories/     # Implementações dos repositórios
└── presentation/         # Camada de Apresentação
    ├── controllers/      # Controladores HTTP
    └── routes/          # Definição das rotas
```

## 🎯 Outbox Pattern

O **Outbox Pattern** garante que as operações de banco de dados e o envio de mensagens para o Kafka sejam executadas de forma atômica:

1. **Transação Local**: As mudanças na entidade principal e os eventos são salvos na mesma transação
2. **Processamento Assíncrono**: Um processo separado lê os eventos pendentes e os publica no Kafka
3. **Idempotência**: Eventos são marcados como processados para evitar duplicação

## 🚀 Funcionalidades

- ✅ **CRUD de Pedidos** com eventos de domínio
- ✅ **Outbox Pattern** para garantir consistência eventual
- ✅ **Processamento assíncrono** de eventos
- ✅ **Kafka Integration** para mensageria
- ✅ **MongoDB** como banco de dados principal
- ✅ **Clean Architecture** e princípios **SOLID**
- ✅ **Testes de integração** com MongoDB Memory Server
- ✅ **API REST** documentada com Swagger
- ✅ **Health checks** para monitoramento

## 🛠️ Tecnologias

- **Node.js** + **TypeScript**
- **Fastify** (Framework web)
- **MongoDB** (Banco de dados)
- **Kafka** (Message broker)
- **Jest** (Testes)
- **MongoDB Memory Server** (Testes de integração)
- **Docker Compose** (Orquestração de serviços)

## 📋 Pré-requisitos

- **Node.js** (v18 ou superior)
- **npm** ou **yarn**
- **Docker** e **Docker Compose**

## 🏃‍♂️ Como executar

### 1. Clone o repositório

```bash
git clone <repository-url>
cd outbox-pattern
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` conforme necessário.

### 4. Inicie os serviços com Docker

```bash
npm run docker:up
```

Isso iniciará:
- **MongoDB** (porta 27017)
- **Kafka** + **Zookeeper** (porta 9092)
- **Mongo Express** (porta 8081) - Interface web para MongoDB
- **Kafka UI** (porta 8080) - Interface web para Kafka

### 5. Execute a aplicação

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

### 6. Acesse a aplicação

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/api/v1/health
- **Mongo Express**: http://localhost:8081
- **Kafka UI**: http://localhost:8080

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes de integração
npm run test:integration

# Testes em modo watch
npm run test:watch
```

## 📖 Uso da API

### Criar um pedido

```bash
POST /api/v1/orders
Content-Type: application/json

{
  "customerId": "customer-123",
  "items": [
    {
      "productId": "product-1",
      "productName": "Product Name",
      "quantity": 2,
      "unitPrice": 10.99
    }
  ]
}
```

### Confirmar um pedido

```bash
PATCH /api/v1/orders/{orderId}/confirm
```

### Buscar um pedido

```bash
GET /api/v1/orders/{orderId}
```

### Listar pedidos de um cliente

```bash
GET /api/v1/orders?customerId=customer-123
```

## 🔄 Fluxo do Outbox Pattern

1. **Criação do Pedido**:
   - Pedido é salvo no MongoDB
   - Evento `OrderCreated` é salvo na tabela `outbox_events`
   - Ambas operações ocorrem na mesma transação

2. **Processamento do Outbox**:
   - Processo em background busca eventos pendentes
   - Eventos são publicados no Kafka
   - Eventos são marcados como processados

3. **Tópicos Kafka**:
   - `order.created` - Pedido criado
   - `order.confirmed` - Pedido confirmado
   - `order.shipped` - Pedido enviado
   - `order.delivered` - Pedido entregue
   - `order.cancelled` - Pedido cancelado

## 🗂️ Estrutura dos Eventos

```typescript
{
  "eventId": "uuid",
  "eventType": "OrderCreated",
  "aggregateId": "order-id",
  "payload": {
    "orderId": "order-id",
    "customerId": "customer-123",
    "totalAmount": 21.98,
    "items": [...],
    "status": "PENDING"
  },
  "occurredOn": "2024-01-01T00:00:00.000Z"
}
```

## 🏗️ Princípios Aplicados

### Clean Architecture
- **Separation of Concerns**: Cada camada tem responsabilidades específicas
- **Dependency Inversion**: Camadas internas não dependem de camadas externas
- **Testability**: Fácil teste unitário e de integração

### SOLID Principles
- **Single Responsibility**: Cada classe tem uma única responsabilidade
- **Open/Closed**: Aberto para extensão, fechado para modificação
- **Liskov Substitution**: Implementações podem ser substituídas
- **Interface Segregation**: Interfaces específicas e focadas
- **Dependency Inversion**: Dependa de abstrações, não de implementações

## 🐳 Scripts Docker

```bash
# Iniciar serviços
npm run docker:up

# Parar serviços
npm run docker:down

# Ver logs
npm run docker:logs
```

## 🔍 Monitoramento

### Health Checks

```bash
# Status geral da aplicação
GET /api/v1/health

# Status do processador de outbox
GET /api/v1/health/outbox
```

### Métricas disponíveis

- Status da conexão com MongoDB
- Status do processador de outbox
- Status da conexão com Kafka

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📚 Referências

- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Fastify Documentation](https://www.fastify.io/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Kafka Documentation](https://kafka.apache.org/documentation/)