import { Card, CardContent, Skeleton } from "@/components/ui";

export default function VehiculosLoading() {
  return (
    <main
      aria-label="Cargando órdenes"
      className="mx-auto flex max-w-7xl flex-col gap-6"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </header>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
        <div className="grid grid-cols-7 gap-4 bg-surface-muted p-4">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div
            key={row}
            className="grid grid-cols-7 gap-4 border-t border-line p-4"
          >
            {Array.from({ length: 7 }, (_, column) => (
              <Skeleton key={column} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-4">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
