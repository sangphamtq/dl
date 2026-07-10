import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { SpecialtyForm } from "../specialty-form";
import { getPlaceOptions, getEateryOptions } from "../options";

export default async function NewSpecialtyPage() {
  const [places, eateries] = await Promise.all([
    getPlaceOptions(),
    getEateryOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/specialties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Đặc sản
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Tạo đặc sản</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Món ăn hoặc sản vật đặc trưng. Ảnh thêm được sau khi tạo (ở trang sửa).
      </p>

      <div className="mt-4">
        <SpecialtyForm mode="create" places={places} eateries={eateries} />
      </div>
    </div>
  );
}
