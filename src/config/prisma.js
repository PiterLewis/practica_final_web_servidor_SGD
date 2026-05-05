// Cliente Prisma como capa complementaria (PostgreSQL via Supabase u otro proveedor)
// Se inicializa de forma perezosa y solo si DATABASE_URL está configurada,
// para no romper la API principal basada en Mongoose cuando no hay Postgres

let prisma = null;
let attempted = false;

const isEnabled = () => Boolean(process.env.DATABASE_URL);

export const getPrisma = async () => {
  if (!isEnabled()) {
    throw new Error('DATABASE_URL no está configurado; el cliente Prisma no está disponible');
  }
  if (prisma) return prisma;

  if (attempted) return prisma;
  attempted = true;

  try {
    const mod = await import('@prisma/client');
    const PrismaClient = mod.PrismaClient ?? mod.default?.PrismaClient;
    if (!PrismaClient) {
      throw new Error('No se pudo cargar PrismaClient (¿has ejecutado `npm run prisma:generate`?)');
    }
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    await prisma.$connect();
    return prisma;
  } catch (err) {
    prisma = null;
    throw err;
  }
};

export const disconnectPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};

export const isPrismaEnabled = () => isEnabled();
