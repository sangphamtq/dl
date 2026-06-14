import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getProvinces } from "@/lib/locations";
import { Badge } from "@/components/ui/badge";
import { FormSection } from "@/components/cms/form-section";
import { PlaceForm, type PlaceFormValues } from "../../place-form";
import { PlaceImages } from "../../place-images";

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [place, provinces, images, adminProvinces] = await Promise.all([
    prisma.place.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        kind: true,
        parentId: true,
        tagline: true,
        description: true,
        provinceCode: true,
        provinceName: true,
        districtCode: true,
        districtName: true,
        wardCode: true,
        wardName: true,
        tags: true,
      },
    }),
    prisma.place.findMany({
      where: { kind: "province" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.image.findMany({
      where: { placeId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
    getProvinces(),
  ]);

  if (!place) notFound();

  // Loại bỏ chính nó khỏi danh sách tỉnh cha (không tự làm cha mình).
  const parentOptions = provinces.filter((p) => p.id !== place.id);

  const initial: Partial<PlaceFormValues> = {
    name: place.name,
    slug: place.slug,
    kind: place.kind,
    parentId: place.parentId,
    tagline: place.tagline ?? "",
    description: place.description ?? "",
    provinceCode: place.provinceCode?.toString() ?? "",
    provinceName: place.provinceName ?? "",
    districtCode: place.districtCode?.toString() ?? "",
    districtName: place.districtName ?? "",
    wardCode: place.wardCode?.toString() ?? "",
    wardName: place.wardName ?? "",
    tags: place.tags.join(", "),
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/places/${place.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {place.name}
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sửa: {place.name}
        </h1>
        <Badge variant={place.kind === "province" ? "secondary" : "outline"}>
          {place.kind === "province" ? "Tỉnh" : "Điểm đến"}
        </Badge>
      </div>

      <div className="mt-4">
        <PlaceForm
          mode="edit"
          placeId={place.id}
          provinces={parentOptions}
          adminProvinces={adminProvinces}
          initial={initial}
        />
      </div>

      {/* Ảnh — cùng bố cục section với form */}
      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Tải ảnh cho nơi này. Ảnh bìa hiển thị ở danh sách & hero trang."
        >
          <PlaceImages placeId={place.id} images={images} />
        </FormSection>
      </div>
    </div>
  );
}
