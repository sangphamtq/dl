import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { getProvinces } from "@/lib/locations";
import { PlaceForm } from "../place-form";

export default async function NewPlacePage() {
  const [provinces, adminProvinces] = await Promise.all([
    prisma.place.findMany({
      where: { kind: "province" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getProvinces(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/places"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tỉnh & Điểm đến
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Tạo Tỉnh / Điểm đến
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Thêm một tỉnh gốc hoặc một điểm đến lớn thuộc tỉnh. Ảnh sẽ thêm được sau
        khi tạo (ở trang sửa).
      </p>

      <div className="mt-4">
        <PlaceForm
          mode="create"
          provinces={provinces}
          adminProvinces={adminProvinces}
        />
      </div>
    </div>
  );
}
