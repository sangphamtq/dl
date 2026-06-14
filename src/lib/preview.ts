import { auth } from "@/auth";

// Staff (admin/editor) được xem trước trang công khai của nội dung CHƯA xuất bản.
export async function isStaffViewer(): Promise<boolean> {
  const s = await auth();
  const r = s?.user?.role;
  return r === "admin" || r === "editor";
}
