import { PrismaClient } from '@prisma/client'
import { NODE_ENV, DATABASE_URL } from '@/lib/env'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  })

if (NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test database connection on startup (in development)
if (NODE_ENV === 'development') {
  prisma.$connect().catch((error) => {
    console.error('Failed to connect to database:', error)
  })
}
