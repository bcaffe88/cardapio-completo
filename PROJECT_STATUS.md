## ATUALIZAÇÃO DO PROJECT_STATUS.md
### 1. Objetivo Atual
Preparar o projeto para deploy no Railway com PostgreSQL, incluindo:
- Adaptação do código para PostgreSQL.
- Configuração de ferramentas de migração de banco de dados.
- Configuração de `Dockerfile` e `Procfile` para Railway.
- Criação de workflow de CI/CD no GitHub Actions para deploy.
- Verificação e adaptação de `server.js` e `index.ts` para operação com PostgreSQL.
- Configuração de script `dev` para execução local de ambos os servidores.
- Criação de uma cópia dos arquivos essenciais para upload no GitHub em um diretório `github`.

### 4. Lista de Pendências
- O usuário precisa configurar `RAILWAY_TOKEN` e `RAILWAY_PROJECT_ID` como GitHub Secrets no repositório.
- O usuário precisa fazer o push das mudanças para o repositório GitHub a partir da pasta `github` para disparar o deploy.
- O usuário precisa garantir que a variável de ambiente `DATABASE_URL` esteja configurada corretamente no Railway para o banco de dados PostgreSQL.
- O usuário deve considerar a execução manual das migrações no Railway (`npm run db:migrate`) após o deploy inicial, ou integrar um passo para isso no processo de deploy do Railway.