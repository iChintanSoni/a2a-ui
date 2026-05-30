import { useEffect } from "react";
import { useRouteError, useNavigate } from "react-router-dom";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Muted, PageTitle } from "@/components/typography";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("Route failed", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-lg border">
        <AlertTriangleIcon className="text-destructive size-6" />
      </div>
      <div className="space-y-2">
        <PageTitle>Something went wrong</PageTitle>
        <Muted>
          The workbench hit an unexpected error. Your saved agents and chats are still stored
          locally.
        </Muted>
      </div>
      <Button onClick={() => navigate(0)} className="gap-2">
        <RefreshCwIcon className="size-4" />
        Try again
      </Button>
    </div>
  );
}
