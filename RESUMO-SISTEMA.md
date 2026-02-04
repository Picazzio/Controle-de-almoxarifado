# Resumo do Sistema – Gestão de Ativos / Almoxarifado

Documento para contextualizar a IA (ex.: Gemini) sobre a estrutura e o funcionamento do sistema.

---

## 1. Visão geral

- **Nome:** Sistema de Gestão – Controle de Ativos de TI  
- **Objetivo:** Controle interno de almoxarifado: cadastro de produtos, entradas/saídas de estoque, expedição para setores e solicitações de produtos por usuários.  
- **Stack:** Backend em **Laravel (PHP)** com API REST; frontend em **React** (SPA). Autenticação via **Laravel Sanctum**. Permissões com **Spatie Laravel Permission**.

---

## 2. Estrutura do projeto

```
sistema-de-ativos/
├── backend/          # Laravel (API)
│   ├── app/
│   │   ├── Http/Controllers/Api/   # Controllers da API
│   │   ├── Models/                 # Eloquent models
│   │   ├── Notifications/          # Notificações (ex.: StockRequestCreatedNotification)
│   │   └── ...
│   ├── database/migrations/
│   ├── database/seeders/
│   └── routes/api.php
└── frontend/         # React (Create React App + CRACO)
    └── src/
        ├── components/     # Layout, RolesManager, ui/ (shadcn)
        ├── contexts/      # AuthContext
        ├── lib/           # api.js, permissions.js
        └── pages/         # Páginas da aplicação
```

---

## 3. Backend (Laravel)

### 3.1 Principais models

| Model | Descrição |
|-------|-----------|
| **User** | Usuário do sistema; tem `department_id`, `code`; usa HasRoles (Spatie). |
| **Asset** | Produto do almoxarifado: nome, código (4 dígitos), marca, categoria, departamento (localização), valor unitário, quantidade, estoque_minimo, status (disponivel, em_uso, manutencao, descartado). |
| **AssetMovement** | Movimentação: tipo `entrada` ou `retirada`, quantidade, data, departamento (destino em retirada), usuário, asset_id. |
| **Category** | Categoria de produtos. |
| **Department** | Setor/departamento da empresa (ex.: TI, RH, Almoxarifado). |
| **StockRequest** | Solicitação de produtos: user_id, status (pendente, atendida, cancelada), notes. |
| **StockRequestItem** | Item da solicitação: stock_request_id, asset_id, quantity. |
| **Activity** (Spatie) | Log de atividades (produtos, usuários, movimentações, etc.). |

### 3.2 API – Rotas principais (prefixo `/api`)

- **Auth:** `POST /login`, `POST /register`, `POST /logout`, `GET /me`, `PUT /me`  
- **Notificações:** `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications`  
- **Dashboard:** `GET /dashboard/stats`, `GET /dashboard/sector-consumption?department_id=`, `GET /dashboard/low-stock-report`  
- **Produtos (Asset):** CRUD em `/products` (resource); `POST /products/{asset}/entry`, `POST /products/{asset}/withdraw`  
- **Movimentações:** `GET /movements`  
- **Categorias / Departamentos:** `apiResource` em `/categories` e `/departments`  
- **Catálogo (solicitação):** `GET /catalog` (produtos disponíveis para solicitar)  
- **Solicitações:** `GET|POST /stock-requests`, `GET|PUT /stock-requests/{id}`, `POST /stock-requests/{stockRequest}/fulfill`  
- **Usuários:** `apiResource` em `/users`  
- **Funções/Permissões:** `GET /roles`, `GET /roles/permissions`, `POST|GET|PUT|DELETE /roles/...`  
- **Logs:** `GET /logs`  

Todas as rotas da API (exceto login/register) usam `auth:sanctum`. Controllers checam permissões (ex.: `can('read')`, `can('manage_roles')`).

### 3.3 Permissões (Spatie – nomes no banco)

- **view_dashboard** – Acessar Dashboard  
- **read** – Visualizar (produtos)  
- **create**, **update**, **delete** – Ações em produtos  
- **export_data** – Exportar dados  
- **manage_users** – Gerenciar usuários (acesso a Usuários, Departamentos, Categorias)  
- **manage_roles** – Gerenciar permissões/funções (acesso a Funções e aba Permissões em Configurações)  
- **view_logs** – Ver logs de atividade  
- **request_products** – Solicitar produtos (página “Solicitar Produtos”)  
- **view_stock_requests** – Ver solicitações de produtos (página “Solicitações”)  

Funções padrão (seed): Admin (todas), Gerente, Operador, Visualizador. Pode existir **Expedição** (uso no dashboard de solicitações pendentes).

---

## 4. Frontend (React)

### 4.1 Rotas e páginas

