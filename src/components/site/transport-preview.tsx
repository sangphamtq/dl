import Image from "next/image";
import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import { R_CARD } from "@/lib/radius";
import { prepareArticle, readingMinutes } from "@/lib/toc";
import { cn } from "@/lib/utils";

const MAX_SECTIONS = 6;

export function TransportPreview({
  href,
  title,
  excerpt,
  content,
  cover,
}: {
  /** Tab Di chuyển — nơi bài được render; mục lục nối `#id` vào đây. */
  href: string;
  title: string;
  excerpt: string | null;
  content: string;
  /** Chỉ ảnh bìa THẬT của bài; không có thì bỏ hẳn cột ảnh. */
  cover: string | null;
}) {
  const { html, toc } = prepareArticle(content);
  const h2 = toc.filter((t) => t.level === 2);
  const all = h2.length > 0 ? h2 : toc;
  const sections = all.slice(0, MAX_SECTIONS);
  const more = all.length - sections.length;
  const minutes = readingMinutes(html);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-7",
        cover && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14",
      )}
    >
      {cover && (
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            R_CARD,
            // Từ lg ảnh cao ĐÚNG bằng cột chữ (grid stretch) — khai tỉ lệ cố định thì
            // bài ít phần sẽ để lại khoảng trống chết bên trái.
            "relative block aspect-[3/2] overflow-hidden bg-muted lg:order-last lg:aspect-auto lg:min-h-72",
          )}
        >
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 416px, 100vw"
            className="object-cover"
          />
        </Link>
      )}

      <div className="max-w-[42rem]">
        <p className="text-pretty font-[family-name:var(--font-display)] text-[1.2rem] font-medium leading-[1.55] text-foreground sm:text-[1.3rem]">
          {excerpt ?? title}
        </p>

        {sections.length > 0 && (
          <>
            <ol className="mt-7 border-t border-border">
              {sections.map((s, i) => (
                <li key={s.id} className="border-b border-border">
                  <Link
                    href={`${href}#${s.id}`}
                    className="group flex items-center gap-4 py-3.5"
                  >
                    <span className="w-6 shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums leading-none text-muted-foreground transition-colors group-hover:text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 font-medium leading-6 text-foreground transition-colors group-hover:text-primary">
                      {s.text}
                    </span>
                    <Glyph
                      name="forward"
                      className="size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}

        <Link
          href={href}
          className={cn(
            "group flex items-center gap-4 py-4",
            sections.length === 0 && "mt-5 border-y border-border",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {more > 0 ? `Đọc đủ ${all.length} phần` : "Đọc hướng dẫn đầy đủ"}
            </span>
            <span className="text-sm text-muted-foreground">
              <b className="font-semibold text-foreground">{minutes}</b> phút đọc
            </span>
          </span>
          <Glyph
            name="forward"
            className="size-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none"
          />
        </Link>
      </div>
    </div>
  );
}
