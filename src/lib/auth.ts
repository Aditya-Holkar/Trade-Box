import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

export const auth = databaseUrl
  ? betterAuth({
      database: new Pool({ connectionString: databaseUrl }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      emailAndPassword: {
        enabled: true,
      },
    })
  : null;
