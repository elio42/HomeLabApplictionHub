// Load environment variables before creating the Prisma client.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Optionally log which database file is being used in development for clarity.
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("[prisma] DATABASE_URL =", process.env.DATABASE_URL);
}

const prisma = new PrismaClient();

export { prisma };
