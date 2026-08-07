import Link from "next/link";
import { Ic } from "@/components/icon";
import { timeAgo } from "@/lib/format";
import { THREAD_TYPE_LABELS } from "@/lib/community";
import type { CommunityDigest } from "@/lib/community-feed";

// Khối "Cộng đồng" của trang tổng quan.
//
// Section này KHÔNG trả lời câu hỏi lập kế hoạch nào — khác hẳn Địa điểm (đi
// đâu), Trải nghiệm (làm gì), Ẩm thực, Lưu trú. Nó trả lời đúng một câu: "chỗ
// này có người không, hỏi được không". Nên nó chỉ cần làm hai việc:
//   ① chứng minh có người thật và còn hoạt động → hàng chỉ số;
//   ② đưa sang tab Cộng đồng theo đúng ý định → đọc tiếp / đặt câu hỏi.
//
// Vì vậy bỏ hẳn lối "ba thẻ bài" của bản trước:
//   · ba khối chữ cạnh nhau thành một mảng xám giữa trang lấy ảnh làm chủ, mà
//     nội dung cộng đồng thì lộn xộn — phóng to nó ngang tầm các section biên
//     tập là hạ uy tín trang;
//   · số like không nói gì với người chưa vào cộng đồng, đó là chỉ số nội bộ
//     của feed;
//   · bài rao dịch vụ của CTV lọt vào (và thường mới nhất nên đứng đầu) —
//     lọc ở tầng truy vấn, xem `getPlaceCommunityDigest`.
// Còn lại là một BẢNG TIN: mỗi bài một dòng, đủ để nhận ra "đúng loại câu mình
// đang định hỏi" rồi bấm, không phải để đọc ở đây.
export function CommunityPreview({
  digest,
  href,
  placeName,
}: {
  digest: CommunityDigest;
  href: string;
  placeName: string;
}) {
  const { people, lastAt, threads } = digest;

  // Chỉ số "có người & còn sống". CỐ Ý không lặp lại số bài — tiêu đề section đã
  // in "N thảo luận" rồi; hai con số giống nhau đứng cách nhau 20px là thừa.
  // Còn lại là hai dữ kiện tiêu đề KHÔNG nói: bao nhiêu người, và lần cuối có ai
  // lên tiếng (một nơi 20 bài mà im từ năm ngoái thì khác hẳn 4 bài của tuần này).
  const stats = [
    people > 0 ? `${people} người tham gia` : null,
    lastAt ? `Gần nhất ${timeAgo(lastAt)}` : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {stats.map((s) => (
          <span
            key={s}
            className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>

      {threads.length > 0 && (
        // Bảng tin: các dòng nằm trong MỘT khung, ngăn nhau bằng hairline. Một
        // khung thay vì ba thẻ rời — mắt đọc nó là "danh sách bài", đúng bản
        // chất một diễn đàn, và không tranh vai với các lưới ảnh phía trên.
        <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {threads.map((t) => (
            <li key={t.slug}>
              {/* Mọi dòng dẫn về TAB CỘNG ĐỒNG của điểm đến, không phải trang
                  permalink của từng bài. Từ trang tổng quan, người ta bấm vào
                  đây là muốn "xem chỗ này có gì" — đổ thẳng vào một bài lẻ là
                  nhấc họ ra khỏi ngữ cảnh điểm đến, mất luôn bộ lọc, ô soạn bài
                  và các bài còn lại. Bài lẻ vẫn mở được từ trong tab. */}
              <Link
                href={href}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:gap-4"
              >
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {THREAD_TYPE_LABELS[t.type] ?? t.type}
                </span>
                {/* Một dòng, cắt cụt: đây là chỗ NHẬN RA bài, không phải chỗ đọc. */}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground/90 transition-colors group-hover:text-primary">
                  {t.body}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Ic icon="message-circle" className="size-3.5" aria-hidden />
                  {t.replyCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Lời kêu gọi + nút sang tab. Câu bên trái nói THẲNG với người đọc chứ
          không mô tả tính năng của tab — bản trước là một dòng liệt kê ("Hỏi
          đáp, chia sẻ kinh nghiệm và rủ nhau ghép đoàn tại X"), đọc ra là chú
          thích chức năng, không mời được ai. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border/60 bg-card px-4 py-4 sm:px-5">
        <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
          Còn gì chưa rõ về {placeName}? Hỏi người vừa đi về.
        </p>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-warm px-5 py-2.5 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
        >
          <Ic icon="message-circle" className="size-4" aria-hidden />
          Vào cộng đồng
        </Link>
      </div>
    </>
  );
}
