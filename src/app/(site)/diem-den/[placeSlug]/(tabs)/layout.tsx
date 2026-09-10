import { notFound } from "next/navigation";
import { getPlaceHero, getPlaceCounts, buildPlaceTabs } from "@/lib/place-meta";
import { getDestinationPeerGroups } from "@/lib/peers";
import { isStaffViewer } from "@/lib/preview";
import { PlaceTabs } from "@/components/site/place-tabs";
import { PeerBar } from "@/components/site/peer-bar";

/* ──────────────────────────────────────────────────────────────────
   KHUNG CHUNG CỦA CÁC TAB CON — thanh ngữ cảnh · thanh tab · dải điểm đến
   lân cận. Đây là thứ làm cho thanh tab hành xử ĐÚNG NHƯ MỘT THANH TAB: đổi
   tab thì Next chỉ tải lại phần `page`, layout này KHÔNG dựng lại và mấy truy
   vấn dưới đây KHÔNG chạy lại.

   Trước đó ba file route (`page.tsx` tổng quan, `[loai]`, `cong-dong`) mỗi
   file tự dựng lại đầu trang, mỗi lần đổi tab là chạy lại toàn bộ
   `getPlaceHero` + `getPlaceCounts` + `getVisitors` + `getReviewSummary` +
   `getDestinationPeerGroups` cho một phần màn hình đáng lẽ không đổi. Và vì
   chép ba lần nên hai kiểu hero mới trôi ra khác nhau — một nguyên nhân, ba
   triệu chứng.

   `(tabs)` là ROUTE GROUP nên không thêm đoạn nào vào URL: `/diem-den/phan-
   thiet/dia-diem` vẫn y nguyên, vẫn là route thật, vẫn có `generateMetadata`
   riêng cho từng tab, vẫn index và chia sẻ được. Trang **Tổng quan** nằm NGOÀI
   group này nên giữ hero lớn của nó — hai vai trò khác nhau thật, không nên ép
   chung một khung.

   `ban-do` cũng đang nằm ngoài (bản đồ cao `100dvh`, chưa quyết chừa chỗ cho
   hai thanh này thế nào) — xem ghi chú ở CLAUDE.md.
   ────────────────────────────────────────────────────────────────── */
export default async function PlaceTabsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const [heroData, staff] = await Promise.all([
    getPlaceHero(placeSlug),
    isStaffViewer(),
  ]);
  if (!heroData || (heroData.place.status !== "published" && !staff)) notFound();
  const place = heroData.place;

  // Không còn nút "đã đến"/chia sẻ ở đây nên layout cũng KHÔNG cần phiên đăng
  // nhập lẫn truy vấn check-in — hai hành động đó là cấp ĐIỂM ĐẾN, sống ở trang
  // Tổng quan.
  const [counts, peerGroups] = await Promise.all([
    getPlaceCounts(place.id),
    getDestinationPeerGroups(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <PlaceTabs
          items={buildPlaceTabs(place.slug, counts)}
          place={{
            slug: place.slug,
            name: place.name,
            image: heroData.heroImages[0]?.url ?? null,
          }}
        />
        {children}
      </main>

      <PeerBar
        groups={peerGroups}
        currentSlug={place.slug}
        prefix="diem-den"
        title="Điểm đến"
      />
    </div>
  );
}