| Rota | Página | Observação |
|------|--------|------------|
| `/login`, `/register` | Login, Register | Públicas (redirecionam se logado). |
| `/`, `/dashboard` | Dashboard | KPIs, gráficos, ações rápidas (entrada/saída, relatório mínimo). Para role **Expedição**: card “Solicitações pendentes” + modal para atender. Para outros: card “Gastos por departamento” (pizza); clique na fatia abre modal com consumos do setor. |
| `/products` | Products | Lista de produtos (Asset), CRUD, entrada/saída. Exige `read`. |
| `/solicitar-produtos` | SolicitarProdutos | Catálogo + carrinho para enviar solicitação. Exige `request_products`. |
| `/solicitacoes` | Solicitacoes | Lista de solicitações; modal com detalhes e botão “Imprimir e Atender”. Exige `view_stock_requests`. |
| `/departments` | Departments | CRUD departamentos. Exige `manage_users`. |
| `/categories` | Categories | CRUD categorias. Exige `manage_users`. |
| `/users` | Users | CRUD usuários. Exige `manage_users`. |
| `/roles` | Roles | Funções (usa RolesManager). Exige `manage_roles`. |
| `/logs` | Logs | Logs de atividade. Exige `view_logs`. |
| `/profile` | Profile | Perfil do usuário. |
| `/settings` | Settings | Abas: Aparência, Permissões (RolesManager embutido), Alertas, Gerais (só Admin). Configurações acessível a todos; aba Gerais só Admin. |

Acesso às rotas é controlado por `canAccessPath(pathname, user)` em `PrivateRoute` (App.js). Menu lateral (Layout) mostra itens conforme permissões (ex.: `canAccessProductsPage`, `canViewStockRequests`).

### 4.2 Autenticação e permissões

- **AuthContext:** guarda `user` (nome, email, role, permissions, etc.) após login; `GET /me` devolve usuário + permissões.  
- **lib/permissions.js:** `hasPermission(user, permissionName)`, `canAccessPath`, `canAccessProductsPage`, `canCreateProducts`, `canViewStockRequests`, `canRequestProducts`, `canAccessDashboard`, etc. Mapeamento de rotas para permissões em `RESTRICTED_PATHS_BY_PERMISSION`.  
- Admin tem todas as permissões; outros roles usam array `user.permissions` vindo da API.

### 4.3 Componentes importantes

- **Layout:** sidebar (links por permissão), header com usuário, sino de notificações, dropdown do usuário.  
- **RolesManager:** usado em Settings (aba Permissões) e na página Roles; lista funções, “Páginas liberadas” (checkboxes por página) e “Ações em Produtos” (criar, editar, excluir, exportar).  
- **lib/api.js:** cliente HTTP (axios) com baseURL da API e token Sanctum no header.  
- UI: componentes estilo shadcn (Card, Button, Table, Dialog, Select, Tabs, etc.) em `components/ui/`.

### 4.4 Atualização de dados

- Notificações: polling a cada 25s e refetch ao voltar à aba.  
- Evento global `app:refocus` ao focar na aba: Dashboard, Produtos e Solicitações escutam e recarregam dados (stats, lista de produtos, lista de solicitações).

---

## 5. Fluxos de negócio resumidos

1. **Produto (Asset):** cadastro com código gerado (0001, 0002…), categoria, departamento (localização), valor, quantidade, estoque mínimo. Entrada aumenta quantidade; retirada (withdraw) diminui e associa ao departamento de destino.  
2. **Solicitação:** usuário com `request_products` acessa “Solicitar Produtos”, escolhe itens e envia. Quem tem `view_stock_requests` vê a lista; quem tem `update` pode clicar em “Imprimir e Atender”, o que gera retiradas (movements) por item, envia ao departamento do solicitante e marca a solicitação como atendida.  
3. **Notificações:** ao criar solicitação, usuários com `view_stock_requests` (exceto o solicitante) recebem notificação (canal database).  
4. **Dashboard:** usuário com role **Expedição** vê card “Solicitações pendentes” e pode atender no modal; demais veem “Gastos por departamento” (pizza); clique na fatia abre modal com consumos do setor no mês.  
5. **Configurações / Permissões:** em Settings, aba Permissões (quem tem `manage_roles`) configura funções e “Páginas liberadas” por função; aba Gerais só para Admin.

---

## 6. Convenções técnicas

- Backend: respostas JSON; validação com `$request->validate()`; uso de Spatie Permission (roles/permissions em tabelas `roles`, `permissions`, `role_has_permissions`, `model_has_roles`).  
- Frontend: React com hooks; rotas com React Router; tema (next-themes) e estilos globais (Tailwind).  
- Código de produto e usuário: 4 dígitos (ex.: 0001).  
- Nomenclatura: “Departamentos” (não “Setores”) na UI; “Produtos” para itens do almoxarifado.

---

Este resumo cobre a estrutura, as permissões, as principais rotas e fluxos para que uma IA possa entender e sugerir alterações coerentes com o sistema.
