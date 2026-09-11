import { revalidatePath } from "next/cache";

export function revalidateListingPages(placeSlug?: string | null) {
  revalidatePath("/diem-den");
  revalidatePath("/dia-diem");
  if (placeSlug) revalidatePath(`/diem-den/${placeSlug}`);
}
