import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PlaceForm } from "../place-form";

export default async function NewPlacePage() {
  const provinces = await prisma.place.findMany({
    where: { kind: "province" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="p-6 sm:p-8">
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

      <div className="mt-8">
        <PlaceForm mode="create" provinces={provinces} />
      </div>
    </div>
  );
}
