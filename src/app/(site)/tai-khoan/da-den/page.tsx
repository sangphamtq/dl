import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DaDenBoard } from "@/components/account/da-den-board";
import { parseMapCardOptions } from "@/lib/map-card";

export const metadata = { title: "Nơi đã đến" };

export default async function DaDenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/tai-khoan/da-den");

  // Tỉnh đã đến của user + bản đồ slug→id để đánh dấu mọi tỉnh + tuỳ chỉnh đã
  // lưu của chính người này.
  const [rows, provinces, me] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: session.user.id, place: { kind: "province" } },
      select: { place: { select: { slug: true } } },
    }),
    prisma.place.findMany({
      where: { kind: "province" },
      select: { slug: true, id: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mapCardOptions: true },
    }),
  ]);

  const initialVisited = rows
    .map((r) => r.place?.slug)
    .filter((s): s is string => !!s);
  const slugToId = Object.fromEntries(provinces.map((p) => [p.slug, p.id]));
  // Đọc qua `parseMapCardOptions` ngay ở server để HTML lần đầu đã đúng màu —
  // không nháy một nhịp màu mặc định rồi mới đổi sau khi hydrate.
  // Tên điền sẵn từ tài khoản khi người dùng chưa từng lưu gì — họ vào trang là
  // tấm ảnh đã có tên mình, khỏi phải gõ. Lưu rồi thì lựa chọn của họ thắng, kể
  // cả khi họ cố tình xoá trống.
  const accountName = session.user.name ?? "";
  const options = parseMapCardOptions(me?.mapCardOptions, accountName);

  return (
    <div className="flex flex-1 flex-col">
      {/* Nền TRANG, không gradient. Bản trước đổ một dải xanh trời
          (`from-sky-100/70 via-sky-50/40`) rồi thả ba vòng tròn đồng tâm phía
          sau. Gỡ cả hai:
            · `sky-*` là màu cứng — không có trong bảng token, nên dark mode phải
              rẽ nhánh riêng và nó không ăn nhập với bất kỳ trang nào khác;
            · ba vòng tròn là trang trí thuần tuý, mà thứ đáng nhìn trên trang
              này đã có sẵn: chính tấm bản đồ. Nền càng phẳng thì mảng cam của
              các tỉnh đã đến càng nổi. */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          {/* Tiêu đề theo ĐÚNG giọng của mọi trang khác: font display, in hoa,
              giãn ký tự (xem `section-heading.tsx`). Bản trước là `text-3xl
              font-bold` kèm một eyebrow cam "Hành trình của bạn" — mà chính
              file đó ghi rõ idiom eyebrow đã gỡ khỏi cả 16 mục vì nó gần như
              lặp lại tiêu đề ngay dưới nó. */}
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] text-foreground sm:tracking-[0.14em]">
            Nơi bạn đã đến
          </h1>

          <DaDenBoard
            initialVisited={initialVisited}
            initialOptions={options}
            accountName={accountName}
            slugToId={slugToId}
          />
        </div>
      </main>
    </div>
  );
}
