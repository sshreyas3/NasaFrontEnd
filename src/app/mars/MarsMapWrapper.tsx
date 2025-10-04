// src/app/mars/MarsMapWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const MarsMapClient = dynamic(() => import("./MarsMapClient"), {
  ssr: false,
  loading: () => <div>Loading Mars map...</div>,
});

export default function MarsMapWrapper() {
  return (
    <Suspense fallback={<div>Loading Mars map...</div>}>
      <MarsMapClient />
    </Suspense>
  );
}
