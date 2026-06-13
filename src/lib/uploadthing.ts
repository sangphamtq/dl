import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// Hook & helper type-safe, suy ra từ file router.
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
