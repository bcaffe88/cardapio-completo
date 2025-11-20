# Sistema de Cardápio Online com Integração ao WhatsApp

Este projeto é um backend de integração para um sistema de cardápio online, focado em receber webhooks de plataformas como iFood e Anota Aí, e notificar um dashboard em tempo real via Socket.IO.

## Tecnologias

*   **Backend:** Node.js com Express
*   **Comunicação em Tempo Real:** Socket.IO
*   **Estrutura de Dados:** Simulação de banco de dados em memória (para protótipo)

## Estrutura de Arquivos

*   `server.js`: Servidor principal com Express, Socket.IO e rotas de webhook.
*   `package.json`: Dependências do projeto (express, socket.io, uuid).
*   `Procfile`: Configuração para deploy em plataformas como Railway ou Heroku.
*   Arquivos `.tsx`: Componentes React/TypeScript (provavelmente o frontend do cardápio/dashboard, que não está incluído neste backend).

## Como Executar Localmente

1.  **Instalar dependências:**
    \`\`\`bash
    npm install
    \`\`\`
2.  **Iniciar o servidor:**
    \`\`\`bash
    npm start
    \`\`\`
    O servidor será iniciado na porta `3001`.

## Deploy

O projeto está configurado para deploy em plataformas que suportam Node.js, como **Railway** ou **Vercel** (como um servidor Node.js tradicional, não como uma função serverless).

**Recomendação:** O **Railway** é mais adequado para este tipo de aplicação Node.js com Socket.IO e Express.

### Configuração no Railway

1.  Crie um novo projeto no Railway e conecte-o a este repositório.
2.  O Railway detectará automaticamente que é um projeto Node.js e usará o comando `npm start` (definido no `package.json`) para iniciar o servidor.
3.  Certifique-se de que a variável de ambiente `PORT` no Railway esteja configurada para a porta que o Railway irá expor (o `server.js` usa a porta `3001` por padrão, mas em ambientes de deploy, o Express deve usar `process.env.PORT` se disponível).

**Nota:** O `server.js` atual usa a porta `3001` fixamente. Para um deploy robusto, o código deve ser alterado para:

\`\`\`javascript
const PORT = process.env.PORT || 3001;
// ...
server.listen(PORT, () => {
    console.log(\`Servidor de integração rodando na porta \${PORT}\`);
});
\`\`\`

Esta alteração é **altamente recomendada** para o deploy.
