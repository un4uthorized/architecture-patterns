# Exemplos de Curl para testar a API

## 1. Health Check

```bash
# Verificar saúde da aplicação
curl -X GET http://localhost:3001/api/v1/health \
  -H "Content-Type: application/json"

# Verificar status do outbox processor
curl -X GET http://localhost:3001/api/v1/health/outbox \
  -H "Content-Type: application/json"
```

## 2. Criar Pedidos

```bash
# Criar pedido simples
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "product-smartphone",
        "productName": "iPhone 15 Pro",
        "quantity": 1,
        "unitPrice": 999.99
      }
    ]
  }'

# Criar pedido com múltiplos itens
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-456",
    "items": [
      {
        "productId": "product-laptop",
        "productName": "MacBook Pro 16\"",
        "quantity": 1,
        "unitPrice": 2499.00
      },
      {
        "productId": "product-mouse",
        "productName": "Magic Mouse",
        "quantity": 1,
        "unitPrice": 79.00
      },
      {
        "productId": "product-case",
        "productName": "Laptop Case",
        "quantity": 1,
        "unitPrice": 49.99
      }
    ]
  }'

# Criar pedido para teste de estoque
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-789",
    "items": [
      {
        "productId": "product-book",
        "productName": "Clean Architecture Book",
        "quantity": 3,
        "unitPrice": 45.00
      },
      {
        "productId": "product-course",
        "productName": "TypeScript Course",
        "quantity": 1,
        "unitPrice": 199.99
      }
    ]
  }'
```

## 3. Consultar Pedidos

```bash
# Buscar pedido por ID (substitua {orderId} pelo ID real)
curl -X GET http://localhost:3001/api/v1/orders/{orderId} \
  -H "Content-Type: application/json"

# Exemplo com ID específico
curl -X GET http://localhost:3001/api/v1/orders/order_1699123456789_abc123def \
  -H "Content-Type: application/json"

# Listar pedidos de um cliente
curl -X GET "http://localhost:3001/api/v1/orders?customerId=customer-123" \
  -H "Content-Type: application/json"

# Listar pedidos de outro cliente
curl -X GET "http://localhost:3001/api/v1/orders?customerId=customer-456" \
  -H "Content-Type: application/json"
```

## 4. Confirmar Pedidos

```bash
# Confirmar um pedido (substitua {orderId} pelo ID real)
curl -X PATCH http://localhost:3001/api/v1/orders/{orderId}/confirm \
  -H "Content-Type: application/json"

# Exemplo com ID específico
curl -X PATCH http://localhost:3001/api/v1/orders/order_1699123456789_abc123def/confirm \
  -H "Content-Type: application/json"
```

## 5. Testes de Validação (Casos de Erro)

```bash
# Tentar criar pedido sem itens
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-error-test",
    "items": []
  }'

# Tentar criar pedido sem customerId
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-test",
        "productName": "Test Product",
        "quantity": 1,
        "unitPrice": 10.00
      }
    ]
  }'

# Tentar criar pedido com quantidade inválida
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-error-test",
    "items": [
      {
        "productId": "product-invalid",
        "productName": "Invalid Product",
        "quantity": 0,
        "unitPrice": 10.00
      }
    ]
  }'

# Tentar criar pedido com preço negativo
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-error-test",
    "items": [
      {
        "productId": "product-negative",
        "productName": "Negative Price Product",
        "quantity": 1,
        "unitPrice": -10.00
      }
    ]
  }'

# Tentar buscar pedido inexistente
curl -X GET http://localhost:3001/api/v1/orders/non-existent-order-id \
  -H "Content-Type: application/json"

# Tentar confirmar pedido inexistente
curl -X PATCH http://localhost:3001/api/v1/orders/non-existent-order-id/confirm \
  -H "Content-Type: application/json"
```

## 6. Teste de Carga (Múltiplos Pedidos)

```bash
# Criar múltiplos pedidos rapidamente para testar o outbox pattern
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/v1/orders \
    -H "Content-Type: application/json" \
    -d "{
      \"customerId\": \"load-test-customer-$i\",
      \"items\": [
        {
          \"productId\": \"product-load-test-$i\",
          \"productName\": \"Load Test Product $i\",
          \"quantity\": $i,
          \"unitPrice\": $(echo "$i * 10.99" | bc)
        }
      ]
    }"
  echo "Pedido $i criado"
done
```

## 7. Verificar Documentação e Status

```bash
# Acessar endpoint raiz
curl -X GET http://localhost:3001/ \
  -H "Content-Type: application/json"

# A documentação Swagger está disponível em:
# http://localhost:3001/docs
```

## 8. Monitoramento dos Serviços

```bash
# Verificar status dos containers Docker
docker ps

# Ver logs da aplicação (se rodando com Docker)
docker logs -f outbox-pattern-app

# Ver logs do Kafka
docker logs -f kafka

# Ver logs do MongoDB
docker logs -f mongodb
```

## URLs Importantes

- **API Base**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/v1/health
- **Swagger Docs**: http://localhost:3001/docs
- **Kafka UI**: http://localhost:8080
- **Mongo Express**: http://localhost:8081

## Fluxo de Teste Completo

1. Verificar se todos os serviços estão rodando
2. Criar alguns pedidos de teste
3. Verificar se foram salvos no MongoDB (via Mongo Express)
4. Confirmar alguns pedidos
5. Verificar eventos no Kafka (via Kafka UI)
6. Monitorar logs para ver o processamento do outbox