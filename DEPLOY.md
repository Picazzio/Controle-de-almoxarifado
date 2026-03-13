# Guia de deploy após `git pull` no servidor

Depois de dar **pull** no servidor, siga estes passos para que todas as telas e dados funcionem corretamente.

---

## 1. Backend (Laravel)

```bash
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear
php artisan cache:clear
```

- **Migrations**: garantem que as tabelas existem; sem isso, a API pode falhar e o dashboard fica com "0" e "Nenhum dado".
- **Seeders**: o `RolePermissionSeeder` preenche a tabela de permissões e associa ao role Admin. **Se não rodar os seeders no servidor/Docker**, a API pode devolver `permissions: []` e o menu pode ocultar itens como Departamentos, Categorias e Patrimônio. Recomendado: `php artisan db:seed` (ou ao menos `php artisan db:seed --class=RolePermissionSeeder`).

---

## 2. Frontend (React)

A URL da API é definida **no momento do build**. Se no servidor o frontend não souber onde está o backend, as chamadas falham e as telas aparecem vazias.

### 2.1 Criar/ajustar o `.env` do frontend

Na pasta **frontend**, crie ou edite o arquivo `.env` (não versionado):

```env
REACT_APP_API_URL=https://seu-dominio.com/api
```

Ou, se a API estiver no mesmo servidor em outra porta:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

Use a URL que o **navegador** usa para acessar a API (mesmo domínio/porta que você testa no Postman ou no navegador).

### 2.2 Instalar dependências e gerar build

```bash
cd frontend
npm ci
npm run build
```

- **Sempre** rode `npm run build` **depois** de alterar o `.env` ou após um `git pull` com mudanças no frontend.
- O build atual deve ser o que o servidor web (nginx/Apache) entrega na pasta `build` (ou equivalente).

---

## 3. Servidor web – rotas do React (SPA)

Se **algumas telas não aparecem** ao abrir links diretos (ex.: `/products`, `/users`) ou ao dar F5, o servidor provavelmente não está devolvendo o `index.html` para essas rotas.

### Nginx

O `frontend/nginx.conf` já está correto. No servidor, o bloco do site do frontend deve ter:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Assim, qualquer rota (ex.: `/products`) cai no `index.html` e o React Router resolve a página.

### Apache

Se usar Apache, na raiz do frontend (onde está o `index.html` do build) crie ou edite `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Reinicie o Nginx ou Apache após alterar a configuração.

---

## 4. Checklist rápido

| Item | Comando / verificação |
|------|------------------------|
| Backend: dependências | `cd backend && composer install --no-dev` |
| Backend: banco atualizado | `php artisan migrate --force` |
| Backend: config/cache | `php artisan config:clear && php artisan cache:clear` |
| Frontend: `.env` com API correta | `REACT_APP_API_URL=<url-do-backend>/api` |
| Frontend: build novo | `cd frontend && npm ci && npm run build` |
| Servidor web: SPA | `try_files ... /index.html` (Nginx) ou `.htaccess` (Apache) |

---

## 5. Menu não mostra Departamentos, Categorias ou Patrimônio

Se o layout carrega mas os itens **Departamentos**, **Categorias** e **Patrimônio** não aparecem no menu lateral:

1. **Permissões no backend**: a API envia as permissões do usuário (`view_departments`, `view_categories`, `fixed_assets_read`). Se a tabela `permissions` ou `role_has_permissions` estiver vazia (seeders não rodados), a API pode devolver `permissions: []` e o frontend escondia esses itens. Rode no servidor: `php artisan db:seed --class=RolePermissionSeeder`.
2. **Correção no frontend**: o código foi ajustado para que usuários **Admin** tenham acesso total mesmo quando a API devolver lista de permissões vazia (comum após um deploy sem seeders). Faça pull da alteração e um novo build do frontend.

---

## 6. Dashboard com "0" e "Nenhum dado"

Se o **layout** do dashboard aparece mas os **números e gráficos** ficam em zero ou "Nenhum dado":

1. **API inacessível**: confira no navegador (F12 → Aba Network) se as requisições para `/api/dashboard/stats` estão indo para a URL certa e se retornam 200. Se der 404 ou erro de rede, ajuste `REACT_APP_API_URL`, faça novo build e recarregue.
2. **Banco vazio**: se a API retorna 200 mas com totais zerados, é porque não há produtos/movimentos no banco do servidor. Rode os seeders se precisar de dados iniciais.
3. **Permissão**: o endpoint do dashboard exige permissão `read`. Verifique se o usuário logado tem essa permissão no servidor (roles/seeders).

---

## 7. Resumo dos comandos após `git pull`

```bash
# Backend
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear
php artisan cache:clear

# Frontend (com .env já configurado com REACT_APP_API_URL)
cd ../frontend
npm ci
npm run build
```

Depois, garanta que o servidor web está servindo a pasta de **build** do frontend e que as rotas SPA estão configuradas como acima.
