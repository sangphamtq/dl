import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { getSettings } from "@/lib/settings";

export async function SiteFooter() {
  const s = await getSettings();

  const socials = [
    { href: s.facebookUrl, label: "Facebook" },
    { href: s.instagramUrl, label: "Instagram" },
    { href: s.youtubeUrl, label: "YouTube" },
  ].filter((x) => x.href);

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <Link href="/" className="flex w-fit items-center gap-2">
            <Image
              src="/logo_mark.png"
              alt=""
              width={31}
              height={36}
              className="h-8 w-auto"
            />
            <Image
              src="/logo_wordmark.png"
              alt={s.siteName}
              width={77}
              height={16}
              className="h-4 w-auto"
            />
          </Link>
          <p className="mt-3 max-w-sm">{s.tagline}</p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          {socials.length > 0 && (
            <div className="flex items-center gap-3">
              {socials.map(({ href, label }) => (
                <a
                  key={label}
                  href={href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </div>
          )}
          {s.contactEmail && (
            <a
              href={`mailto:${s.contactEmail}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="size-4" aria-hidden />
              {s.contactEmail}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
