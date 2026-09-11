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

export function parseTikTokId(input: string): string | null {
  const s = input.trim();
  if (/^\d{6,}$/.test(s)) return s;
  const m = s.match(/\/video\/(\d+)/) ?? s.match(/(\d{6,})/);
  return m ? m[1] : null;
}

// Player chính thức của TikTok (nhẹ hơn embed blockquote). Tắt mô tả/gợi ý
// video lạ, giữ phụ đề + thanh điều khiển. KHÔNG autoplay: trình duyệt ép tắt
// tiếng video tự phát — để user bấm play trong player thì mới có âm thanh.
// Để ở module SERVER-SAFE (không "use client") để Server Component dùng được:
// hằng export từ file "use client" sẽ thành client reference, không phải chuỗi.
const PLAYER_BASE = "https://www.tiktok.com/player/v1";
const PLAYER_PARAMS =
  "music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=1&controls=1";

export function tiktokPlayerSrc(id: string): string {
  return `${PLAYER_BASE}/${id}?${PLAYER_PARAMS}`;
}

export function tiktokSearchUrl(placeName: string): string {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(`du lịch ${placeName}`)}`;
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
