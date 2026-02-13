# Resumo do Sistema – Gestão de Ativos / Almoxarifado

Documento para contextualizar a IA (ex.: Gemini) sobre a estrutura e o funcionamento do sistema.

---

## 1. Visão geral

- **Nome:** Sistema de Gestão – Controle de Ativos de TI  
- **Objetivo:** Controle interno de almoxarifado (produtos, entradas/saídas, expedição), solicitações de produtos, cadastro de patrimônio (ativos imobilizados/etiquetas) e gestão de usuários, departamentos e categorias.  
- **Stack:** Backend em **Laravel (PHP)** com API REST; frontend em **React** (Create React App + CRACO). Autenticação via **Laravel Sanctum**. Permissões com **Spatie Laravel Permission**.

---

## 2. Estruturas de pastas

### 2.1 Raiz do projeto

```
sistema-de-ativos/
├── backend/                 # API Laravel
├── frontend/                 # SPA React
├── docker/
│   └── nginx/
│       └── laravel.conf
├── docker-compose.yml
├── README.md
└── RESUMO-SISTEMA.md
```

### 2.2 Backend (Laravel)

```
backend/
├── app/
│   ├── Console/
│   │   └── Kernel.php
│   ├── Exceptions/
│   │   └── Handler.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   ├── ActivityLogController.php
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── CatalogController.php
│   │   │   │   ├── CategoryController.php
│   │   │   │   ├── DashboardController.php
│   │   │   │   ├── DepartmentController.php
│   │   │   │   ├── FixedAssetController.php
│   │   │   │   ├── NotificationController.php
│   │   │   │   ├── ProductController.php
│   │   │   │   ├── RoleController.php
│   │   │   │   ├── StockMovementController.php
│   │   │   │   ├── StockRequestController.php
│   │   │   │   └── UserController.php
│   │   │   └── Controller.php
│   │   ├── Kernel.php
│   │   └── Middleware/
│   │       ├── Authenticate.php
│   │       ├── EncryptCookies.php
│   │       ├── PreventRequestsDuringMaintenance.php
│   │       ├── RedirectIfAuthenticated.php
│   │       ├── TrimStrings.php
│   │       ├── TrustHosts.php
│   │       ├── TrustProxies.php
│   │       ├── ValidateSignature.php
│   │       └── VerifyCsrfToken.php
│   ├── Models/
│   │   ├── Category.php
│   │   ├── Department.php
│   │   ├── FixedAsset.php
│   │   ├── Product.php
│   │   ├── StockMovement.php
│   │   ├── StockRequest.php
│   │   ├── StockRequestItem.php
│   │   └── User.php
│   ├── Notifications/
│   │   └── StockRequestCreatedNotification.php
│   └── Providers/
│       ├── AppServiceProvider.php
│       ├── AuthServiceProvider.php
│       ├── BroadcastServiceProvider.php
│       ├── EventServiceProvider.php
│       └── RouteServiceProvider.php
├── bootstrap/
│   ├── app.php
│   └── cache/
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── broadcasting.php
│   ├── cache.php
│   ├── cors.php
│   ├── database.php
│   ├── filesystems.php
│   ├── hashing.php
│   ├── logging.php
│   ├── mail.php
│   ├── permission.php
│   ├── queue.php
│   ├── sanctum.php
│   ├── services.php
│   ├── session.php
│   └── view.php
├── database/
│   ├── factories/
│   │   └── UserFactory.php
│   ├── migrations/
│   │   ├── 2014_10_12_000000_create_users_table.php
│   │   ├── 2014_10_12_100000_create_password_reset_tokens_table.php
│   │   ├── 2019_08_19_000000_create_failed_jobs_table.php
│   │   ├── 2019_12_14_000001_create_personal_access_tokens_table.php
│   │   ├── 2024_01_01_000001_create_departments_table.php
│   │   ├── 2024_01_01_000002_create_categories_table.php
│   │   ├── 2024_01_01_000003_add_extra_columns_to_users_table.php
│   │   ├── 2024_01_01_000004_create_assets_table.php
│   │   ├── 2024_01_01_000005_create_asset_movements_table.php
│   │   ├── 2026_01_31_224957_create_permission_tables.php
│   │   ├── 2026_01_31_224958_create_activity_log_table.php
│   │   ├── 2026_01_31_224959_add_event_column_to_activity_log_table.php
│   │   ├── 2026_01_31_225000_add_batch_uuid_column_to_activity_log_table.php
│   │   ├── 2026_02_02_000001_add_code_to_departments_table.php
│   │   ├── 2026_02_02_000002_change_department_code_to_four_digits.php
│   │   ├── 2026_02_02_000003_department_code_start_at_0001.php
│   │   ├── 2026_02_02_000004_add_code_to_users_table.php
│   │   ├── 2026_02_02_000005_add_code_and_brand_to_assets_table.php
│   │   ├── 2026_02_02_000006_make_department_id_nullable_on_asset_movements.php
│   │   ├── 2026_02_02_000007_add_estoque_minimo_to_assets_table.php
│   │   ├── 2026_02_02_000010_create_stock_requests_table.php
│   │   ├── 2026_02_02_000011_create_stock_request_items_table.php
│   │   ├── 2026_02_02_193053_create_notifications_table.php
│   │   ├── 2026_02_02_200000_rename_assets_to_products_and_related_tables.php
│   │   ├── 2026_02_02_210000_create_fixed_assets_table.php
│   │   └── 2026_02_02_220000_add_brand_to_fixed_assets_table.php
│   └── seeders/
│       ├── CategorySeeder.php
│       ├── DatabaseSeeder.php
│       ├── DepartmentSeeder.php
│       ├── RolePermissionSeeder.php
│       └── UserSeeder.php
├── public/
│   ├── .htaccess
│   ├── favicon.ico
│   ├── index.php
│   └── robots.txt
├── resources/
│   ├── css/
│   │   └── app.css
│   ├── js/
│   │   ├── app.js
│   │   └── bootstrap.js
│   └── views/
├── routes/
│   ├── api.php
│   ├── channels.php
│   ├── console.php
│   └── web.php
├── storage/
│   ├── app/
│   ├── framework/
│   └── logs/
├── tests/
│   ├── Feature/
│   ├── Unit/
│   ├── CreatesApplication.php
│   └── TestCase.php
├── artisan
├── composer.json
├── composer.lock
├── Dockerfile
├── phpunit.xml
├── vite.config.js
└── README.md
```

