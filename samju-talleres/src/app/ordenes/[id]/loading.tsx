import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

export default function OrdenDetalleLoading() {
  return (
    <main
      aria-label="Cargando detalle de orden"
      className="mx-auto flex max-w-7xl flex-col gap-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-36" />
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><Skeleton className="h-5 w-44" /></CardHeader>
            <CardContent>
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
          {Array.from({ length: 5 }, (_, index) => (
            <Card key={index}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-5">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent className="space-y-5">
                {Array.from({ length: 3 }, (_, item) => (
                  <div key={item} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
