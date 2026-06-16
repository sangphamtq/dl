"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlaceFilterOption } from "./place-filter";

// Dropdown lọc danh sách Listing theo tỉnh / điểm đến lớn. Điều hướng bằng query
// param `place`, giữ nguyên các filter khác đang có trên URL.
export function PlaceFilterSelect({
  options,
  value,
}: {
  options: PlaceFilterOption[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const provinces = options.filter((p) => p.kind === "province");
  const destinations = options.filter((p) => p.kind === "destination");

  function onChange(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v && v !== "all") params.set("place", v);
    else params.delete("place");
    params.delete("page"); // đổi nơi → về trang 1
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <Select value={value || "all"} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Mọi nơi" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Mọi nơi</SelectItem>
        {provinces.length > 0 && (
          <SelectGroup>
            <SelectLabel>Tỉnh / Thành phố</SelectLabel>
            {provinces.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {destinations.length > 0 && (
          <SelectGroup>
            <SelectLabel>Điểm đến lớn</SelectLabel>
            {destinations.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.parentName ? ` · ${p.parentName}` : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
