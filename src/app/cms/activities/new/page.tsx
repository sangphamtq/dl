import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { ActivityForm } from "../activity-form";
import { getPlaceOptions, getSpotOptions } from "../options";

export default async function NewActivityPage() {
  const [places, spots] = await Promise.all([
    getPlaceOptions(),
    getSpotOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/activities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Hoạt động
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Tạo hoạt động
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Một loại trải nghiệm dùng lại. Ảnh thêm được sau khi tạo (ở trang sửa).
      </p>

      <div className="mt-4">
        <ActivityForm mode="create" places={places} spots={spots} />
      </div>
    </div>
  );
}
