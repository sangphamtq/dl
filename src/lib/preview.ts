import { auth } from "@/auth";

export async function isStaffViewer(): Promise<boolean> {
  const s = await auth();
  const r = s?.user?.role;
  return r === "admin" || r === "editor";
}
