import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { OWNER_FK } from "@/lib/owner";

const f = createUploadthing();

const STAFF = ["admin", "editor"];

export const ourFileRouter = {
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

  listingImage: f({ image: { maxFileSize: "8MB", maxFileCount: 12 } })
    .input(
      z.object({
        ownerType: z.enum([
          "place",
          "activity",
          "spot",
          "specialty",
          "eatery",
          "accommodation",
          "transport",
          "post",
          "trip",
        ]),
        ownerId: z.string().min(1),
        kind: z.enum(["gallery", "menu"]).default("gallery"),
      }),
    )
    .middleware(async ({ input }) => {
      const session = await auth();
      const role = session?.user?.role;
      if (!role || !STAFF.includes(role))
        throw new UploadThingError("Không có quyền tải ảnh.");

      const model = prisma[input.ownerType] as {
        findUnique: (a: unknown) => Promise<{ id: string } | null>;
      };
      const exists = await model.findUnique({
        where: { id: input.ownerId },
        select: { id: true },
      });
      if (!exists) throw new UploadThingError("Đối tượng không tồn tại.");

      return {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        kind: input.kind,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fk = OWNER_FK[metadata.ownerType];
      const where = { [fk]: metadata.ownerId, kind: metadata.kind };
      const [agg, count] = await Promise.all([
        prisma.image.aggregate({ where, _max: { order: true } }),
        prisma.image.count({ where }),
      ]);

      await prisma.image.create({
        data: {
          url: file.ufsUrl,
          alt: file.name,
          order: (agg._max.order ?? -1) + 1,
          // BẤT BIẾN: ảnh thực đơn không bao giờ là ảnh bìa.
          isCover: metadata.kind === "gallery" && count === 0,
          kind: metadata.kind,
          [fk]: metadata.ownerId,
        } as Prisma.ImageUncheckedCreateInput,
      });

      return { ok: true };
    }),

  // Ảnh cho bài cộng đồng (UGC) — bất kỳ user đã đăng nhập. KHÔNG tạo Image ở
  // đây (bài chưa tồn tại lúc upload); trả URL về client để gắn khi tạo bài.
  communityImage: f({ image: { maxFileSize: "8MB", maxFileCount: 6 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id)
        throw new UploadThingError("Bạn cần đăng nhập để tải ảnh.");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
