import { Prisma } from "@/generated/prisma/client";

const CONNECTION_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

function isDbConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : "";
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|Can't reach database|Connection terminated/i.test(
    msg,
  );
}

export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isDbConnectionError(err)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[db-safe] Không kết nối được cơ sở dữ liệu — dùng giá trị mặc định. " +
            "Hãy bật Postgres (Docker) rồi tải lại trang.",
        );
      }
      return fallback;
    }
    throw err;
  }
}
