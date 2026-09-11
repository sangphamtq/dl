import { Backpack, NotebookPen, Route, Wallet } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";

export type TripSection = {
  token: string | null;
  label: string;
  icon: LucideIcon;
};

export const TRIP_SECTIONS: TripSection[] = [
  { token: null, label: "Lịch trình", icon: Route },
  {
    token: "ghi-chu",
    label: "Ghi chú",
    icon: NotebookPen,
  },
  {
    token: "do-mang-theo",
    label: "Đồ mang theo",
    icon: Backpack,
  },
  {
    token: "chi-phi",
    label: "Chi phí",
    icon: Wallet,
  },
];

export const tripSectionHref = (tripId: string, token: string | null) =>
  token ? `/lich-trinh/cua-toi/${tripId}/${token}` : `/lich-trinh/cua-toi/${tripId}`;

export const findTripSection = (token: string) =>
  TRIP_SECTIONS.find((s) => s.token === token) ?? null;
