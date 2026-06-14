import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EateryForm } from "../eatery-form";
import { getPlaceOptions } from "../options";

export default async function NewEateryPage() {
  const places = await getPlaceOptions();

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/eateries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quán ăn
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Tạo quán ăn</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Thêm một quán/nhà hàng. Ảnh thêm được sau khi tạo (ở trang sửa).
      </p>

      <div className="mt-4">
        <EateryForm mode="create" places={places} />
      </div>
    </div>
  );
}
