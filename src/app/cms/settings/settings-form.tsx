"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/cms/form-section";
import { updateSettings, type SettingsInput } from "./actions";

export function SettingsForm({
  initial,
  canEdit,
}: {
  initial: SettingsInput;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<SettingsInput>(initial);

  function set<K extends keyof SettingsInput>(key: K, v: SettingsInput[K]) {
    setValues((p) => ({ ...p, [key]: v }));
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateSettings(values);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <fieldset disabled={!canEdit} className="divide-y">
        {/* Thông tin chung */}
        <FormSection
          title="Thông tin chung"
          description="Tên & mô tả site, dùng ở header, footer và thẻ SEO."
        >
          <div className="space-y-2">
            <Label htmlFor="siteName">Tên site</Label>
            <Input
              id="siteName"
              value={values.siteName}
              onChange={(e) => set("siteName", e.target.value)}
              placeholder="Hành Trình Việt"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={values.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Hỗ trợ thông tin du lịch Việt Nam."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả (SEO)</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm & chia sẻ."
              rows={3}
            />
          </div>
        </FormSection>

        {/* Liên hệ & mạng xã hội */}
        <FormSection
          title="Liên hệ & mạng xã hội"
          description="Hiển thị ở footer. Để trống nếu không dùng."
        >
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email liên hệ</Label>
            <Input
              id="contactEmail"
              type="email"
              value={values.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="lienhe@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook</Label>
            <Input
              id="facebookUrl"
              value={values.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              placeholder="https://facebook.com/…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input
              id="instagramUrl"
              value={values.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube</Label>
            <Input
              id="youtubeUrl"
              value={values.youtubeUrl}
              onChange={(e) => set("youtubeUrl", e.target.value)}
              placeholder="https://youtube.com/@…"
            />
          </div>
        </FormSection>
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-3 border-t bg-background/90 py-4 backdrop-blur">
          {saved && !pending && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              Đã lưu
            </span>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Lưu thay đổi
          </Button>
        </div>
      )}
    </form>
  );
}
