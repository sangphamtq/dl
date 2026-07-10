import { CheckCircle2, XCircle, Database, Cloud, KeyRound } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { FormSection } from "@/components/cms/form-section";
import { SettingsForm } from "./settings-form";
import { RevalidateButton } from "./revalidate-button";
import type { SettingsInput } from "./actions";

// Kiểm tra DB có kết nối được không (đơn giản).
async function dbOk(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default async function SettingsPage() {
  const [session, settings, dbConnected] = await Promise.all([
    auth(),
    getSettings(),
    dbOk(),
  ]);
  const isAdmin = session?.user?.role === "admin";

  const initial: SettingsInput = {
    siteName: settings.siteName,
    tagline: settings.tagline,
    description: settings.description,
    contactEmail: settings.contactEmail ?? "",
    facebookUrl: settings.facebookUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    youtubeUrl: settings.youtubeUrl ?? "",
  };

  const integrations = [
    { label: "Cơ sở dữ liệu", icon: Database, ok: dbConnected },
    {
      label: "Lưu trữ ảnh (UploadThing)",
      icon: Cloud,
      ok: Boolean(process.env.UPLOADTHING_TOKEN),
    },
    {
      label: "Đăng nhập Google",
      icon: KeyRound,
      ok: Boolean(process.env.AUTH_GOOGLE_ID),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cài đặt</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cấu hình thông tin site và công cụ hệ thống.
      </p>

      {!isAdmin && (
        <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm text-muted-foreground">
          Bạn đang xem ở chế độ chỉ đọc. Chỉ quản trị viên mới đổi được cài đặt.
        </p>
      )}

      <div className="mt-6">
        <SettingsForm initial={initial} canEdit={isAdmin} />
      </div>

      {/* Công cụ & trạng thái (không cần lưu trữ) */}
      <div className="border-t">
        <FormSection
          title="Hệ thống"
          description="Trạng thái tích hợp và công cụ vận hành."
        >
          <div className="space-y-4">
            <div className="divide-y rounded-xl border">
              {integrations.map(({ label, icon: Icon, ok }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1">{label}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      ok ? "text-primary" : "text-destructive",
                    )}
                  >
                    {ok ? (
                      <>
                        <CheckCircle2 className="size-3.5" /> Đã cấu hình
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5" /> Chưa cấu hình
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Làm mới cache</p>
                <p className="text-xs text-muted-foreground">
                  Cập nhật lại trang công khai sau khi đổi nội dung/cài đặt.
                </p>
              </div>
              {isAdmin ? (
                <RevalidateButton />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Cần quyền quản trị
                </span>
              )}
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
