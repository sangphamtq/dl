"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revalidateSite } from "./actions";

export function RevalidateButton() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onClick() {
    setDone(false);
    startTransition(async () => {
      const res = await revalidateSite();
      if (res.ok) setDone(true);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {done && !pending ? (
        <Check className="size-4 text-primary" />
      ) : (
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      )}
      {done && !pending ? "Đã làm mới" : "Làm mới cache"}
    </Button>
  );
}
