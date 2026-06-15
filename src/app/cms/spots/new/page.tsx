import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProvinces } from "@/lib/locations";
import { SpotForm } from "../spot-form";
import { getPlaceOptions } from "../place-options";

export default async function NewSpotPage() {
  const [places, adminProvinces] = await Promise.all([
    getPlaceOptions(),
    getProvinces(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/spots"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Địa điểm nhỏ
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Tạo địa điểm nhỏ
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Thêm một điểm tham quan cụ thể. Ảnh thêm được sau khi tạo (ở trang sửa).
      </p>

      <div className="mt-4">
        <SpotForm
          mode="create"
          places={places}
          adminProvinces={adminProvinces}
        />
      </div>
    </div>
  );
}
