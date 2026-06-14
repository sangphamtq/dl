import { NextRequest } from "next/server";
import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";

const STAFF = ["admin", "editor"];
const utapi = new UTApi();

// Nhận ảnh chèn trong trình soạn thảo Jodit → tải lên UploadThing → trả về URL
// theo định dạng Jodit hiểu (data.files = mảng URL, baseurl rỗng).
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) {
    return Response.json(
      { success: false, data: { messages: ["Không có quyền."] } },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const files = [...form.values()].filter(
    (v): v is File => v instanceof File,
  );
  if (files.length === 0) {
    return Response.json({
      success: false,
      data: { messages: ["Không có tệp."] },
    });
  }

  const results = await utapi.uploadFiles(files);
  const urls = results
    .map((r) => r.data?.ufsUrl)
    .filter((u): u is string => Boolean(u));

  if (urls.length === 0) {
    return Response.json({
      success: false,
      data: { messages: ["Tải ảnh thất bại."] },
    });
  }

  return Response.json({
    success: true,
    time: "",
    data: {
      baseurl: "",
      messages: [],
      files: urls,
      isImages: urls.map(() => true),
      code: 220,
    },
  });
}
