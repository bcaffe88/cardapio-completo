const ESC = '\x1B'; // Escape character
const GS = '\x1D'; // Group Separator

// ESC/POS commands for common printer functions
const PRINTER_COMMANDS = {
    INITIALIZE: ESC + '@',
    PAPER_FEED_AND_CUT: GS + 'V' + '\x00', // Full cut
    ALIGN_LEFT: ESC + 'a' + '\x00',
    ALIGN_CENTER: ESC + 'a' + '\x01',
    ALIGN_RIGHT: ESC + 'a' + '\x02',
    TEXT_NORMAL: ESC + '!' + '\x00',
    TEXT_DOUBLE_HEIGHT: ESC + '!' + '\x10',
    TEXT_DOUBLE_WIDTH: ESC + '!' + '\x20',
    TEXT_DOUBLE_SIZE: ESC + '!' + '\x30', // Double width & height
    TEXT_BOLD_ON: ESC + 'E' + '\x01',
    TEXT_BOLD_OFF: ESC + 'E' + '\x00',
    SET_LINE_SPACING_DEFAULT: ESC + '2',
    SET_LINE_SPACING_30_DOTS: ESC + '3' + '\x1E', // Example line spacing
};

function formatPrice(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

/**
 * Gera comandos ESC/POS simulados para impressão de um pedido.
 * Em um cenário real, esses comandos seriam enviados a uma impressora térmica.
 * @param {object} order - O objeto do pedido normalizado.
 * @returns {string} Uma string contendo os comandos ESC/POS simulados.
 */
function generateEscPosCommands(order) {
    let commands = '';

    // Initialize printer
    commands += PRINTER_COMMANDS.INITIALIZE;
    commands += PRINTER_COMMANDS.SET_LINE_SPACING_DEFAULT;

    // Header
    commands += PRINTER_COMMANDS.ALIGN_CENTER;
    commands += PRINTER_COMMANDS.TEXT_DOUBLE_SIZE;
    commands += PRINTER_COMMANDS.TEXT_BOLD_ON;
    commands += 'PIZZA FLOW\n'; // Restaurant Name
    commands += PRINTER_COMMANDS.TEXT_NORMAL;
    commands += PRINTER_COMMANDS.TEXT_BOLD_OFF;
    commands += '\n';

    commands += PRINTER_COMMANDS.ALIGN_LEFT;
    commands += `Pedido #${order.id_origem} - Origem: ${order.origem}\n`;
    commands += `Data: ${new Date(order.data_hora).toLocaleString('pt-BR')}\n`;
    commands += `Status: ${order.status}\n`;
    commands += '----------------------------------------\n';

    // Customer Info
    commands += PRINTER_COMMANDS.TEXT_BOLD_ON;
    commands += 'DADOS DO CLIENTE:\n';
    commands += PRINTER_COMMANDS.TEXT_BOLD_OFF;
    commands += `Nome: ${order.cliente.nome}\n`;
    commands += `Telefone: ${order.cliente.telefone}\n`;
    commands += `Endereço: ${order.cliente.endereco}\n`;
    if (order.cliente.referencia) {
        commands += `Referência: ${order.cliente.referencia}\n`;
    }
    commands += '----------------------------------------\n';

    // Order Items
    commands += PRINTER_COMMANDS.TEXT_BOLD_ON;
    commands += 'ITENS DO PEDIDO:\n';
    commands += PRINTER_COMMANDS.TEXT_BOLD_OFF;
    order.itens.forEach(item => {
        // Assuming unitPrice is in cents from server.js's current simulation
        commands += `${item.quantidade}x ${item.nome} (${formatPrice(item.unitPrice / 100)}) - ${formatPrice((item.quantity * item.unitPrice) / 100)}\n`;
        if (item.observacoes) {
            commands += `  Obs: ${item.observacoes}\n`;
        }
    });
    commands += '----------------------------------------\n';

    // Totals
    commands += PRINTER_COMMANDS.ALIGN_RIGHT;
    // Assuming total is in cents from server.js's current simulation
    commands += `TOTAL: ${PRINTER_COMMANDS.TEXT_DOUBLE_HEIGHT}${PRINTER_COMMANDS.TEXT_DOUBLE_WIDTH}${PRINTER_COMMANDS.TEXT_BOLD_ON}${formatPrice(order.total / 100)}${PRINTER_COMMANDS.TEXT_NORMAL}${PRINTER_COMMANDS.TEXT_BOLD_OFF}\n`;
    commands += PRINTER_COMMANDS.ALIGN_LEFT;
    commands += `Pagamento: ${order.forma_pagamento}\n`;
    if (order.observacoes) {
        commands += `Obs. Gerais: ${order.observacoes}\n`;
    }
    commands += '\n';

    // Footer
    commands += PRINTER_COMMANDS.ALIGN_CENTER;
    commands += 'Agradecemos a preferencia!\n';
    commands += '\n';

    // Paper cut
    commands += PRINTER_COMMANDS.PAPER_FEED_AND_CUT;

    return commands;
}

/**
 * Função principal para impressão automática de pedidos.
 * Esta versão simula a impressão logando os comandos ESC/POS no console.
 * Em um sistema real, seria feita a conexão com uma impressora.
 * @param {object} order - O objeto do pedido a ser impresso.
 */
function automaticPrint(order) {
    const escPosOutput = generateEscPosCommands(order);

    console.log('\n--- INÍCIO DA IMPRESSÃO SIMULADA (ESC/POS) ---\n');
    console.log(escPosOutput);
    console.log('\n--- FIM DA IMPRESSÃO SIMULADA ---\n');

    // --- COMO CONECTAR A UMA IMPRESSORA REAL (Exemplos) ---

    // 1. Impressora de Rede (TCP/IP):
    //    Para usar 'net', adicione 'const net = require("net");' no início.
    // const net = require('net');
    // const client = new net.Socket();
    // client.connect(9100, 'IP_DA_IMPRESSORA', () => {
    //     console.log('Conectado à impressora de rede.');
    //     client.write(escPosOutput, () => {
    //         console.log('Comandos enviados à impressora.');
    //         client.end(); // Fecha a conexão
    //     });
    // });
    // client.on('error', (err) => {
    //     console.error('Erro na conexão com a impressora de rede:', err.message);
    // });

    // 2. Impressora Serial (Porta COM - Requer módulo 'serialport'):
    //    Instale: npm install serialport
    //    Para usar 'SerialPort', adicione 'const { SerialPort } = require("serialport");' no início.
    // const { SerialPort } = require("serialport");
    // const port = new SerialPort({ path: 'COM1', baudRate: 9600 }); // Ajuste a porta e baudRate
    // port.on('open', () => {
    //     console.log('Conectado à impressora serial.');
    //     port.write(escPosOutput, (err) => {
    //         if (err) console.error('Erro ao escrever na impressora serial:', err.message);
    //         else console.log('Comandos enviados à impressora serial.');
    //         port.close();
    //     });
    // });
    // port.on('error', (err) => {
    //     console.error('Erro na conexão com a impressora serial:', err.message);
    // });

    // 3. Bridge Local / Servidor de Impressão:
    //    Em muitos casos, um pequeno serviço (em Node.js, Python, etc.) roda na máquina com a impressora.
    //    Este serviço expõe uma API HTTP/WebSocket local que recebe os comandos ESC/POS do backend
    //    e os envia à impressora conectada localmente.
    // fetch('http://localhost:8000/print', { // Exemplo de API de bridge
    //     method: 'POST',
    //     headers: { 'Content-Type': 'text/plain' },
    //     body: escPosOutput
    // }).then(response => {
    //     if (!response.ok) throw new Error('Erro na bridge de impressão');
    //     console.log('Comandos enviados à bridge local.');
    // }).catch(error => {
    //     console.error('Erro ao enviar para bridge de impressão:', error.message);
    // });
}

module.exports = {
    automaticPrint
};