### 2.3 Frontend (React)

```
frontend/
├── public/
│   ├── index.html
│   ├── logo.png
│   └── LOGO.txt
├── src/
│   ├── components/
│   │   ├── Layout.js
│   │   ├── RolesManager.js
│   │   └── ui/
│   │       ├── accordion.jsx
│   │       ├── alert-dialog.jsx
│   │       ├── alert.jsx
│   │       ├── aspect-ratio.jsx
│   │       ├── avatar.jsx
│   │       ├── badge.jsx
│   │       ├── breadcrumb.jsx
│   │       ├── button.jsx
│   │       ├── calendar.jsx
│   │       ├── card.jsx
│   │       ├── carousel.jsx
│   │       ├── checkbox.jsx
│   │       ├── collapsible.jsx
│   │       ├── command.jsx
│   │       ├── context-menu.jsx
│   │       ├── dialog.jsx
│   │       ├── drawer.jsx
│   │       ├── dropdown-menu.jsx
│   │       ├── form.jsx
│   │       ├── hover-card.jsx
│   │       ├── input-otp.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── menubar.jsx
│   │       ├── navigation-menu.jsx
│   │       ├── pagination.jsx
│   │       ├── popover.jsx
│   │       ├── progress.jsx
│   │       ├── radio-group.jsx
│   │       ├── resizable.jsx
│   │       ├── scroll-area.jsx
│   │       ├── select.jsx
│   │       ├── separator.jsx
│   │       ├── sheet.jsx
│   │       ├── skeleton.jsx
│   │       ├── slider.jsx
│   │       ├── sonner.jsx
│   │       ├── sortable-table-head.jsx
│   │       ├── switch.jsx
│   │       ├── table.jsx
│   │       ├── tabs.jsx
│   │       ├── textarea.jsx
│   │       ├── toast.jsx
│   │       ├── toaster.jsx
│   │       ├── toggle-group.jsx
│   │       ├── toggle.jsx
│   │       └── tooltip.jsx
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── hooks/
│   │   └── use-toast.js
│   ├── lib/
│   │   ├── api.js
│   │   ├── permissions.js
│   │   └── utils.js
│   ├── pages/
│   │   ├── Categories.js
│   │   ├── Dashboard.js
│   │   ├── Departments.js
│   │   ├── FixedAssets/
│   │   │   ├── FixedAssetForm.js
│   │   │   └── Index.js
│   │   ├── Login.js
│   │   ├── Logs.js
│   │   ├── Products.js
│   │   ├── Profile.js
│   │   ├── Register.js
│   │   ├── Roles.js
│   │   ├── Settings.js
│   │   ├── Solicitacoes.js
│   │   ├── SolicitarProdutos.js
│   │   └── Users.js
│   ├── App.css
│   ├── App.js
│   ├── index.css
│   └── index.js
├── plugins/
│   ├── health-check/
│   │   ├── health-endpoints.js
│   │   └── webpack-health-plugin.js
│   └── visual-edits/
│       ├── babel-metadata-plugin.js
│       └── dev-server-setup.js
├── components.json
├── craco.config.js
├── Dockerfile
├── jsconfig.json
├── nginx.conf
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── README.md
└── (outros arquivos de config)
```

