import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BildyApp API',
      version: '1.0.0',
      description:
        'API REST para la digitalización de albaranes — gestión de clientes, proyectos y partes de horas/materiales (práctica final webII).',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            number: { type: 'string' },
            postal: { type: 'string' },
            city: { type: 'string' },
            province: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            message: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
            password: { type: 'string', example: 'Password123' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'verified'] },
                role: { type: 'string', enum: ['admin', 'guest'] },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        PersonalDataRequest: {
          type: 'object',
          required: ['name', 'lastName', 'nif'],
          properties: {
            name: { type: 'string' },
            lastName: { type: 'string' },
            nif: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        CompanyRegular: {
          type: 'object',
          required: ['isFreelance', 'name', 'cif'],
          properties: {
            isFreelance: { type: 'boolean', enum: [false] },
            name: { type: 'string' },
            cif: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        CompanyFreelance: {
          type: 'object',
          required: ['isFreelance'],
          properties: {
            isFreelance: { type: 'boolean', enum: [true] },
          },
        },
        Company: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            owner: { type: 'string' },
            name: { type: 'string' },
            cif: { type: 'string' },
            isFreelance: { type: 'boolean' },
            logo: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            lastName: { type: 'string' },
            nif: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'guest'] },
            status: { type: 'string', enum: ['pending', 'verified'] },
            company: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Company' }] },
            fullName: { type: 'string' },
          },
        },
        ClientInput: {
          type: 'object',
          required: ['name', 'cif'],
          properties: {
            name: { type: 'string', example: 'Construcciones García SL' },
            cif: { type: 'string', example: 'B12345678' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        Client: {
          allOf: [
            { $ref: '#/components/schemas/ClientInput' },
            {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                user: { type: 'string' },
                company: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        PagedClients: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/Client' } },
            currentPage: { type: 'integer' },
            totalPages: { type: 'integer' },
            totalItems: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        ProjectInput: {
          type: 'object',
          required: ['name', 'projectCode', 'client'],
          properties: {
            name: { type: 'string', example: 'Reforma calle Mayor' },
            projectCode: { type: 'string', example: 'PRJ-2026-001' },
            client: { type: 'string', description: 'ObjectId del cliente' },
            email: { type: 'string', format: 'email' },
            notes: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
            active: { type: 'boolean' },
          },
        },
        Project: {
          allOf: [
            { $ref: '#/components/schemas/ProjectInput' },
            {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                user: { type: 'string' },
                company: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        PagedProjects: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
            currentPage: { type: 'integer' },
            totalPages: { type: 'integer' },
            totalItems: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        Worker: {
          type: 'object',
          required: ['name', 'hours'],
          properties: {
            name: { type: 'string' },
            hours: { type: 'number' },
          },
        },
        DeliveryNoteMaterial: {
          type: 'object',
          required: ['format', 'client', 'project', 'material', 'quantity'],
          properties: {
            format: { type: 'string', enum: ['material'] },
            client: { type: 'string' },
            project: { type: 'string' },
            description: { type: 'string' },
            workDate: { type: 'string', format: 'date-time' },
            material: { type: 'string', example: 'Cemento Portland' },
            quantity: { type: 'number', example: 10 },
            unit: { type: 'string', example: 'sacos' },
          },
        },
        DeliveryNoteHours: {
          type: 'object',
          required: ['format', 'client', 'project'],
          properties: {
            format: { type: 'string', enum: ['hours'] },
            client: { type: 'string' },
            project: { type: 'string' },
            description: { type: 'string' },
            workDate: { type: 'string', format: 'date-time' },
            hours: { type: 'number', example: 8 },
            workers: { type: 'array', items: { $ref: '#/components/schemas/Worker' } },
          },
        },
        DeliveryNote: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/User' }] },
            company: { type: 'string' },
            client: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Client' }] },
            project: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Project' }] },
            format: { type: 'string', enum: ['material', 'hours'] },
            description: { type: 'string' },
            workDate: { type: 'string', format: 'date-time' },
            material: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            hours: { type: 'number' },
            workers: { type: 'array', items: { $ref: '#/components/schemas/Worker' } },
            signed: { type: 'boolean' },
            signedAt: { type: 'string', format: 'date-time' },
            signatureUrl: { type: 'string' },
            pdfUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const spec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api-docs.json', (_req, res) => res.json(spec));
};

export { spec as swaggerSpec };
