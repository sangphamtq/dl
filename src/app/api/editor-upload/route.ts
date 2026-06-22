import { NextRequest } from "next/server";
import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";
import { rateLimit, ipKey } from "@/lib/rate-limit";

const STAFF = ["admin", "editor"];
const utapi = new UTApi();

// Nhận ảnh chèn trong trình soạn thảo (Tiptap) → tải lên UploadThing → trả URL.
export async function POST(req: NextRequest) {
  if (!rateLimit(ipKey(req, "upload"), 30))
    return Response.json({ error: "Quá nhiều yêu cầu." }, { status: 429 });

  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role))
    return Response.json({ error: "Không có quyền." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return Response.json({ error: "Không có tệp." }, { status: 400 });

  const [res] = await utapi.uploadFiles([file]);
  const url = res?.data?.ufsUrl;
  if (!url) return Response.json({ error: "Tải ảnh thất bại." }, { status: 500 });

  return Response.json({ url });
}
