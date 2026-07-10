"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  BadgeCheck,
  HelpCircle,
  ImagePlus,
  Loader2,
  Search,
  ShieldAlert,
  ShieldQuestion,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { TRUST_CHANNELS } from "@/lib/trust";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  checkTrust,
  submitScamReport,
  type CheckResult,
} from "./actions";

export function TrustChecker({ isAuthed }: { isAuthed: boolean }) {
  const [value, setValue] = useState("");
  const [channel, setChannel] = useState("auto");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);

  function run() {
    if (!value.trim()) return;
    setError(null);
    setReportOpen(false);
    startTransition(async () => {
      const res = await checkTrust(value, channel === "auto" ? undefined : channel);
      if (!res.ok) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Ô tra cứu */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Dán SĐT, link Facebook, website hoặc số tài khoản…"
              className="h-11 pl-10"
            />
          </div>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-11 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Tự nhận diện</SelectItem>
              {TRUST_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={pending} className="h-11">
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Kiểm tra"}
          </Button>
        </div>
        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {error}
          </p>
        )}
      </div>

      {/* Kết quả */}
      {result && (
        <ResultCard
          result={result}
          onReport={() => setReportOpen(true)}
          isAuthed={isAuthed}
        />
      )}

      {/* Lối vào báo cáo trực tiếp — không cần tra trước */}
      {!reportOpen && (
        <p className="text-center text-sm text-muted-foreground">
          Phát hiện một số/trang lừa đảo?{" "}
          {isAuthed ? (
            <button
              onClick={() => setReportOpen(true)}
              className="font-medium text-primary hover:underline"
            >
              Báo cáo ngay
            </button>
          ) : (
            <Link
              href="/login?callbackUrl=/kiem-tra"
              className="font-medium text-primary hover:underline"
            >
              Đăng nhập để báo cáo
            </Link>
          )}
        </p>
      )}

      {/* Form báo cáo (độc lập — có thể mở mà chưa tra) */}
      {reportOpen && (
        <ReportForm
          isAuthed={isAuthed}
          initialValue={value}
          initialChannel={channel === "auto" ? "" : channel}
          onDone={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

function ResultCard({
  result,
  onReport,
  isAuthed,
}: {
  result: CheckResult;
  onReport: () => void;
  isAuthed: boolean;
}) {
  const { verified, reportCount } = result;
  return (
    <div className="space-y-3">
      {verified && (
        <Verdict
          tone="ok"
          icon={BadgeCheck}
          title="Kênh đã xác minh"
          desc={
            <>
              Thuộc{" "}
              <Link href={verified.href} className="font-medium underline">
                {verified.name}
              </Link>{" "}
              — đã xác minh trên nền tảng.
            </>
          }
        />
      )}

      {reportCount > 0 && (
        <Verdict
          tone="err"
          icon={ShieldAlert}
          title={`Đã có ${reportCount} báo cáo lừa đảo`}
          desc="Nhiều người đã báo cáo kênh này. Hãy hết sức thận trọng, không chuyển cọc khi chưa chắc chắn."
        />
      )}

      {!verified && reportCount === 0 && (
        <Verdict
          tone="unknown"
          icon={ShieldQuestion}
          title="Chưa có dữ liệu"
          desc="Không tìm thấy trong danh bạ đã xác minh, cũng chưa có báo cáo. Đây KHÔNG phải bằng chứng an toàn — hãy tự đối chiếu kỹ."
        />
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <HelpCircle className="size-4 shrink-0" />
        <span>Bạn gặp kênh này lừa đảo?</span>
        {isAuthed ? (
          <button
            onClick={onReport}
            className="font-medium text-primary hover:underline"
          >
            Báo cáo (kèm bằng chứng)
          </button>
        ) : (
          <Link
            href="/login?callbackUrl=/kiem-tra"
            className="font-medium text-primary hover:underline"
          >
            Đăng nhập để báo cáo
          </Link>
        )}
      </div>
    </div>
  );
}

function Verdict({
  tone,
  icon: Icon,
  title,
  desc,
}: {
  tone: "ok" | "err" | "unknown";
  icon: React.ElementType;
  title: string;
  desc: React.ReactNode;
}) {
  const tones = {
    ok: "border-primary/30 bg-primary/5 text-primary",
    err: "border-destructive/30 bg-destructive/5 text-destructive",
    unknown: "border-warm/30 bg-warm/5 text-warm",
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

function ReportForm({
  isAuthed,
  initialValue,
  initialChannel,
  onDone,
}: {
  isAuthed: boolean;
  initialValue: string;
  initialChannel: string;
  onDone: () => void;
}) {
  const [channel, setChannel] = useState(initialChannel || "phone");
  const [value, setValue] = useState(initialValue);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const uploader = useUploadThing("communityImage", {
    onClientUploadComplete: (res) => {
      const got = res
        .map((r) => r.serverData?.url ?? r.ufsUrl)
        .filter(Boolean) as string[];
      setEvidenceUrls((prev) => [...prev, ...got].slice(0, 8));
    },
    onUploadError: (e) => setError(e.message),
  });

  if (!isAuthed) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitScamReport({
        channel,
        value,
        reason,
        description,
        evidenceUrls,
        reporterContact: contact,
      });
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  if (done)
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
        Đã gửi báo cáo. Cảm ơn bạn — chúng tôi sẽ kiểm duyệt trước khi hiển thị
        công khai.
      </div>
    );

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Báo cáo lừa đảo</h3>
        <button
          onClick={onDone}
          aria-label="Đóng"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Cần bằng chứng; nội dung sẽ được kiểm duyệt trước khi công khai.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-2">
          <Label>Loại kênh</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRUST_CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            Thông tin bị tố <span className="text-destructive">*</span>
          </Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="SĐT / link Facebook / website / số tài khoản"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Lý do ngắn</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="VD: Lừa cọc, page nhái…"
        />
      </div>
      <div className="space-y-2">
        <Label>Mô tả chi tiết</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Diễn biến sự việc…"
        />
      </div>
      <div className="space-y-2">
        <Label>Liên hệ của bạn (tuỳ chọn)</Label>
        <Input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Để chúng tôi liên hệ xác minh nếu cần"
        />
      </div>

      {/* Bằng chứng */}
      <div className="space-y-2">
        <Label>
          Ảnh bằng chứng <span className="text-destructive">*</span>
        </Label>
        {evidenceUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {evidenceUrls.map((u) => (
              <div
                key={u}
                className="relative size-16 overflow-hidden rounded-lg bg-muted"
              >
                <Image src={u} alt="Bằng chứng" fill sizes="64px" className="object-cover" />
                <button
                  onClick={() =>
                    setEvidenceUrls((prev) => prev.filter((x) => x !== u))
                  }
                  aria-label="Xoá"
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
            "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
            uploader.isUploading && "pointer-events-none opacity-60",
          )}
        >
          {uploader.isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Thêm ảnh
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) uploader.startUpload(Array.from(files));
            }}
          />
        </label>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <Button
        onClick={submit}
        disabled={pending || evidenceUrls.length === 0 || !value.trim()}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Gửi báo cáo
      </Button>
    </div>
  );
}
