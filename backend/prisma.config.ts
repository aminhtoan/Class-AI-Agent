import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getEnv } from "./src/config/env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Ưu tiên kết nối trực tiếp (Direct Connection - port 5432) cho lệnh migrate
    // để tránh bị treo khi đi qua Connection Pooler (như PgBouncer/Supavisor).
    // Logic: Ưu tiên DIRECT_URL (nếu có), nếu không thì dùng DATABASE_URL.
    url: (() => {
      const env = getEnv();
      return env.DIRECT_URL ?? env.DATABASE_URL;
    })(),
  },
});