---

## 3. Backend (Laravel)

### 3.1 Principais models

| Model | Descrição |
|-------|-----------|
| **User** | Usuário do sistema; tem `department_id`, `code`; usa HasRoles (Spatie). |
| **Product** | Produto do almoxarifado: nome, código (4 dígitos), marca, categoria, departamento (localização), valor unitário, quantidade, estoque_minimo, status (disponivel, em_uso, manutencao, descartado), description. |
| **StockMovement** | Movimentação de estoque: tipo `entrada` ou `retirada`, quantidade, data, departamento (destino em retirada), usuário, product_id. |
| **Category** | Categoria de produtos. |
| **Department** | Setor/departamento da empresa. O departamento **Almoxarifado** é criado pelo **DepartmentSeeder** (firstOrCreate); não há valor fixo no frontend. |
| **FixedAsset** | Patrimônio (ativo imobilizado): patrimony_code (etiqueta, normalizado em 5 dígitos, ex.: 00001), serial_number, name, brand, description, category_id, department_id, status, acquisition_date, acquisition_value; SoftDeletes. |
| **StockRequest** | Solicitação de produtos: user_id, status (pendente, atendida, cancelada), notes. |
| **StockRequestItem** | Item da solicitação: stock_request_id, product_id, quantity. |
| **Activity** (Spatie) | Log de atividades (produtos, usuários, movimentações, etc.). |

### 3.2 Seeders

- **DatabaseSeeder:** chama, em ordem: `DepartmentSeeder`, `CategorySeeder`, `RolePermissionSeeder`, `UserSeeder`.
- **DepartmentSeeder:** cria os departamentos **Almoxarifado**, **Financeiro**, **Informática**, **RH**, **Marketing** e **Vendas** (firstOrCreate por nome) e garante que cada um tenha um **code** de 4 dígitos (0001, 0002, …), usando o próximo número disponível quando o registro não tem code.
- **CategorySeeder:** categorias iniciais.
- **RolePermissionSeeder:** roles e permissões (Admin, Gerente, Operador, Visualizador, etc.).
- **UserSeeder:** usuário(s) inicial(is).

### 3.3 API – Rotas principais (prefixo `/api`)

- **Auth:** `POST /login`, `POST /register`, `POST /logout`, `GET /me`, `PUT /me`  
- **Notificações:** `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications`  
- **Dashboard:** `GET /dashboard/stats`, `GET /dashboard/sector-consumption?department_id=`, `GET /dashboard/low-stock-report`  
- **Produtos:** CRUD em `/products` (resource); `POST /products/{product}/entry`, `POST /products/{product}/withdraw`  
- **Movimentações:** `GET /movements`  
- **Categorias / Departamentos:** `apiResource` em `/categories` e `/departments`  
- **Patrimônio (ativos imobilizados):** `apiResource` em `/fixed-assets` (CRUD completo).  
- **Catálogo (solicitação):** `GET /catalog` (produtos disponíveis para solicitar)  
- **Solicitações:** `GET|POST /stock-requests`, `GET|PUT /stock-requests/{id}`, `POST /stock-requests/{stockRequest}/fulfill`  
- **Usuários:** `apiResource` em `/users`  
- **Funções/Permissões:** `GET /roles`, `GET /roles/permissions`, `POST|GET|PUT|DELETE /roles/...`  
- **Logs:** `GET /logs`  

Todas as rotas da API (exceto login/register) usam `auth:sanctum`. Controllers checam permissões (ex.: `can('read')`, `can('manage_roles')`).

### 3.4 Permissões (Spatie – nomes no banco)

