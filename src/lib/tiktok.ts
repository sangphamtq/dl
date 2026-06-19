// Lấy metadata video TikTok qua oEmbed công khai (không cần API key).
// Chỉ cần video ID — username trong URL có thể là placeholder, TikTok tự
// resolve theo ID. Trả thumbnail/title/author; cache 1 ngày (revalidate).

type TikTokOembed = {
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
};

export type TikTokInfo = {
  thumbnail: string | null;
  title: string | null;
  author: string | null;
};

const EMPTY: TikTokInfo = { thumbnail: null, title: null, author: null };

// Lấy videoId TikTok từ URL (…/video/<id>, vt.tiktok.com/…) hoặc chuỗi ID thuần.
// Trả null nếu không nhận ra.
export function parseTikTokId(input: string): string | null {
  const s = input.trim();
  if (/^\d{6,}$/.test(s)) return s; // đã là ID
  const m = s.match(/\/video\/(\d+)/) ?? s.match(/(\d{6,})/);
  return m ? m[1] : null;
}

export async function getTikTokInfo(id: string): Promise<TikTokInfo> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@i/video/${id}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as TikTokOembed;
    return {
      thumbnail: data.thumbnail_url ?? null,
      title: data.title ?? null,
      author: data.author_name ?? null,
    };
  } catch {
    return EMPTY;
  }
}
