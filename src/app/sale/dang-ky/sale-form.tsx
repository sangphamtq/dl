"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  Clock,
  ImagePlus,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { SALE_SERVICES } from "@/lib/sale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { submitSaleProfile, type SaleFormInput } from "../actions";

type Status = "pending" | "approved" | "rejected" | null;

export function SaleRegisterForm({
  initial,
  status,
  slug,
  rejectReason,
  places,
}: {
  initial: Partial<SaleFormInput>;
  status: Status;
  slug: string | null;
  rejectReason: string | null;
  places: ComboboxOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [services, setServices] = useState<string[]>(initial.services ?? []);
  const [zalo, setZalo] = useState(initial.zalo ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(
    initial.evidenceUrls ?? [],
  );
  const [areaIds, setAreaIds] = useState<string[]>(initial.areaIds ?? []);
  const [areaPick, setAreaPick] = useState("");

  const labelOfPlace = (id: string) =>
    places.find((p) => p.value === id)?.label ?? id;

  const avatarUploader = useUploadThing("communityImage", {
    onClientUploadComplete: (res) => {
      const url = res[0]?.serverData?.url ?? res[0]?.ufsUrl;
      if (url) setAvatarUrl(url);
    },
    onUploadError: (e) => setError(e.message),
  });
  const evidenceUploader = useUploadThing("communityImage", {
    onClientUploadComplete: (res) => {
      const got = res
        .map((r) => r.serverData?.url ?? r.ufsUrl)
        .filter(Boolean) as string[];
      setEvidenceUrls((prev) => [...prev, ...got].slice(0, 8));
    },
    onUploadError: (e) => setError(e.message),
  });

  const toggleService = (v: string) =>
    setServices((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );

  const addArea = (id: string) => {
    if (id && !areaIds.includes(id)) setAreaIds((prev) => [...prev, id]);
    setAreaPick("");
  };

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitSaleProfile({
        displayName,
        bio,
        services,
        zalo,
        phone,
        facebookUrl,
        website,
        avatarUrl,
        evidenceUrls,
        areaIds,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Băng trạng thái */}
      {status === "approved" && (
        <StatusBanner
          icon={BadgeCheck}
          tone="ok"
          title="Hồ sơ đã được duyệt"
          desc={
            <>
              Bạn đã là CTV đã xác minh.{" "}
              {slug && (
                <Link href={`/sale/${slug}`} className="font-medium underline">
                  Xem trang cá nhân →
                </Link>
              )}
            </>
          }
        />
      )}
      {status === "pending" && (
        <StatusBanner
          icon={Clock}
          tone="wait"
          title="Hồ sơ đang chờ duyệt"
          desc="Chúng tôi sẽ xác minh và phản hồi sớm. Bạn có thể chỉnh sửa thông tin bên dưới."
        />
      )}
      {status === "rejected" && (
        <StatusBanner
          icon={AlertCircle}
          tone="err"
          title="Hồ sơ bị từ chối"
          desc={rejectReason ?? "Vui lòng bổ sung thông tin và gửi lại."}
        />
      )}
      {done && status === null && (
        <StatusBanner
          icon={Clock}
          tone="wait"
          title="Đã gửi đăng ký"
          desc="Hồ sơ của bạn đang chờ duyệt."
        />
      )}

      {/* Ảnh đại diện */}
      <div className="space-y-2">
        <Label>Ảnh đại diện</Label>
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt="Ảnh đại diện"
                fill
                sizes="64px"
                className="object-cover"
              />
            )}
          </div>
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
              avatarUploader.isUploading && "pointer-events-none opacity-60",
            )}
          >
            {avatarUploader.isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Tải ảnh
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) avatarUploader.startUpload([f]);
              }}
            />
          </label>
        </div>
      </div>

      <Field label="Tên hiển thị" required>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="VD: Minh — CTV tour Phan Thiết"
        />
      </Field>

      <Field label="Giới thiệu ngắn">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bạn bán dịch vụ gì, kinh nghiệm, thế mạnh…"
          rows={3}
        />
      </Field>

      {/* Dịch vụ */}
      <div className="space-y-2">
        <Label>Dịch vụ cung cấp</Label>
        <div className="flex flex-wrap gap-2">
          {SALE_SERVICES.map((s) => {
            const on = services.includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleService(s.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Khu vực phục vụ */}
      <div className="space-y-2">
        <Label>Khu vực phục vụ</Label>
        <Combobox
          options={places.filter((p) => !areaIds.includes(p.value))}
          value={areaPick}
          onChange={addArea}
          placeholder="Thêm tỉnh / điểm đến…"
          searchPlaceholder="Tìm nơi…"
        />
        {areaIds.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {areaIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
              >
                {labelOfPlace(id)}
                <button
                  type="button"
                  onClick={() =>
                    setAreaIds((prev) => prev.filter((x) => x !== id))
                  }
                  aria-label="Bỏ khu vực"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Kênh liên hệ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Zalo (SĐT hoặc link)">
          <Input value={zalo} onChange={(e) => setZalo(e.target.value)} />
        </Field>
        <Field label="Số điện thoại">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Facebook">
          <Input
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/…"
          />
        </Field>
        <Field label="Website">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
      </div>

      {/* Bằng chứng xác minh (nội bộ) */}
      <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <Label className="m-0">Ảnh xác minh (chỉ nội bộ)</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Ảnh giấy phép kinh doanh / CCCD / màn hình quản trị page… để chúng tôi
          xác minh. Chỉ đội duyệt xem, KHÔNG hiển thị công khai.
        </p>
        {evidenceUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {evidenceUrls.map((u) => (
              <div
                key={u}
                className="relative size-16 overflow-hidden rounded-lg bg-background"
              >
                <Image
                  src={u}
                  alt="Bằng chứng"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setEvidenceUrls((prev) => prev.filter((x) => x !== u))
                  }
                  aria-label="Xoá ảnh"
                  className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
            evidenceUploader.isUploading && "pointer-events-none opacity-60",
          )}
        >
          {evidenceUploader.isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Thêm ảnh xác minh
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) evidenceUploader.startUpload(Array.from(files));
            }}
          />
        </label>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {status ? "Lưu & gửi lại duyệt" : "Gửi đăng ký"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Gửi xong hồ sơ sẽ ở trạng thái <b>chờ duyệt</b>.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function StatusBanner({
  icon: Icon,
  tone,
  title,
  desc,
}: {
  icon: React.ElementType;
  tone: "ok" | "wait" | "err";
  title: string;
  desc: React.ReactNode;
}) {
  const tones = {
    ok: "border-primary/30 bg-primary/5 text-primary",
    wait: "border-warm/30 bg-warm/5 text-warm",
    err: "border-destructive/30 bg-destructive/5 text-destructive",
  } as const;
  return (
    <div className={cn("flex gap-3 rounded-2xl border p-4", tones[tone])}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-foreground/80">{desc}</p>
      </div>
    </div>
  );
}