- **view_dashboard** – Acessar Dashboard  
- **read** – Visualizar (produtos)  
- **create**, **update**, **delete** – Ações em produtos  
- **export_data** – Exportar dados  
- **manage_users** – Gerenciar usuários (acesso a Usuários, Departamentos, Categorias e Patrimônio)  
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
| `/products` | Products | Lista de produtos, CRUD, entrada/saída. Select de localização (departamento) usa apenas lista da API (inclui Almoxarifado vindo do seeder). Exige `read`. |
| `/solicitar-produtos` | SolicitarProdutos | Catálogo + carrinho para enviar solicitação. Exige `request_products`. |
| `/solicitacoes` | Solicitacoes | Lista de solicitações; modal com detalhes e botão “Imprimir e Atender”. Exige `view_stock_requests`. |
| `/departments` | Departments | CRUD departamentos (lista vinda da API; Almoxarifado aparece se criado pelo seeder). Exige `manage_users`. |
| `/categories` | Categories | CRUD categorias. Exige `manage_users`. |
| `/patrimonio` | FixedAssets/Index | Patrimônio (ativos imobilizados/etiquetas): tabela (Etiqueta, Nome, N/S, Localização, Status, Ações), etiqueta em 5 dígitos (ex.: 00001), filtro, modal de cadastro/edição (FixedAssetForm). Exige `manage_users`. |
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
- UI: componentes estilo shadcn (Card, Button, Table, Dialog, Select, Tabs, Textarea, etc.) em `components/ui/`.  
- **FixedAssets:** `pages/FixedAssets/Index.js` (listagem + filtro + modais), `pages/FixedAssets/FixedAssetForm.js` (formulário reutilizado para criar/editar).

### 4.4 Atualização de dados

- Notificações: polling a cada 25s e refetch ao voltar à aba.  
- Evento global `app:refocus` ao focar na aba: Dashboard, Produtos e Solicitações escutam e recarregam dados (stats, lista de produtos, lista de solicitações).

---

## 5. Fluxos de negócio resumidos

1. **Produto:** cadastro com código gerado (0001, 0002…), categoria, departamento (localização vinda da API, incluindo Almoxarifado), valor, quantidade, estoque mínimo. Entrada aumenta quantidade; retirada (withdraw) diminui e associa ao departamento de destino.  
2. **Solicitação:** usuário com `request_products` acessa “Solicitar Produtos”, escolhe itens e envia. Quem tem `view_stock_requests` vê a lista; quem tem `update` pode clicar em “Imprimir e Atender”, o que gera retiradas (movements) por item, envia ao departamento do solicitante e marca a solicitação como atendida.  
3. **Notificações:** ao criar solicitação, usuários com `view_stock_requests` (exceto o solicitante) recebem notificação (canal database).  
4. **Dashboard:** usuário com role **Expedição** vê card “Solicitações pendentes” e pode atender no modal; demais veem “Gastos por departamento” (pizza); clique na fatia abre modal com consumos do setor no mês.  
5. **Patrimônio:** cadastro de ativos imobilizados (etiqueta em 5 dígitos, nome, N/S, marca, descrição, categoria, departamento, status, data e valor de aquisição). A etiqueta é normalizada pelo backend (ex.: "1" → "00001"). Listagem e edição na página Patrimônio; dados vêm da API `/fixed-assets`.  
6. **Departamentos:** Almoxarifado é um registro no banco criado pelo DepartmentSeeder (firstOrCreate); aparece no select de produtos e na listagem de Departamentos como qualquer outro.  
7. **Configurações / Permissões:** em Settings, aba Permissões (quem tem `manage_roles`) configura funções e “Páginas liberadas” por função; aba Gerais só para Admin.

---

## 6. Convenções técnicas

- Backend: respostas JSON; validação com `$request->validate()`; uso de Spatie Permission (roles/permissions em tabelas `roles`, `permissions`, `role_has_permissions`, `model_has_roles`).  
- Frontend: React com hooks; rotas com React Router; tema (next-themes) e estilos globais (Tailwind).  
- Código de produto e usuário: 4 dígitos (ex.: 0001).  
- Nomenclatura: “Departamentos” na UI; “Produtos” para itens do almoxarifado; “Patrimônio” para ativos imobilizados (etiquetas em 5 dígitos).  
- Nenhum departamento é hardcoded no frontend; Almoxarifado existe no banco via seeder.

---

Este resumo cobre as estruturas de pastas, os models, as permissões, as principais rotas e fluxos para que uma IA possa entender e sugerir alterações coerentes com o sistema.
