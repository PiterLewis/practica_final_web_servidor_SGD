# BildyApp API — Práctica Final webII

API REST para la digitalización de albaranes (partes de horas o materiales) entre clientes y proveedores. Construida sobre el módulo de usuarios de la práctica intermedia y completa los temas T8 a T13.

## Stack

| Tecnología | Uso |
|------------|-----|
| Node.js 22 + Express | Servidor HTTP (ESM) |
| MongoDB + Mongoose | Persistencia |
| Zod | Validación de entrada (schemas + transforms + refine) |
| JWT (access + refresh) | Autenticación |
| bcryptjs | Hash de contraseñas |
| Multer + Sharp + Cloudinary | Subida de firmas y logos |
| pdfkit | Generación de albaranes en PDF |
| Socket.IO | Notificaciones en tiempo real (rooms por compañía) |
| Nodemailer | Envío de emails (verificación e invitaciones) |
| Slack Incoming Webhook | Notificación de errores 5xx |
| Swagger / OpenAPI 3.0 | Documentación interactiva en `/api-docs` |
| Jest + Supertest + mongodb-memory-server | Tests de integración |
| Docker + Docker Compose | Empaquetado y despliegue |
| GitHub Actions | CI |

## Funcionalidades

- Onboarding de usuarios y compañías (heredado de la práctica intermedia).
- CRUD de **Clientes** con paginación, filtros, soft delete y restore.
- CRUD de **Proyectos** vinculados a clientes con paginación, filtros, soft delete y restore.
- CRUD de **Albaranes** (`hours` y `material`), filtros por proyecto/cliente/fecha/firma.
- Generación de PDF, subida a Cloudinary y firma con imagen.
- Eventos Socket.IO (`client:new`, `project:new`, `deliverynote:new`, `deliverynote:signed`) emitidos solo a la compañía.
- Endpoint `/health` con estado de Mongo y `uptime`.
- Apagado ordenado al recibir `SIGTERM` / `SIGINT`.
- Bonus: dashboard con `aggregation pipeline` (`/api/dashboard`).

## Estructura

```
src/
├── app.js              # Configuración Express
├── index.js            # Bootstrap + Socket.IO + graceful shutdown
├── config/
│   ├── index.js
│   └── database.js
├── controllers/
├── docs/swagger.js
├── middleware/
├── models/
├── plugins/softDelete.plugin.js
├── routes/
├── services/
├── sockets/
├── utils/
└── validators/
tests/
.github/workflows/test.yml
Dockerfile
docker-compose.yml
api.http
```

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env con tus secretos (MongoDB, Cloudinary, SMTP, Slack)
npm run dev
```

La API queda disponible en `http://localhost:3000` y la documentación en `http://localhost:3000/api-docs`.

## Variables de entorno

Todas las variables están documentadas en `.env.example`. Las imprescindibles:

| Variable | Descripción |
|----------|-------------|
| `MONGODB_URI` | URI de MongoDB (Atlas o local) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secretos para firmar tokens |
| `CLOUDINARY_*` | Credenciales para subir firmas/PDFs (opcional, fallback a disco) |
| `SMTP_*` | Credenciales SMTP (Mailtrap, Gmail, SendGrid, etc.) |
| `SLACK_WEBHOOK_URL` | Webhook para reportar errores 5xx |

## Tests

```bash
npm test                # Ejecuta todos los tests con mongodb-memory-server
npm run test:coverage   # Genera el informe de cobertura en coverage/
```

> La primera ejecución descarga el binario de MongoDB en memoria (~400 MB).

## Docker

```bash
# Levantar API + MongoDB
docker compose up --build

# Solo construir la imagen
docker build -t bildyapp-api .
```

El contenedor expone el puerto `3000` y trae `HEALTHCHECK` integrado contra `/health`.

## CI

`.github/workflows/test.yml` ejecuta los tests en Node 20 y 22, y valida el build de Docker.

## Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/user/register` | Registro y emisión de tokens |
| PUT | `/api/user/validation` | Validar email |
| POST | `/api/user/login` | Login |
| GET | `/api/user` | Perfil |
| POST | `/api/client` | Crear cliente |
| GET | `/api/client` | Listar clientes (paginado/filtrado) |
| POST | `/api/project` | Crear proyecto |
| GET | `/api/project` | Listar proyectos (paginado/filtrado) |
| POST | `/api/deliverynote` | Crear albarán |
| GET | `/api/deliverynote/pdf/:id` | Descargar PDF |
| PATCH | `/api/deliverynote/:id/sign` | Firmar albarán (form-data) |
| GET | `/api/dashboard` | Estadísticas (bonus) |
| GET | `/api-docs` | Swagger UI |
| GET | `/health` | Health check |

Consulta `api.http` para ejemplos completos de cada endpoint.

## Eventos de Socket.IO

Los clientes deben conectarse con un JWT válido en `auth.token`:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000', { auth: { token: ACCESS_TOKEN } });
socket.on('connected', console.log);
socket.on('client:new', console.log);
socket.on('project:new', console.log);
socket.on('deliverynote:new', console.log);
socket.on('deliverynote:signed', console.log);
```

Cada compañía tiene su propia room (`company:<id>`) y los eventos solo llegan a sus miembros.

## Licencia

Uso académico (curso webII, IES SGD).
