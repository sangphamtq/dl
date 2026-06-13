import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Route handler GET/POST cho UploadThing.
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
