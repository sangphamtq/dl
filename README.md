# Halivivu — hỗ trợ thông tin du lịch Việt Nam

Website tra cứu điểm đến theo cấu trúc phân cấp: **Tỉnh → Điểm đến lớn → mọi thông tin
cần biết** (đi đâu, ăn gì, chơi gì, ở đâu, đi lại thế nào), kèm blog cẩm nang và công cụ
lên lịch trình chuyến đi.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Prisma 7 + PostgreSQL · Auth.js (NextAuth v5, Google OAuth).

**pnpm là package manager bắt buộc** — môi trường không có npm/npx.

## Chạy dự án

```bash
pnpm install
pnpm exec prisma generate     # sinh Prisma client vào src/generated/prisma
pnpm dev                      # http://localhost:3000
```

Biến môi trường: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` ở `.env.local`;
`DATABASE_URL` ở `.env`.

## Lệnh thường dùng

```bash
pnpm build                 # prisma migrate deploy && next build
pnpm lint                  # ESLint
pnpm exec tsc --noEmit     # kiểm tra type
pnpm exec prisma studio    # GUI xem/sửa dữ liệu
pnpm set-role <email> admin
pnpm seed:places           # và các script seed:* khác trong package.json
```

## Tài liệu

- [`CLAUDE.md`](CLAUDE.md) — mô hình dữ liệu, quy ước URL, quyết định thiết kế (nguồn chính).
- [`docs/`](docs/) — thiết kế chi tiết cho lịch trình chuyến đi và các tính năng lớn.
- `prisma/schema.prisma` — nguồn chân lý của mô hình dữ liệu.
