// src/app/mars/page.tsx
"use client";

import dynamic from "next/dynamic";
import styles from "./mercury.module.scss";

const MercuryMapContent = dynamic(() => import("./MercuryMapContent"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading Mars map...</div>,
});

export default function MarsMapPage() {
  return <MercuryMapContent />;
}
