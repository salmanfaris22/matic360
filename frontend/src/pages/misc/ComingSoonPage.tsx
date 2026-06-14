import { Hammer } from "lucide-react";
import { Card, CardContent, PageHeader } from "@/shared/ui";

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={`The ${title} module is part of the roadmap.`} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Hammer className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title} — coming soon</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              The backend already has the data model and migrations for this module. The UI and
              endpoints will be built on the same pattern as the Staff module.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
