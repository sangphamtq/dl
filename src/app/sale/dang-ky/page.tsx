import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SaleRegisterForm } from "./sale-form";
import type { ComboboxOption } from "@/components/ui/combobox";

export const metadata = {
  title: "Đăng ký làm CTV · Hành Trình Việt",
  description: "Đăng ký trở thành cộng tác viên bán dịch vụ du lịch đã xác minh.",
};

export default async function SaleRegisterPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/sale/dang-ky");
  }

  const [profile, places] = await Promise.all([
    prisma.saleProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        slug: true,
        status: true,
        rejectReason: true,
        displayName: true,
        bio: true,
        services: true,
        zalo: true,
        phone: true,
        facebookUrl: true,
        website: true,
        avatarUrl: true,
        evidenceUrls: true,
        areas: { select: { id: true } },
      },
    }),
    prisma.place.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        kind: true,
        parent: { select: { name: true } },
      },
    }),
  ]);

  const placeOptions: ComboboxOption[] = places.map((p) => ({
    value: p.id,
    label:
      p.kind === "province"
        ? `${p.name} · Tỉnh`
        : `${p.name}${p.parent ? ` · ${p.parent.name}` : ""}`,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Đăng ký làm cộng tác viên
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Để lại thông tin dịch vụ & kênh liên hệ. Sau khi được{" "}
          <b>xác minh uy tín</b>, hồ sơ của bạn sẽ có huy hiệu và khách có thể
          liên hệ trực tiếp.
        </p>

        <div className="mt-8">
          <SaleRegisterForm
            initial={{
              displayName: profile?.displayName ?? "",
              bio: profile?.bio ?? "",
              services: profile?.services ?? [],
              zalo: profile?.zalo ?? "",
              phone: profile?.phone ?? "",
              facebookUrl: profile?.facebookUrl ?? "",
              website: profile?.website ?? "",
              avatarUrl: profile?.avatarUrl ?? "",
              evidenceUrls: profile?.evidenceUrls ?? [],
              areaIds: profile?.areas.map((a) => a.id) ?? [],
            }}
            status={profile?.status ?? null}
            slug={profile?.slug ?? null}
            rejectReason={profile?.rejectReason ?? null}
            places={placeOptions}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
