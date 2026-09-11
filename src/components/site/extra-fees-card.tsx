import { Wallet } from "@/components/icons";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { feePriceLabel, type ExtraFee } from "@/lib/tickets";

export function ExtraFeesCard({
  fees,
  context = "spot",
  className,
}: {
  fees: ExtraFee[];
  context?: "spot" | "activity";
  className?: string;
}) {
  if (fees.length === 0) return null;
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5",
        className,
      )}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Wallet className="size-4 text-muted-foreground" aria-hidden />
        Chi phí khác tại chỗ
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {context === "activity"
          ? "Ngoài giá tham gia — trả trực tiếp tại chỗ, giá có thể đổi."
          : "Ngoài vé vào cửa — trả trực tiếp tại chỗ, giá có thể đổi."}
      </p>
      <dl className="mt-4 space-y-3.5">
        {fees.map((f, i) => {
          const { price, unit } = feePriceLabel(f);
          return (
            <div key={i}>
              <dt className="text-sm font-medium">
                {f.label}
                {f.required && (
                  <span
                    className={cn(
                      "ml-2 inline-block whitespace-nowrap bg-warm/10 px-1.5 py-0.5 align-middle text-[0.7rem] font-medium text-warm-ink",
                      R_BADGE,
                    )}
                  >
                    bắt buộc
                  </span>
                )}
              </dt>
              <dd className="mt-0.5 text-sm">
                <span className="font-semibold tabular-nums">{price}</span>
                {unit && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {unit}
                  </span>
                )}
              </dd>
              {f.note && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {f.note}
                </p>
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
