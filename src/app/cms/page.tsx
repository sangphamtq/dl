import Link from "next/link";
import { MapPin, Compass, Newspaper, Users, ArrowRight } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CmsDashboard() {
  const [
    places,
    posts,
    users,
    activities,
    spots,
    specialties,
    eateries,
    accommodations,
    transports,
  ] = await Promise.all([
    prisma.place.count(),
    prisma.post.count(),
    prisma.user.count(),
    prisma.activity.count(),
    prisma.spot.count(),
    prisma.specialty.count(),
    prisma.eatery.count(),
    prisma.accommodation.count(),
    prisma.transport.count(),
  ]);

  const listings =
    activities + spots + specialties + eateries + accommodations + transports;

  const stats = [
    { label: "Tỉnh & Điểm đến", value: places, icon: MapPin, href: "/cms/places" },
    { label: "Listing", value: listings, icon: Compass, href: "/cms/activities" },
    { label: "Bài viết", value: posts, icon: Newspaper, href: "/cms/posts" },
    { label: "Người dùng", value: users, icon: Users, href: "/cms/users" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Số liệu nội dung hiện tại trong hệ thống.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {value}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  Quản lý <ArrowRight className="size-3" aria-hidden />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Chọn một mục ở thanh bên để quản lý nội dung. Các mục chưa hoàn thiện sẽ
        hiển thị trang trống.
      </p>
    </div>
  );
}
