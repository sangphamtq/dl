import Image from "next/image";
import Link from "next/link";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/site/section-heading";

export type ExperienceItem = {
  slug: string;
  name: string;
  category: string | null;
  image: string;
  duration: string | null; // "nửa ngày", "2N1Đ"
  season: string | null; // "tháng 10 – 4"
  // Các Spot mà trải nghiệm này diễn ra ở đó (quan hệ M:N Activity↔Spot).
  spotNames: string[];
  spotCount: number;
};

const MICRO = "text-[0.66rem] font-medium uppercase tracking-[0.16em]";

// Section "Trải nghiệm nổi bật" của trang Place — BỐN THẺ DỌC, tĩnh.
//
// Bản trước là băng ảnh kéo ngang tràn viền. Bỏ vì hai lẽ:
//  - dải "Địa điểm đáng ghé" ngay trên đã là một khối tràn viền tự đổi mục; hai
//    khối lớn liền nhau cùng đòi tương tác thì trang thành một chuỗi băng chuyền;
//  - băng kéo phải cuộn mới thấy hết, mà mục này chỉ cần cho xem TRƯỚC vài trải
//    nghiệm rồi dẫn sang trang danh mục. Bốn thẻ nằm sẵn trên màn hình đọc xong
//    trong một cái nhìn.
//
// Mỗi thẻ trả lời đúng ba câu hỏi của một trải nghiệm — khác hẳn một món ăn:
//  1. LÀ GÌ: ảnh dọc lớn + tên (+ nhãn nhóm).
//  2. BAO LÂU / MÙA NÀO: hàng fact có icon — `durationText` và `seasonText`.
//  3. DIỄN RA Ở ĐÂU: tên các `Spot` liên kết. Quan hệ M:N Activity↔Spot là
//     xương sống của phần này (xem CLAUDE.md) nhưng trước giờ không hiện ở đâu
//     trên trang tổng quan cả.
//
// Khác thực đơn Ẩm thực bên dưới (cũng là danh sách có ảnh): ở đây thẻ DỌC, ảnh
// lớn, bốn cột; dưới đó là hàng NGANG, ảnh nhỏ, hai cột. Cùng một lối thông tin
// nhưng hai hình khối rõ ràng khác nhau.
//
// Là Server Component: tĩnh hoàn toàn, không tốn byte JS nào ở client.
export function ExperienceGrid({
  title,
  href,
  count,
  unit,
  items,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string;
  items: ExperienceItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <SectionHeading
        title={title}
        href={href}
        count={count}
        unit={unit}
      />

      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.slug} it={it} />
        ))}
      </ul>
    </div>
  );
}

function Card({ it }: { it: ExperienceItem }) {
  const facts = [
    it.duration && { icon: "clock", text: it.duration },
    it.season && { icon: "calendar", text: it.season },
  ].filter((f): f is { icon: string; text: string } => Boolean(f));

  return (
    <li>
      <Link href={`/hoat-dong/${it.slug}`} className="group block">
        <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={it.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 23vw, 46vw"
            className="object-cover"
          />
        </span>

        {it.category && (
          <span className={cn(MICRO, "mt-4 block text-warm")}>{it.category}</span>
        )}

        {/* Chiều cao tối thiểu cho khối tên: tên một dòng và tên hai dòng nằm
            cạnh nhau thì các hàng fact bên dưới vẫn thẳng hàng. */}
        <span className="mt-1.5 flex min-h-[3.5rem] items-start">
          <span className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {it.name}
          </span>
        </span>

        {/* Bao lâu · mùa nào — chữ thường có icon, KHÔNG phải chữ hoa giãn ký tự
            như nhãn nhóm: đây là dữ kiện để đọc, không phải nhãn để nhận diện. */}
        {facts.length > 0 && (
          <span className="mt-0.5 flex flex-col gap-1">
            {facts.map((f) => (
              <span
                key={f.icon}
                className="flex items-baseline gap-1.5 text-sm text-muted-foreground"
              >
                <Ic
                  icon={f.icon}
                  className="size-3.5 shrink-0 translate-y-0.5"
                  aria-hidden
                />
                <span className="truncate">{f.text}</span>
              </span>
            ))}
          </span>
        )}

        {/* Diễn ra ở đâu — tên Spot thật. Trải nghiệm trải nhiều spot (chèo
            kayak, săn mây) là chuyện thường, nên đây là thông tin, không phải
            trang trí. */}
        {it.spotNames.length > 0 && (
          <span className="mt-2.5 block border-t border-border/60 pt-2.5 text-sm text-foreground/80">
            <span className="line-clamp-2">
              {it.spotNames.join(" · ")}
              {it.spotCount > it.spotNames.length && (
                <span className="text-muted-foreground">
                  {" "}
                  +{it.spotCount - it.spotNames.length}
                </span>
              )}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}
