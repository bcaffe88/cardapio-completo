const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { getDb, createOrder, getOrdersByRestaurant, updateOrderStatus, getOrderById } = require('./db.js'); // Importar funções do banco de dados
const { automaticPrint } = require('./printer_module.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permitir acesso do frontend do cardápio online
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001; // Porta para o backend de integração

// Middleware para servir arquivos estáticos (Frontend)
app.use(express.static('public'));

// Middleware para parsing de JSON
app.use(express.json());

/**
 * Modelo de Pedido Unificado
 * @param {object} rawOrder - O objeto de pedido recebido do webhook.
 * @param {string} source - A origem do pedido (ex: "iFood", "Anota Aí").
 * @returns {object} O pedido normalizado.
 */
async function normalizeOrder(rawOrder, source) {
    // Lógica de normalização: Mapear campos específicos de cada plataforma para o modelo unificado.
    // Para este protótipo, vamos criar um pedido genérico.

    console.log(`Normalizando pedido da origem: ${source}`);

    // Exemplo de estrutura de dados unificada, mapeando para o schema do PostgreSQL
    return {
        restaurantId: 1, // FIX ME: Isso deve vir de algum lugar (e.g., webhook payload, auth)
        orderNumber: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Gerar um número de pedido único
        customerName: rawOrder.customer?.name || "Cliente Teste",
        customerPhone: rawOrder.customer?.phone || "(99) 99999-9999",
        customerEmail: rawOrder.customer?.email || null,
        deliveryType: rawOrder.delivery?.type || "delivery", // 'delivery' ou 'pickup'
        deliveryAddress: rawOrder.delivery?.address || "Rua Exemplo, 123",
        deliveryLatitude: rawOrder.delivery?.latitude || null,
        deliveryLongitude: rawOrder.delivery?.longitude || null,
        addressReference: rawOrder.delivery?.reference || null,
        orderNotes: rawOrder.notes || null,
        subtotal: parseFloat(rawOrder.subtotal || '0'),
        deliveryFee: parseFloat(rawOrder.deliveryFee || '0'),
        total: parseFloat(rawOrder.total || '0'),
        paymentMethod: rawOrder.payment?.method || "online", // 'cash', 'card', 'pix', 'online'
        paymentStatus: "pending",
        status: "pending",
        source: source,
        externalOrderId: rawOrder.id_origem || null,
        stripePaymentIntentId: rawOrder.stripe?.paymentIntentId || null,
        stripePixQrCode: rawOrder.stripe?.pixQrCode || null,
        stripePixCopyPaste: rawOrder.stripe?.pixCopyPaste || null,
        driverId: null,
        assignedAt: null,
    };
}


/**
 * Processa um novo pedido: normaliza, armazena e notifica.
 * @param {object} rawOrder - O objeto de pedido recebido.
 * @param {string} source - A origem do pedido.
 */
async function processNewOrder(rawOrder, source) {
    try {
        const normalizedOrder = await normalizeOrder(rawOrder, source);
        const newOrder = await createOrder(normalizedOrder); // Salva o pedido no banco de dados

        if (!newOrder || !newOrder.id) {
            console.error("Failed to create order in database:", newOrder);
            throw new Error("Failed to create order");
        }

        // 1. Notificação em Tempo Real para o Dashboard
        io.emit('new_order', newOrder);
        console.log(`Novo pedido ${newOrder.id} recebido e notificado.`);

        // 2. Impressão Automática
        // Em um sistema real, esta seria uma tarefa assíncrona (fila de mensagens)
        automaticPrint(newOrder);

        return newOrder;
    } catch (error) {
        console.error("Error processing new order:", error);
        throw error;
    }
}

// --- Rotas de Webhook (Simulação) ---

// Webhook iFood
app.post('/api/v1/webhooks/ifood', async (req, res) => {
    // Em um sistema real, haveria validação de assinatura/token do iFood
    try {
        const rawOrder = req.body;
        const newOrder = await processNewOrder(rawOrder, "iFood");
        res.status(200).json({ message: "Pedido iFood recebido com sucesso", order_id: newOrder.id });
    } catch (error) {
        console.error("Error processing iFood webhook:", error);
        res.status(500).json({ message: "Erro ao processar pedido iFood", error: error.message });
    }
});

// Webhook Anota Aí
app.post('/api/v1/webhooks/anotaai', async (req, res) => {
    try {
        const rawOrder = req.body;
        const newOrder = await processNewOrder(rawOrder, "Anota Aí");
        res.status(200).json({ message: "Pedido Anota Aí recebido com sucesso", order_id: newOrder.id });
    } catch (error) {
        console.error("Error processing Anota Aí webhook:", error);
        res.status(500).json({ message: "Erro ao processar pedido Anota Aí", error: error.message });
    }
});

// --- Rotas de API para o Dashboard ---

// Rota para listar todos os pedidos
app.get('/api/v1/pedidos', async (req, res) => {
    try {
        const restaurantId = 1; // FIX ME: Obter o ID do restaurante do usuário autenticado
        const orders = await getOrdersByRestaurant(restaurantId);
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Erro ao buscar pedidos", error: error.message });
    }
});

// Rota para atualizar o status do pedido (usado pela Cozinha)
app.post('/api/v1/pedidos/:id/status', async (req, res) => {
    const { id } = req.params;
    const { new_status } = req.body; // Espera-se 'Preparando', 'Pronto', 'Saiu para Entrega', 'Entregue', 'Cancelado'

    try {
        const order = await getOrderById(Number(id));

        if (!order) {
            return res.status(404).json({ message: "Pedido não encontrado" });
        }

        const oldStatus = order.status;
        await updateOrderStatus(Number(id), new_status);

        // Notificação em Tempo Real para o Dashboard (para atualizar a lista)
        io.emit('order_status_update', { id, old_status: oldStatus, new_status });
        console.log(`Status do pedido ${id} atualizado para: ${new_status}`);

        res.json({ message: "Status atualizado com sucesso", order: { ...order, status: new_status } });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Erro ao atualizar status do pedido", error: error.message });
    }
});

// --- Configuração do Socket.IO ---

io.on('connection', async (socket) => {
    console.log('Um cliente se conectou via WebSocket');

    socket.on('disconnect', () => {
        console.log('Um cliente se desconectou');
    });

    // Opcional: Enviar a lista atual de pedidos ao novo cliente conectado
    try {
        const restaurantId = 1; // FIX ME: Obter o ID do restaurante do usuário autenticado
        const initialOrders = await getOrdersByRestaurant(restaurantId);
        socket.emit('initial_orders', initialOrders);
    } catch (error) {
        console.error("Error fetching initial orders for new client:", error);
    }
});

// --- Inicialização do Servidor ---

// Rota catch-all para servir o index.html para o roteamento do frontend (SPA)
// Deve ser a última rota a ser definida
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Servidor de integração rodando na porta ${PORT}`);
});
