"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Link2, Loader2, LogOut, Plus, Share2, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  inviteToTrip,
  leaveTrip,
  listTripMembers,
  removeFromTrip,
  setSharing,
  type TripMemberRow,
} from "@/app/(site)/lich-trinh/actions";
import { MICRO } from "@/components/trip/trip-rail";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import type { TripPerson } from "@/lib/trip";

// MỘT popover cho cả hai mức chia sẻ, không phải hai nút cạnh nhau:
//
//   1. CÙNG SỬA  — mời bằng email, người được mời sửa được nội dung.
//   2. AI CÓ LINK — chỉ đọc, không cần tài khoản.
//
// Xếp "cùng sửa" lên trước vì đó là hành động mạnh hơn và là thứ người ta mở
// popover này để làm; link chỉ-đọc là tiện ích.
//
// Chủ chuyến mới mời/gỡ và bật/tắt link được. Người ĐƯỢC MỜI chỉ thấy danh sách
// và nút rời chuyến — nếu họ mời tiếp được thì chủ chuyến mất kiểm soát danh
// sách của chính mình.
//
// Ngoài popover còn một cụm AVATAR CHỒNG đứng cạnh nút, mở cùng popover đó
// (kiểu Docs/Figma): ai đang cùng sửa phải THẤY ĐƯỢC mà không cần bấm gì. Nó
// đọc thẳng từ props server nên hiện ngay, không chờ `listTripMembers`.
const FACES = 4;
const initial = (name: string | null) => (name?.trim().charAt(0) || "?").toUpperCase();

export function TripShare({
  tripId,
  title,
  shareId,
  shared,
  isOwner,
  people,
}: {
  tripId: string;
  title: string;
  shareId: string | null;
  shared: boolean;
  isOwner: boolean;
  /** Chủ chuyến + người đã tham gia. Một mình thì cụm avatar tự ẩn. */
  people: TripPerson[];
}) {
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(shared);
  const [id, setId] = useState(shareId);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  // Dựng sẵn từ props server để mở popover là THẤY NGAY — cùng nguồn với cụm
  // avatar bên ngoài. Vẫn gọi `listTripMembers` khi mở, nhưng chỉ để bổ sung
  // thứ `people` không có: email và các LỜI MỜI CÒN TREO (người chưa đăng nhập
  // lần nào nên chưa thành member).
  const [members, setMembers] = useState<TripMemberRow[]>(() =>
    people.map((p) => ({ ...p, email: null, pending: false })),
  );
  const [email, setEmail] = useState("");

  const url =
    on && id && typeof window !== "undefined"
      ? `${window.location.origin}/lich-trinh/s/${id}`
      : "";

  function loadMembers() {
    start(async () => {
      const res = await listTripMembers(tripId);
      if (res.ok) setMembers(res.data.members);
    });
  }

  function toggle(next: boolean) {
    start(async () => {
      const res = await setSharing(tripId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOn(next);
      if (res.data.shareId) setId(res.data.shareId);
      toast(next ? "Đã bật chia sẻ" : "Đã tắt chia sẻ — link cũ không xem được nữa");
    });
  }

  function invite(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    start(async () => {
      const res = await inviteToTrip(tripId, value);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEmail("");
      toast.success(
        res.data.pending
          ? `Đã mời ${value} — họ vào được ngay lần đầu đăng nhập bằng email này`
          : `Đã thêm ${value} vào lịch trình`,
      );
      loadMembers();
    });
  }

  function remove(row: TripMemberRow) {
    start(async () => {
      const res = await removeFromTrip(
        tripId,
        row.pending
          ? { kind: "invite", inviteId: row.id }
          : { kind: "member", userId: row.id },
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast(row.pending ? "Đã huỷ lời mời" : "Đã gỡ khỏi lịch trình");
      loadMembers();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const faces = people.slice(0, FACES);
  const overflow = people.length - faces.length;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) loadMembers();
      }}
    >
      <div className="flex items-center gap-2.5">
        {/* Chỉ hiện khi có người khác: một avatar của chính mình thì không nói
            lên điều gì, chỉ thêm một vật tròn cạnh nút. */}
        {people.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`${people.length} người cùng sửa lịch trình này`}
            className="flex shrink-0 items-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <AvatarGroup>
              {faces.map((p) => (
                <Avatar key={p.id} className="size-8">
                  {p.image && <AvatarImage src={p.image} alt={p.name ?? "Người cùng sửa"} />}
                  <AvatarFallback className="text-xs">{initial(p.name)}</AvatarFallback>
                </Avatar>
              ))}
              {overflow > 0 && <AvatarGroupCount>+{overflow > 99 ? "99" : overflow}</AvatarGroupCount>}
            </AvatarGroup>
          </button>
        )}

        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Chia sẻ ${title}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-4 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="size-4" aria-hidden />
            Chia sẻ
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent align="end" className="max-h-[min(80vh,34rem)] w-80 overflow-y-auto">
        {/* ── 1. Cùng sửa ──────────────────────────────────── */}
        <h3 className={cn(MICRO, "text-muted-foreground")}>Cùng chỉnh sửa</h3>

        {isOwner && (
          <form onSubmit={invite} className="mt-2 flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@gmail.com"
              aria-label="Email người muốn mời"
              className="h-9 rounded-lg"
            />
            {/* h-9 cho cả hai: Button size="sm" là h-8, đứng cạnh Input là lệch. */}
            <Button
              type="submit"
              variant="outline"
              disabled={pending || !email.trim()}
              className="h-9 shrink-0 rounded-lg px-3"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Mời
            </Button>
          </form>
        )}

        <ul className="mt-3 divide-y divide-border/60">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5 py-2">
                <Avatar className="size-7 shrink-0">
                  {m.image && <AvatarImage src={m.image} alt="" />}
                  <AvatarFallback className="text-[0.65rem]">
                    {initial(m.name ?? m.email)}
                  </AvatarFallback>
                </Avatar>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm leading-snug">
                    {m.name ?? m.email}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.isOwner
                      ? "Chủ chuyến"
                      : m.pending
                        ? "Chờ đăng nhập lần đầu"
                        : (m.email ?? "")}
                  </span>
                </span>

                {isOwner && !m.isOwner && (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    disabled={pending}
                    aria-label={`Gỡ ${m.name ?? m.email}`}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
        </ul>

        {!isOwner && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await leaveTrip(tripId);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast("Đã rời khỏi lịch trình");
                window.location.href = "/lich-trinh";
              })
            }
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-destructive underline-offset-2 hover:underline"
          >
            <LogOut className="size-3.5" aria-hidden />
            Rời khỏi lịch trình này
          </button>
        )}

        {/* ── 2. Link chỉ đọc ──────────────────────────────── */}
        <div className="mt-5 border-t pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={cn(MICRO, "text-muted-foreground")}>Ai có link</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Xem được, không sửa được, không cần tài khoản.
              </p>
            </div>
            {pending && !isOwner ? null : (
              <Switch
                checked={on}
                onCheckedChange={toggle}
                disabled={!isOwner || pending}
                aria-label="Bật chia sẻ bằng link"
              />
            )}
          </div>

          {on && url && (
            <>
              <div className="mt-3 flex justify-center rounded-xl border bg-white p-3">
                <QRCodeSVG value={url} size={132} marginSize={0} />
              </div>
              <button
                type="button"
                onClick={copy}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted"
              >
                {copied ? (
                  <Check className="size-4 text-primary" aria-hidden />
                ) : (
                  <Link2 className="size-4" aria-hidden />
                )}
                {copied ? "Đã sao chép!" : "Sao chép liên kết"}
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
