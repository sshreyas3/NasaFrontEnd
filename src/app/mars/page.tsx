"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./mars.module.scss";
import L, {
  CircleMarker,
  FeatureGroup,
  LatLng,
  LatLngTuple,
  Layer,
  Map,
  Marker,
  Polygon,
  Polyline,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { v4 as uuidv4 } from "uuid";

// Fix for Leaflet marker icons in Next.js
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
});
L.Marker.prototype.options.icon = DefaultIcon;

// const API_BASE_URL = "https://nasaspaceappchallenge-ijnb.onrender.com";
const API_BASE_URL = "http://192.168.0.124:8000";
const USER_ID = 102; // Make dynamic if needed

type Label = {
  id: number;
  user_id: number;
  celestial_object: string;
  title: string;
  description: string;
  coordinates: number[];
  created_at: string;
  updated_at: string;
};

export default function MarsMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const labelLayerRef = useRef<FeatureGroup | null>(null);
  const questionLayerRef = useRef<FeatureGroup | null>(null);
  const searchMarkersLayerRef = useRef<FeatureGroup | null>(null);
  const [zoom, setZoom] = useState<number>(2);
  const [lat, setLat] = useState<number>(0);
  const [lon, setLon] = useState<number>(0);
  const [mousePos, setMousePos] = useState<string>("-");
  const [questionCount, setQuestionCount] = useState<number>(0);

  // Drawing states
  const [isDrawingLabel, setIsDrawingLabel] = useState(false);
  const [isDrawingQuestion, setIsDrawingQuestion] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentShape, setCurrentShape] = useState<Polygon | Polyline | null>(
    null
  );
  const [measureLine, setMeasureLine] = useState<Polyline | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [showDistanceDisplay, setShowDistanceDisplay] = useState(false);
  const [distanceValue, setDistanceValue] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [forumLayersVisible, setForumLayersVisible] = useState(true);

  // Form states
  const [labelTitle, setLabelTitle] = useState("");
  const [labelDescription, setLabelDescription] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [selectedLabelColor, setSelectedLabelColor] = useState("#ff6b6b");
  const [selectedQuestionColor, setSelectedQuestionColor] = useState("#ff6b6b");
  const [searchQuery, setSearchQuery] = useState("");

  // Labels from API
  const [labels, setLabels] = useState<Label[]>([]);

  // Questions (local only for now – can extend to API later)
  const [questions, setQuestions] = useState<Record<string, any>>({});

  const currentDrawHandlerRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 7,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
    });

    L.tileLayer(`http://localhost:8000/api/tiles/global/{z}/{x}/{y}.jpg`, {
      attribution: "© NASA Mars Viking MDIM21",
      noWrap: true,
      bounds: [
        [-90, -180],
        [90, 180],
      ],
    }).addTo(map);

    const labelLayer = new L.FeatureGroup();
    const questionLayer = new L.FeatureGroup();
    const searchMarkersLayer = new L.FeatureGroup();
    map.addLayer(labelLayer);
    map.addLayer(questionLayer);
    map.addLayer(searchMarkersLayer);

    labelLayerRef.current = labelLayer;
    questionLayerRef.current = questionLayer;
    searchMarkersLayerRef.current = searchMarkersLayer;

    mapInstance.current = map;

    const updateInfo = () => {
      const center = map.getCenter();
      setZoom(map.getZoom());
      setLat(center.lat);
      setLon(center.lng);
    };

    map.on("move", updateInfo);
    map.on("zoom", updateInfo);
    map.on("mousemove", (e) => {
      setMousePos(`${e.latlng.lat.toFixed(4)}°, ${e.latlng.lng.toFixed(4)}°`);
    });

    updateInfo();

    // Load labels
    loadLabels();

    return () => {
      map.remove();
    };
  }, []);

  // Status message auto-hide
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Load labels from API
  const loadLabels = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/labeget-labels/user_id/${USER_ID}?celestial_object=Mars`
      );
      const data = await res.json();
      setLabels(data.labels || []);

      if (labelLayerRef.current) {
        labelLayerRef.current.clearLayers();
        (data.labels || []).forEach((label: Label) => {
          const coords = [];
          for (let i = 0; i < label.coordinates.length; i += 2) {
            coords.push([
              label.coordinates[i],
              label.coordinates[i + 1],
            ] as LatLngTuple);
          }

          if (coords.length < 3) return;

          const polygon = L.polygon(coords, {
            color: "#ff6b6b",
            weight: 3,
            fillOpacity: 0.2,
            dashArray: "10,10",
          });

          const center = polygon.getBounds().getCenter();
          const marker = L.marker(center, {
            icon: L.divIcon({
              className: "",
              html: `<div style="background: #ff6b6b; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white;">🏷️ ${label.title}</div>`,
              iconSize: null,
            }),
          });

          polygon.bindPopup(`<b>${label.title}</b><br>${label.description}`);
          labelLayerRef.current?.addLayer(polygon);
          labelLayerRef.current?.addLayer(marker);
        });
      }
    } catch (err) {
      console.error("Failed to load labels", err);
      showStatus("❌ Failed to load labels", "error");
    }
  };

  const showStatus = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
  };

  const cancelCurrentDrawing = () => {
    if (currentDrawHandlerRef.current) {
      currentDrawHandlerRef.current.disable();
      currentDrawHandlerRef.current = null;
    }
    setIsDrawingLabel(false);
    setIsDrawingQuestion(false);
    setIsMeasuring(false);
    setCurrentShape(null);
    setShowLabelModal(false);
    setShowQuestionModal(false);
    setShowDistanceDisplay(false);
    if (measureLine) {
      mapInstance.current?.removeLayer(measureLine);
      setMeasureLine(null);
    }
  };

  const handleLabelClick = () => {
    if (isDrawingLabel) {
      cancelCurrentDrawing();
      return;
    }
    cancelCurrentDrawing();
    setIsDrawingLabel(true);
    const drawHandler = new (L as any).Draw.Polygon(mapInstance.current!, {
      shapeOptions: {
        color: selectedLabelColor,
        weight: 3,
        fillOpacity: 0.2,
        dashArray: "10,10",
      },
      allowIntersection: false,
      repeatMode: false,
    });
    drawHandler.enable();
    currentDrawHandlerRef.current = drawHandler;

    mapInstance.current!.once((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      setCurrentShape(layer);
      setShowLabelModal(true);
      setIsDrawingLabel(false);
      currentDrawHandlerRef.current = null;
    });
  };

  const handleQuestionClick = () => {
    if (isDrawingQuestion) {
      cancelCurrentDrawing();
      return;
    }
    cancelCurrentDrawing();
    setIsDrawingQuestion(true);
    const drawHandler = new (L as any).Draw.Polygon(mapInstance.current!, {
      shapeOptions: {
        color: selectedQuestionColor,
        weight: 3,
        fillOpacity: 0.3,
      },
      allowIntersection: false,
      repeatMode: false,
    });
    drawHandler.enable();
    currentDrawHandlerRef.current = drawHandler;

    mapInstance.current!.once((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      setCurrentShape(layer);
      setShowQuestionModal(true);
      setIsDrawingQuestion(false);
      currentDrawHandlerRef.current = null;
    });
  };

  const handleMeasureClick = () => {
    if (isMeasuring) {
      cancelCurrentDrawing();
      return;
    }
    cancelCurrentDrawing();
    setIsMeasuring(true);
    const drawHandler = new (L as any).Draw.Polyline(mapInstance.current!, {
      shapeOptions: {
        color: "#30cfd0",
        weight: 4,
        opacity: 0.8,
      },
      repeatMode: false,
    });
    drawHandler.enable();
    currentDrawHandlerRef.current = drawHandler;

    mapInstance.current!.once((L as any).Draw.Event.CREATED, (e: any) => {
      const line = e.layer as Polyline;
      const latlngs = line.getLatLngs() as LatLng[];
      const distance = calculateDistance(latlngs);
      line.bindPopup(`<b>Distance</b><br>${distance.toFixed(2)} km`);
      mapInstance.current?.addLayer(line);
      setDistanceValue(distance);
      setShowDistanceDisplay(true);
      setMeasureLine(line);
      setIsMeasuring(false);
      currentDrawHandlerRef.current = null;
    });
  };

  const calculateDistance = (latlngs: LatLng[]): number => {
    const R = 3389.5; // Mars radius in km
    let total = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
      const lat1 = (latlngs[i].lat * Math.PI) / 180;
      const lat2 = (latlngs[i + 1].lat * Math.PI) / 180;
      const dLat = ((latlngs[i + 1].lat - latlngs[i].lat) * Math.PI) / 180;
      const dLon = ((latlngs[i + 1].lng - latlngs[i].lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return total;
  };

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isNavigating) {
      const coords = searchQuery.split(",").map((s) => parseFloat(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        setIsNavigating(true);
        showStatus("✈️ Navigating to coordinates...");
        mapInstance.current?.flyTo([coords[0], coords[1]], 7, {
          duration: 3.5,
          easeLinearity: 0.15,
        });
        setTimeout(() => {
          const marker = L.circleMarker([coords[0], coords[1]], {
            radius: 10,
            fillColor: "#667eea",
            color: "white",
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(searchMarkersLayerRef.current!);
          marker
            .bindPopup(
              `<b>📍 Search Location</b><br>Lat: ${coords[0].toFixed(
                4
              )}°<br>Lon: ${coords[1].toFixed(4)}°`
            )
            .openPopup();
          setIsNavigating(false);
          showStatus("✅ Arrived!");
        }, 3500);
        setSearchQuery("");
      } else {
        showStatus("❌ Invalid coordinates", "error");
      }
    }
  };

  const clearSearch = () => {
    searchMarkersLayerRef.current?.clearLayers();
    showStatus("🗑️ Cleared search markers");
  };

  const analyseData = () => {};

  const toggleForumVisibility = () => {
    const visible = !forumLayersVisible;
    setForumLayersVisible(visible);
    questionLayerRef.current?.eachLayer((layer) => {
      if (visible) {
        (layer as any).setStyle({ opacity: 1, fillOpacity: 0.3 });
      } else {
        (layer as any).setStyle({ opacity: 0, fillOpacity: 0 });
      }
    });
    showStatus(visible ? "👁️ Q&A visible" : "🙈 Q&A hidden");
  };

  const submitLabel = async () => {
    if (!labelTitle.trim()) {
      showStatus("❌ Title required", "error");
      return;
    }
    if (!currentShape) return;

    const latlngs = (currentShape as Polygon).getLatLngs()[0] as LatLng[];
    const coordinates = latlngs.flatMap((ll) => [ll.lat, ll.lng]);

    const payload = {
      user_id: USER_ID,
      celestialObject: "Mars",
      title: labelTitle,
      description: labelDescription,
      coordinates,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/labels/add-labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        currentShape.setStyle({
          color: selectedLabelColor,
          fillColor: selectedLabelColor,
          fillOpacity: 0.2,
          weight: 3,
          dashArray: "10,10",
        });

        const center = currentShape.getBounds().getCenter();
        const marker = L.marker(center, {
          icon: L.divIcon({
            className: "",
            html: `<div style="background: ${selectedLabelColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white;">🏷️ ${labelTitle}</div>`,
            iconSize: null,
          }),
        });

        currentShape.bindPopup(`<b>${labelTitle}</b><br>${labelDescription}`);
        labelLayerRef.current?.addLayer(currentShape);
        labelLayerRef.current?.addLayer(marker);

        setLabelTitle("");
        setLabelDescription("");
        setShowLabelModal(false);
        setCurrentShape(null);
        loadLabels();
        showStatus("✅ Label added!");
      } else {
        showStatus("❌ Failed to save label", "error");
      }
    } catch (err) {
      console.error(err);
      showStatus("❌ Network error", "error");
    }
  };

  const submitQuestion = () => {
    if (!questionText.trim()) {
      showStatus("❌ Question required", "error");
      return;
    }
    if (!currentShape) return;

    currentShape.setStyle({
      color: selectedQuestionColor,
      fillColor: selectedQuestionColor,
      fillOpacity: 0.3,
      weight: 3,
    });

    const id = uuidv4();
    const qData = {
      id,
      question: questionText,
      color: selectedQuestionColor,
      coordinates: (currentShape as Polygon)
        .getLatLngs()[0]
        .map((ll: any) => [ll.lat, ll.lng]),
      answers: [],
      timestamp: new Date().toISOString(),
      layer: currentShape,
    };

    const popupContent = `
      <div class="${styles.questionHeader}">
        <div class="${
          styles.questionIcon
        }" style="background: ${selectedQuestionColor}">❓</div>
        <div style="flex:1">
          <div class="${styles.questionText}">${questionText}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5)">${new Date().toLocaleString()}</div>
        </div>
      </div>
      <button class="${
        styles.answerBtn
      }" onclick="window.expandQuestion('${id}')">📖 View Full Details & Answer</button>
    `;

    currentShape.bindPopup(popupContent, { maxWidth: 350 });
    questionLayerRef.current?.addLayer(currentShape);

    setQuestions((prev) => ({ ...prev, [id]: qData }));
    setQuestionCount((c) => c + 1);
    setShowQuestionModal(false);
    setQuestionText("");
    setCurrentShape(null);
    showStatus("✅ Question posted!");
  };

  // Expose expandQuestion globally for popup onclick
  useEffect(() => {
    (window as any).expandQuestion = (id: string) => {
      // In a real app, you'd render a proper panel – for now, just log
      alert(`Expand question ${id}`);
    };
    return () => {
      delete (window as any).expandQuestion;
    };
  }, [questions]);

  return (
    <div className={styles.container}>
      <div id="map" ref={mapRef} className={styles.map} />

      {/* Top Bar */}
      <div className={`${styles.topBar} ${styles.glass}`}>
        <div className={styles.searchContainer}>
          <span>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
            placeholder="Enter coordinates: lat, lon (e.g., -14.5, 175.4)"
          />
        </div>
        <button
          className={`${styles.btn} ${styles.btnToggle}`}
          onClick={toggleForumVisibility}
        >
          <span>👁️</span>
          <span>{forumLayersVisible ? "Toggle Q&A" : "Q&A Hidden"}</span>
        </button>
        <button
          className={`${styles.btn} ${styles.btnForum}`}
          onClick={handleQuestionClick}
        >
          <span>💬</span>
          <span>Ask Question</span>
        </button>
        <button
          className={`${styles.btn} ${styles.btnMeasure}`}
          onClick={handleMeasureClick}
        >
          <span>📏</span>
          <span>{isMeasuring ? "Drawing..." : "Measure"}</span>
        </button>
        <button
          className={`${styles.btn} ${styles.btnLabel}`}
          onClick={handleLabelClick}
        >
          <span>🏷️</span>
          <span>{isDrawingLabel ? "Drawing..." : "Add Label"}</span>
        </button>
        <button
          className={`${styles.btn} ${styles.clearBtn}`}
          onClick={clearSearch}
        >
          <span>🗑️</span>
          <span>Clear Search</span>
        </button>
        <button
          className={`${styles.btn} ${styles.clearBtn}`}
          onClick={clearSearch}
        >
          <span>🗑️</span>
          <span>Analyze</span>
        </button>
      </div>

      {/* Cancel Button */}
      {(isDrawingLabel || isDrawingQuestion || isMeasuring) && (
        <button
          className={`${styles.cancelBtn} ${styles.show}`}
          onClick={cancelCurrentDrawing}
        >
          <span>✕</span>
          <span>Cancel Drawing</span>
        </button>
      )}

      {/* Side Panel */}
      <div className={`${styles.sidePanel} ${styles.glass}`}>
        <h3>🔴 Mars Explorer</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Zoom</div>
            <div className={styles.infoValue}>{zoom.toFixed(2)}</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Latitude</div>
            <div className={styles.infoValue}>{lat.toFixed(2)}°</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Longitude</div>
            <div className={styles.infoValue}>{lon.toFixed(2)}°</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Questions</div>
            <div className={styles.infoValue}>{questionCount}</div>
          </div>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.infoCard} style={{ gridColumn: "1 / -1" }}>
          <div className={styles.infoLabel}>Mouse Position</div>
          <div className={styles.infoValue}>{mousePos}</div>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.infoCard} style={{ gridColumn: "1 / -1" }}>
          <div>hii</div>
        </div>
      </div>

      {/* Label Modal */}
      {showLabelModal && (
        <div className={`${styles.modalOverlay} ${styles.show}`}>
          <div className={styles.modal}>
            <h3>🏷️ Add Label</h3>
            <div className={styles.formGroup}>
              <label>Title</label>
              <input
                type="text"
                value={labelTitle}
                onChange={(e) => setLabelTitle(e.target.value)}
                placeholder="e.g., Olympus Mons"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={labelDescription}
                onChange={(e) => setLabelDescription(e.target.value)}
                placeholder="Describe this area..."
              />
            </div>
            <div className={styles.formGroup}>
              <label>Label Color</label>
              <div className={styles.colorPicker}>
                {[
                  "#ff6b6b",
                  "#4ecdc4",
                  "#45b7d1",
                  "#f9ca24",
                  "#6c5ce7",
                  "#fd79a8",
                ].map((color) => (
                  <div
                    key={color}
                    className={`${styles.colorOption} ${
                      selectedLabelColor === color ? styles.selected : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedLabelColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className={styles.modalButtons}>
              <button
                className={`${styles.modalBtn} ${styles.primary}`}
                onClick={submitLabel}
              >
                Add Label
              </button>
              <button
                className={`${styles.modalBtn} ${styles.secondary}`}
                onClick={() => setShowLabelModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className={`${styles.modalOverlay} ${styles.show}`}>
          <div className={styles.modal}>
            <h3>📍 Ask a Question</h3>
            <div className={styles.formGroup}>
              <label>Your Question</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What would you like to know about this area?"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Highlight Color</label>
              <div className={styles.colorPicker}>
                {[
                  "#ff6b6b",
                  "#4ecdc4",
                  "#45b7d1",
                  "#f9ca24",
                  "#6c5ce7",
                  "#fd79a8",
                ].map((color) => (
                  <div
                    key={color}
                    className={`${styles.colorOption} ${
                      selectedQuestionColor === color ? styles.selected : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedQuestionColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className={styles.modalButtons}>
              <button
                className={`${styles.modalBtn} ${styles.primary}`}
                onClick={submitQuestion}
              >
                Post Question
              </button>
              <button
                className={`${styles.modalBtn} ${styles.secondary}`}
                onClick={() => setShowQuestionModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distance Display */}
      {showDistanceDisplay && (
        <div className={`${styles.distanceDisplay} ${styles.show}`}>
          <div className={styles.distanceText}>
            <span>📏 Distance:</span>
            <span className={styles.distanceValue}>
              {distanceValue.toFixed(2)} km
            </span>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`${styles.statusMessage} ${styles.show} ${
            statusMessage.type === "error" ? styles.error : styles.success
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Expandable Question Panel (stub) */}
      {showQuestionPanel && (
        <div className={`${styles.questionPanel} ${styles.open}`}>
          <div className={styles.panelHeader}>
            <h2>❓ Question Details</h2>
            <button
              className={styles.panelClose}
              onClick={() => setShowQuestionPanel(false)}
            >
              ✕
            </button>
          </div>
          <div className={styles.panelContent}>
            <p>Question details would appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
