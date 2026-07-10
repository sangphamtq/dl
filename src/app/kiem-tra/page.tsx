import { ShieldCheck } from "@/components/icons";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { TrustChecker } from "./trust-checker";

export const metadata = {
  title: "Kiểm tra uy tín · Halivivu",
  description:
    "Tra cứu SĐT, Facebook, website, số tài khoản: đã xác minh hay bị báo cáo lừa đảo.",
};

export default async function KiemTraPage() {
  const session = await auth();
  const isAuthed = !!session?.user?.id;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="size-5" />
          <span className="text-sm font-semibold">Kiểm tra uy tín</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Trước khi chuyển cọc, hãy kiểm tra
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dán số điện thoại, link Facebook, website hoặc số tài khoản để xem có{" "}
          <b>đã xác minh trên nền tảng</b> hay <b>bị cộng đồng báo cáo lừa đảo</b>{" "}
          không.
        </p>

        <div className="mt-8">
          <TrustChecker isAuthed={isAuthed} />
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Lưu ý: kết quả chỉ mang tính tham khảo. &quot;Chưa có dữ liệu&quot;
          không có nghĩa là an toàn. Luôn ưu tiên liên hệ và chuyển khoản qua
          đúng kênh chính chủ đã xác minh.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
