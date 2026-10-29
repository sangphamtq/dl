"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "@/components/icons";
import { Glyph } from "@/components/site/glyphs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchTripCandidates, type TripCandidate } from "@/app/(site)/lich-trinh/actions";

export type Venue = { kind: "eatery" | "accommodation"; id: string; name: string; image: string | null; context: string };

/**
 * Chọn một QUÁN / CHỖ Ở của site cho mục đặc biệt (bữa ăn, nhận / trả phòng). Ô trống ⇒ gợi ý ở điểm đến của chuyến.
 * ⚠️ KHÔNG chặn mục `inTrip`: nhận phòng rồi trả phòng cùng một chỗ ở là chuyện bình thường.
 */
export function VenuePicker({
  tripId,
  kind,
  value,
  onChange,
}: {
  tripId: string;
  kind: Venue["kind"];
  value: Venue | null;
  onChange: (v: Venue | null) => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<TripCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (value) return;
    const mine = ++seq.current;
    const t = setTimeout(
      async () => {
        setLoading(true);
        const res = await searchTripCandidates(tripId, q);
        if (mine !== seq.current) return;
        setLoading(false);
        setRows(res.ok ? res.data.items.filter((i) => i.kind === kind).slice(0, 6) : []);
      },
      q ? 220 : 0,
    );
    return () => clearTimeout(t);
  }, [q, tripId, kind, value]);

  if (value)
    return (
      <div className="flex items-center gap-3 rounded-[4px] border border-primary/40 bg-primary/5 p-2">
        <Pic image={value.image} kind={kind} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{value.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{value.context}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Bỏ chọn ${value.name}`}
          className="grid size-8 shrink-0 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Glyph name="close" className="size-4" />
        </button>
      </div>
    );

  return (
    <div className="grid gap-1.5">
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={kind === "eatery" ? "Tìm quán trên site…" : "Tìm chỗ ở trên site…"}
          className="h-10 rounded-[4px] pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
      {rows && rows.length > 0 && (
        <ul className="grid gap-0.5">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() =>
                  onChange({ kind, id: r.id, name: r.name, image: r.image, context: r.context })
                }
                className="flex w-full items-center gap-3 rounded-[4px] px-1.5 py-1.5 text-left transition-colors hover:bg-muted"
              >
                <Pic image={r.image} kind={kind} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.context}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length === 0 && !loading && (
        <p className="px-1.5 text-xs text-muted-foreground">
          {q ? "Không thấy trên site — gõ tên ở ô bên dưới." : "Chưa có gợi ý ở điểm đến này."}
        </p>
      )}
    </div>
  );
}

function Pic({ image, kind }: { image: string | null; kind: Venue["kind"] }) {
  return (
    <span className={cn("relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[3px] bg-muted")}>
      {image ? (
        <Image src={image} alt="" fill sizes="36px" className="object-cover" />
      ) : (
        <Glyph name={kind === "eatery" ? "bowl" : "bed"} className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
