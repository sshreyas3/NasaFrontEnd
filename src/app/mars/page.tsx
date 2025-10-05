// src/app/mars/page.tsx
"use client";

import dynamic from "next/dynamic";
import styles from "./mars.module.scss";

const MarsMapContent = dynamic(() => import("./MarsMapContent"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading Mars map...</div>,
});

export default function MarsMapPage() {
  return <MarsMapContent />;
}
