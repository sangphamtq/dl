import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

const STAFF = ["admin", "editor"];

// File router cho ảnh. Mỗi endpoint kiểm quyền (staff) ở middleware, rồi tạo
// bản ghi Image gắn đúng owner trong onUploadComplete (chạy server-side).
export const ourFileRouter = {
  // Ảnh gắn vào một Place (tỉnh / điểm đến).
  placeImage: f({ image: { maxFileSize: "8MB", maxFileCount: 12 } })
    .input(z.object({ placeId: z.string().min(1) }))
    .middleware(async ({ input }) => {
      const session = await auth();
      const role = session?.user?.role;
      if (!role || !STAFF.includes(role))
        throw new UploadThingError("Không có quyền tải ảnh.");

      const place = await prisma.place.findUnique({
        where: { id: input.placeId },
        select: { id: true },
      });
      if (!place) throw new UploadThingError("Place không tồn tại.");

      return { placeId: input.placeId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Xếp ảnh mới xuống cuối gallery; ảnh đầu tiên của Place tự thành ảnh bìa.
      const [agg, count] = await Promise.all([
        prisma.image.aggregate({
          where: { placeId: metadata.placeId },
          _max: { order: true },
        }),
        prisma.image.count({ where: { placeId: metadata.placeId } }),
      ]);

      await prisma.image.create({
        data: {
          url: file.ufsUrl,
          alt: file.name,
          placeId: metadata.placeId,
          order: (agg._max.order ?? -1) + 1,
          isCover: count === 0,
        },
      });

      return { placeId: metadata.placeId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
