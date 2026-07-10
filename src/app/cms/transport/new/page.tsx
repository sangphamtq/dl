import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { TransportForm } from "../transport-form";
import { getPlaceOptions } from "../options";

export default async function NewTransportPage() {
  const places = await getPlaceOptions();

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/transport"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Di chuyển
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Tạo cách di chuyển
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Một cách đến nơi hoặc đi lại tại chỗ.
      </p>

      <div className="mt-4">
        <TransportForm mode="create" places={places} />
      </div>
    </div>
  );
}
