// src/types/leaflet-draw.d.ts
import * as L from "leaflet";

declare module "leaflet" {
  namespace Draw {
    class Polygon {
      constructor(map: Map, options?: any);
      enable(): void;
      disable(): void;
    }
    // Add other draw tools if needed (Polyline, Rectangle, etc.)
  }

  interface Control {
    Draw: new (options?: any) => Control;
  }

  namespace DrawEvent {
    const CREATED: string;
    // Add other events if needed: EDITED, DELETED, etc.
  }
}
