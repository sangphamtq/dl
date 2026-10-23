import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClass?: typeof PrismaClient;
};

// Dev giữ client trên globalThis để tải nóng không mở thêm kết nối — nhưng vì thế sau
// `prisma generate` code mới vẫn dùng client của SCHEMA CŨ ("Unknown argument" với cột
// vừa thêm) cho tới khi khởi động lại. Sinh lại client = lớp PrismaClient mới ⇒ tạo lại.
if (globalForPrisma.prisma && globalForPrisma.prismaClass !== PrismaClient) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClass = PrismaClient;
}
