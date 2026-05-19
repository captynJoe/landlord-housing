import { PrismaClient } from "@prisma/client";
import type { BuildingRepository } from "./buildingRepository.js";
import { PrismaBuildingRepository } from "./prismaBuildingRepository.js";
import { MemoryStore } from "../store/memoryStore.js";

export interface RepositoryContext {
  buildingRepository: BuildingRepository;
  backend: "memory" | "prisma";
  prisma?: PrismaClient;
  close(): Promise<void>;
}

function useMemoryRepositoryContext(): RepositoryContext {
  return {
    buildingRepository: new MemoryStore(),
    backend: "memory",
    prisma: undefined,
    close: async () => {}
  };
}

function shouldAllowMemoryFallbackOnDbError(): boolean {
  return (
    process.env.ALLOW_MEMORY_FALLBACK_ON_DB_ERROR?.toLowerCase() === "true"
  );
}

export async function createRepositoryContext(): Promise<RepositoryContext> {
  if (!process.env.DATABASE_URL) {
    return useMemoryRepositoryContext();
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
  } catch (error) {
    if (!shouldAllowMemoryFallbackOnDbError()) {
      throw error;
    }

    await prisma.$disconnect().catch(() => {});
    console.warn(
      "DATABASE_URL is set but PostgreSQL is unreachable. Falling back to memory storage because ALLOW_MEMORY_FALLBACK_ON_DB_ERROR=true."
    );
    return useMemoryRepositoryContext();
  }

  return {
    buildingRepository: new PrismaBuildingRepository(prisma),
    backend: "prisma",
    prisma,
    close: async () => {
      await prisma.$disconnect();
    }
  };
}
