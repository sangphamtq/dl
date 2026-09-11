import { getSettings } from "@/lib/settings";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FooterGate } from "@/components/site/footer-gate";
import { TripDock } from "@/components/trip/trip-dock";
import { getTripBag } from "@/app/(site)/lich-trinh/actions";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ heroLayout }, tripBag] = await Promise.all([getSettings(), getTripBag()]);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader heroLayout={heroLayout} />
      {children}
      <FooterGate>
        <SiteFooter />
      </FooterGate>
      <TripDock initial={tripBag} />
    </div>
  );
}
