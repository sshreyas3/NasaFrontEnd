"use client";

import dynamic from "next/dynamic";
import styles from "./moon.module.scss";

const MoonMapContent = dynamic(() => import("./MoonMapContent"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading Mars map...</div>,
});

export default function MarsMapPage() {
  return <MoonMapContent />;
}
