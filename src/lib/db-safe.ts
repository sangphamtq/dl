import { Prisma } from "@/generated/prisma/client";

// Nhận diện lỗi "KHÔNG kết nối được cơ sở dữ liệu" (chưa bật Postgres/Docker,
// sai DATABASE_URL, DB timeout…) để phân biệt với lỗi truy vấn thực sự.
//
// Mã lỗi Prisma liên quan tới kết nối:
//   P1000 auth thất bại · P1001 không reach được DB · P1002 timeout
//   P1008 hết thời gian chờ thao tác · P1017 server đóng kết nối
const CONNECTION_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

export function isDbConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  // Driver adapter (@prisma/adapter-pg) có thể ném lỗi mạng thô từ `pg`.
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : "";
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|Can't reach database|Connection terminated/i.test(
    msg,
  );
}

// Chạy một truy vấn; nếu DB chưa kết nối thì trả về `fallback` thay vì để trang
// văng lỗi. Lỗi truy vấn thật (schema sai, ràng buộc…) vẫn được ném ra như cũ.
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
