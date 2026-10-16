import Image from "next/image";

export interface GalleryPhoto {
  id: string;
  url: string;
  etapa: string;
  creado_en: string;
}

export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold text-ink">Fotografías de la orden</h2>
      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Esta orden no tiene fotografías.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure className="overflow-hidden rounded-xl border border-line bg-mist" key={photo.id}>
              {photo.url ? (
                <a className="relative block aspect-[4/3]" href={photo.url} rel="noreferrer" target="_blank">
                  <Image alt={`Vehículo, etapa ${photo.etapa}`} className="object-cover" fill sizes="(max-width: 640px) 50vw, 240px" src={photo.url} unoptimized />
                </a>
              ) : (
                <div className="grid aspect-[4/3] place-items-center text-xs text-muted">Foto temporalmente no disponible</div>
              )}
              <figcaption className="flex justify-between gap-2 px-3 py-2 text-xs text-muted">
                <span className="capitalize">{photo.etapa}</span>
                <time dateTime={photo.creado_en}>{new Date(photo.creado_en).toLocaleDateString("es-MX")}</time>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
