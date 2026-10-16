import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <main
      aria-label="Cargando dashboard"
      className="mx-auto flex max-w-7xl flex-col gap-8"
    >
      <header className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Card
            key={index}
            className={index === 2 ? "xl:col-span-2" : undefined}
          >
            <CardHeader>
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
