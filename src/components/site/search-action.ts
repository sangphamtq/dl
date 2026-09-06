"use server";

import {
  searchAll,
  featuredDestinations,
  type SearchItem,
} from "@/lib/search";
import { coverUrl } from "@/lib/place-image";

// Ô ảnh của palette là 44px (hàng kết quả) và 40px (thẻ gợi ý) → một cỡ 96px
// phục vụ cả hai ở màn 2x. MỘT cỡ duy nhất để cùng một nơi xuất hiện ở hai chỗ
// vẫn ra đúng một tấm ảnh (URL picsum gắn theo seed + kích thước).
const THUMB = 96;

export type SearchHit = {
  name: string;
  href: string;
  context?: string; // dòng phụ: tỉnh cha / nơi chứa / trích đoạn
  /**
   * LUÔN có ảnh. Phần lớn bản ghi chưa có `Image` thật (Place "Phan Thiết" và
   * cả ba bài viết về nó đều trống), nhưng cả site vẫn ra ảnh vì đi qua
   * `coverUrl()` — nó rơi về picsum gắn theo slug. Search từng bỏ qua bước đó
   * nên bảng kết quả thành một cột ô xám trong khi thẻ ở mọi trang khác đều có
   * hình. Cùng lý do đã chốt cho pin ở `/ban-do`.
   */
  image: string;
};

export type SearchGroup = {
  label: string; // nhãn loại, dùng thẳng làm tiêu đề nhóm
  items: SearchHit[];
};

/**
 * Kết quả cho Command palette, GIỮ NGUYÊN nhóm theo loại của `searchAll`.
 *
 * Bản trước gộp thành hai rổ: "Địa điểm" (Place + Spot) và "Khác" (mọi loại còn
 * lại). Rổ "Khác" không nói được gì, nên mỗi hàng phải tự ghi loại ở mép phải —
 * một nhãn lặp lại chuyện mà tiêu đề nhóm vốn phải nói, lại còn ăn mất bề ngang
 * của tên đã bị cắt. Nay tiêu đề nhóm gánh việc đó và hàng chỉ còn nội dung.
 *
 * Trần TỔNG (9) chứ không phải trần mỗi nhóm: đây là bảng nhảy nhanh, dài quá
 * thì phải cuộn — mà cuộn thì đã có `/tim-kiem`.
 */
const MAX_ROWS = 9;
const PER_GROUP = 3;

export async function searchSite(q: string): Promise<SearchGroup[]> {
  if (!q.trim()) return [];
  const groups = await searchAll(q, PER_GROUP);

  const toHit = (prefix: string, it: SearchItem): SearchHit => {
    const province = prefix === "diem-den" && !!it.isProvince;
    return {
      name: it.name,
      href: `/${prefix}/${it.slug}`,
      // Tỉnh không có tỉnh cha nên `context` trống — ghi thẳng cấp hành chính
      // để hàng không cụt một dòng so với các hàng quanh nó.
      context: it.context ?? (province ? "Tỉnh, thành phố" : undefined),
      image: it.image ?? coverUrl([], it.slug, THUMB, THUMB),
    };
  };

  // RÓT HAI LƯỢT, không phải cắt lần lượt từ đầu danh sách: `searchAll` luôn trả
  // nhóm theo thứ tự cố định (Điểm đến → … → Bài viết), nên cắt tuần tự thì một
  // từ khoá trúng nhiều điểm đến sẽ ăn hết trần và Bài viết không bao giờ hiện —
  // đúng thứ mà việc chia nhóm theo loại sinh ra để tránh.
  const taken = groups.map(() => 0);
  let total = 0;
  for (const round of [1, PER_GROUP]) {
    for (const [i, g] of groups.entries()) {
      while (taken[i] < Math.min(round, g.items.length) && total < MAX_ROWS) {
        taken[i]++;
        total++;
      }
    }
  }

  return groups
    .map((g, i) => ({
      label: g.label,
      items: g.items.slice(0, taken[i]).map((it) => toHit(g.prefix, it)),
    }))
    .filter((g) => g.items.length > 0);
}

// Gợi ý khi mới mở ô tìm kiếm (chưa gõ): điểm đến nổi bật (không lấy tỉnh).
export async function getSuggestions(): Promise<SearchHit[]> {
  const items = await featuredDestinations(6);
  return items.map((it) => ({
    name: it.name,
    href: `/diem-den/${it.slug}`,
    context: it.context,
    image: it.image ?? coverUrl([], it.slug, THUMB, THUMB),
  }));
}
