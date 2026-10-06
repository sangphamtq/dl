import Image from "next/image";
import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import { PlainProse } from "@/components/site/plain-prose";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";

/* Một cột LỀ TRÁI khổ 42rem. Mô tả gần như luôn ngắn (8/10 nơi có mô tả chỉ dài
   150–185 ký tự, đúng hai câu) nên đừng phóng cỡ chữ to thêm: câu mở đầu chỉ
   nhỉnh hơn phần thân một bậc — đủ để có thứ bậc mà không thổi to chỗ rỗng. */

export type IntroPost = {
  slug: string;
  title: string;
  image: string;
};

export function PlaceIntro({
  lede,
  body,
  post,
}: {
  lede: string | null;
  body: string | null;
  post: IntroPost | null;
}) {
  if (!lede && !body && !post) return null;

  return (
    <div className="max-w-[42rem]">
      {/* Không tách được câu mở đầu thì cả đoạn mô tả xuống làm phần thân —
          KHÔNG nâng nguyên đoạn lên cỡ chữ lớn, nó sẽ đè cả khối phía dưới. */}
      {lede && (
        <p className="text-pretty font-[family-name:var(--font-display)] text-[1.3rem] font-medium leading-[1.5] tracking-[-0.01em] text-foreground sm:text-[1.45rem]">
          {lede}
        </p>
      )}

      {body && (
        <PlainProse
          text={body}
          className={cn(
            "space-y-4 leading-8 text-muted-foreground",
            lede && "mt-5",
          )}
        />
      )}

      {post && (
        <Link
          href={`/blog/${post.slug}`}
          className="group mt-8 flex items-center gap-3"
        >
          <span
            className={cn(
              R_BADGE,
              "relative size-11 shrink-0 overflow-hidden bg-muted",
            )}
          >
            <Image
              src={post.image}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Bài giới thiệu
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 font-semibold leading-6 text-foreground transition-colors group-hover:text-primary">
              <span className="line-clamp-2">{post.title}</span>
              <Glyph
                name="forward"
                className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}
