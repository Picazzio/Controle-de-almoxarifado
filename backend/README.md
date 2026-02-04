# Backend - Sistema de Gestão de Ativos de TI

API Laravel com autenticação Sanctum, permissões (Spatie Laravel Permission) e logs de atividade (Spatie Activity Log).

## Requisitos

- PHP 8.1+
- Composer
- MySQL ou MariaDB

## Instalação

1. Copie o ambiente:
```bash
cp .env.example .env
```

2. Crie o banco MySQL (ex.: `ativos_ti`) e configure no `.env`: `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

3. Gere a chave e rode as migrations:
```bash
php artisan key:generate
php artisan migrate
php artisan db:seed
```

4. Usuário padrão após o seed:
   - **E-mail:** admin@empresa.com  
   - **Senha:** password  

## Endpoints da API

Base URL: `/api`

### Autenticação (público)
- `POST /login` — body: `email`, `password`
- `POST /register` — body: `name`, `email`, `password`, `password_confirmation`

### Autenticados (header: `Authorization: Bearer {token}`)

- `POST /logout` | `GET /me`
- `GET /departments` | `GET /categories`
- `GET/POST /products` — listar/criar ativos
- `GET/PUT/DELETE /products/{id}` — ver/editar/excluir ativo
- `POST /products/{id}/withdraw` — registrar retirada (body: `user_id`, `department_id`, `quantity?`, `notes?`)
- `GET /movements` — listar movimentações (query: `asset_id`, `user_id`)
- `GET/POST /users` | `GET/PUT/DELETE /users/{id}`
- `GET /roles` | `GET /roles/permissions` | `POST /roles` | `GET/PUT/DELETE /roles/{id}`
- `GET /logs` — logs de atividade (query: `search`, `type`, `resource`)

## Movimentação de ativos (retirada)

Ao registrar uma retirada (`POST /products/{id}/withdraw`):

- É criado um registro em `asset_movements` com: quem retirou (`user_id`), setor de destino (`department_id`), data, quantidade e observações.
- O ativo tem a quantidade reduzida e o setor atual atualizado para o destino.

## Permissões (Spatie)

Roles: Admin, Gerente, Operador, Visualizador.  
Permissões: create, read, update, delete, manage_users, manage_roles, view_logs, export_data.

## Logs de atividade (Spatie Activity Log)

Criação, edição e exclusão de ativos, usuários e movimentações são registrados com usuário, ação, recurso e IP.
