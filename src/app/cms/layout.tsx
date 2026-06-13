import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/cms/sidebar";

const STAFF = ["admin", "editor"];

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  // Phòng vệ tầng server (proxy đã chặn ở edge — đây là lớp 2).
  if (!user?.role || !STAFF.includes(user.role)) redirect("/");

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <span className="text-sm font-medium">Quản trị nội dung</span>
          <Badge variant="outline" className="ml-auto capitalize">
            {user.role}
          </Badge>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
