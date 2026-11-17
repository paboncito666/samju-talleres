"use client";

import Image from "next/image";
import { CarFront, Expand, X } from "lucide-react";
import { useRef } from "react";

export function VehiclePhotoPreview({
  className,
  photoUrl,
  vehicleName,
}: {
  className: string;
  photoUrl: string | null;
  vehicleName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!photoUrl) {
    return (
      <span className={`grid shrink-0 place-items-center bg-mist text-ink ${className}`}>
        <CarFront aria-hidden="true" className="size-5" />
      </span>
    );
  }

  return (
    <>
      <button
        aria-label={`Ampliar foto de ${vehicleName}`}
        className={`group relative block shrink-0 overflow-hidden bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${className}`}
        onClick={() => dialogRef.current?.showModal()}
        title={`Ampliar foto de ${vehicleName}`}
        type="button"
      >
        <Image
          alt={`Foto de ${vehicleName}`}
          className="object-cover"
          fill
          sizes="(max-width: 640px) 64px, 96px"
          src={photoUrl}
          unoptimized
        />
        <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Expand aria-hidden="true" className="size-5 drop-shadow" />
        </span>
      </button>
      <dialog
        aria-label={`Foto de ${vehicleName}`}
        className="fixed inset-0 m-0 h-dvh w-screen max-h-none max-w-none border-0 bg-black/95 p-0 text-white backdrop:bg-black/80"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialogRef.current?.close();
          }
        }}
        ref={dialogRef}
      >
        <div className="relative h-full w-full">
          <Image
            alt={`Foto ampliada de ${vehicleName}`}
            className="object-contain"
            fill
            sizes="100vw"
            src={photoUrl}
            unoptimized
          />
          <button
            aria-label="Cerrar foto"
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-5 pt-12 text-center text-sm font-medium">
            {vehicleName}
          </p>
        </div>
      </dialog>
    </>
  );
}
