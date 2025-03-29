module.exports = jest.mock('@prisma/client', () => {
    const mockPrisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findFirstOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      collection:{
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        update: jest.fn(),
        
        delete: jest.fn(),
      },
      $connect: jest.fn(() => Promise.resolve()),
      $disconnect: jest.fn(() => Promise.resolve()),
    };
  
    return {
        PrismaClient: jest.fn(() => {
          process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // Use the test DB URL
          return mockPrisma;
        }),
      };
  });
  