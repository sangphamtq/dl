"use client";

import { useRef, useState } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseLatLng, isShortMapUrl } from "@/lib/map-url";
import { resolveMapLink } from "@/lib/map-actions";

// Ô "Link Google Maps": dán link là tự tách & điền Vĩ độ/Kinh độ (onPick).
// - Link đầy đủ (có @lat,lng hoặc !3d!4d) → tách ngay tại client.
// - Link rút gọn (maps.app.goo.gl…) → gọi server giải redirect rồi tách.
// Dùng controlled (value/onValueChange) khi muốn lưu link (vd field mapUrl),
// hoặc uncontrolled (chỉ onPick) khi chỉ cần lấy toạ độ.
export function MapLinkField({
  value,
  onValueChange,
  onPick,
  label = "Link Google Maps",
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  onPick: (lat: string, lng: string) => void;
  label?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState("");
  const v = controlled ? value : internal;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const ref = useRef<HTMLInputElement>(null);

  const setVal = (next: string) =>
    controlled ? onValueChange?.(next) : setInternal(next);

  const fill = (lat: number, lng: number) => {
    onPick(String(lat), String(lng));
    setStatus({ ok: true, msg: `Đã lấy toạ độ: ${lat}, ${lng}` });
  };

  const extract = async (raw: string) => {
    const url = raw.trim();
    if (!url) {
      setStatus(null);
      return;
    }
    const direct = parseLatLng(url);
    if (direct) {
      fill(direct.lat, direct.lng);
      return;
    }
    if (isShortMapUrl(url)) {
      setBusy(true);
      setStatus(null);
      const r = await resolveMapLink(url);
      setBusy(false);
      if (r) fill(r.lat, r.lng);
      else
        setStatus({
          ok: false,
          msg: "Không đọc được toạ độ. Hãy mở link rồi dán link đầy đủ (có @lat,lng).",
        });
      return;
    }
    setStatus({ ok: false, msg: "Chưa thấy toạ độ trong link này." });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="mapLink">{label}</Label>
      <div className="relative">
        <Input
          id="mapLink"
          ref={ref}
          value={v}
          onChange={(e) => {
            setVal(e.target.value);
            setStatus(null);
          }}
          onBlur={(e) => extract(e.target.value)}
          onPaste={() => setTimeout(() => extract(ref.current?.value ?? ""), 0)}
          placeholder="Dán link maps.google.com hoặc maps.app.goo.gl…"
          className={cn(busy && "pr-9")}
        />
        {busy && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {status ? (
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs",
            status.ok ? "text-primary" : "text-amber-600",
          )}
        >
          {status.ok ? (
            <Check className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          )}
          {status.msg}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Dán link là tự điền Vĩ độ/Kinh độ bên dưới (hỗ trợ cả link rút gọn).
        </p>
      )}
    </div>
  );
}
