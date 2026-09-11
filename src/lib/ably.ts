import "server-only";
import * as Ably from "ably";

let rest: Ably.Rest | null = null;

export function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  rest ??= new Ably.Rest(key);
  return rest;
}

export const ablyEnabled = () => !!process.env.ABLY_API_KEY;

const postChannel = (slug: string) => `post:${slug}`;
export const threadChannel = (slug: string) => `thread:${slug}`;
export const communityChannel = () => `cong-dong`;
export const placeFeedChannel = (slug: string) => `place-feed:${slug}`;
export const spotFeedChannel = (slug: string) => `spot-feed:${slug}`;
export const userChannel = (userId: string) => `user:${userId}`;

export async function publishEvent(
  channel: string,
  event: string,
  data: object = {},
): Promise<void> {
  const client = getAblyRest();
  if (!client) return;
  try {
    await client.channels.get(channel).publish(event, data);
  } catch (e) {
    console.error("[Ably] publish thất bại:", e);
  }
}

export async function publishCommentsChanged(slug: string): Promise<void> {
  await publishEvent(postChannel(slug), "comments:changed");
}
