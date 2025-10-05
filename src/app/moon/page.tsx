"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./moon.module.scss";
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

const API_BASE_URL = "https://nasaspaceappchallenge-ijnb.onrender.com";
const getUserId = (): number => {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("userId");
    return stored ? parseInt(stored, 10) : 1; // fallback to 1 if not logged in
  }
  return 1; // SSR fallback
};

// Use inside component or functions as needed // Make dynamic if needed

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

  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzeQuestion, setAnalyzeQuestion] = useState("");
  const [analyzedData, setAnalyzedData] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Labels from API
  const [labels, setLabels] = useState<Label[]>([]);

  const [currentPostId, setCurrentPostId] = useState<number | null>(null);
  const [postDetails, setPostDetails] = useState<{
    post: any;
    comments: any[];
  } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Questions (local only for now – can extend to API later)
  const [questions, setQuestions] = useState<Record<string, any>>({});

  const currentDrawHandlerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let resizeCleanup: (() => void) | null = null;

    // Wait for size
    const waitForSize = (): Promise<void> => {
      return new Promise((resolve) => {
        const check = () => {
          if (mapRef.current?.offsetWidth && mapRef.current?.offsetHeight) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    };

    waitForSize().then(() => {
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        crs: L.CRS.EPSG4326,
        center: [0, 0],
        zoom: 2,
        minZoom: 1,
        maxZoom: 7,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
        zoomAnimation: true,
        fadeAnimation: true,
        worldCopyJump: false,
        maxBounds: [
          [-90, -180],
          [90, 180],
        ],
        maxBoundsViscosity: 1.0,
      });

      const tileLayer = L.tileLayer(
        `${API_BASE_URL}/api/tiles/global/{z}/{x}/{y}.jpg`,
        {
          tms: false,
          attribution: "© NASA Mars Viking MDIM21",
          noWrap: true,
          bounds: [
            [-90, -180],
            [90, 180],
          ],
          updateWhenIdle: false,
          updateWhenZooming: true,
          keepBuffer: 4,
        }
      );

      tileLayer.addTo(map);

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

      // Resize handler
      const handleResize = () => map.invalidateSize();
      window.addEventListener("resize", handleResize);
      resizeCleanup = () => window.removeEventListener("resize", handleResize);

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
      loadLabels();
    });

    // Cleanup
    return () => {
      if (resizeCleanup) {
        resizeCleanup();
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
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
      const userId =
        typeof window !== "undefined"
          ? parseInt(sessionStorage.getItem("userId") || "1", 10)
          : 1;

      const res = await fetch(
        `${API_BASE_URL}/labels/get-labels/user_id/${userId}?celestial_object=Moon`
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

  const getTileCoordinates = (lat: number, lon: number, zoom: number) => {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
    );
    return { x, y };
  };

  const prefetchTiles = async (lat: number, lon: number, zoom: number) => {
    const tilesToFetch = [];
    const tileCoords = getTileCoordinates(lat, lon, zoom);

    // Fetch surrounding tiles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = tileCoords.x + dx;
        const y = tileCoords.y + dy;
        const url = `${API_BASE_URL}/api/tiles/global/${zoom}/${x}/${y}.jpg`;
        tilesToFetch.push(fetch(url).catch(() => {}));
      }
    }

    try {
      await Promise.all(tilesToFetch);
    } catch (error) {
      console.log("Tile prefetch completed with some errors");
    }
  };

  const handleSearchSubmit = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isNavigating) {
      const coords = searchQuery.split(",").map((s) => parseFloat(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        setIsNavigating(true);
        const targetZoom = 7;

        showStatus("⏳ Loading high-resolution tiles...");

        // Prefetch tiles for smoother navigation
        await prefetchTiles(coords[0], coords[1], targetZoom);

        showStatus("✈️ Navigating to coordinates...");
        mapInstance.current?.flyTo([coords[0], coords[1]], targetZoom, {
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
          showStatus("✅ Arrived at destination!");
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

  const analyseData = async () => {
    if (!analyzeQuestion.trim()) {
      showStatus("❌ Please enter a question", "error");
      return;
    }

    if (!mapInstance.current) return;

    const zoom = mapInstance.current.getZoom();
    const center = mapInstance.current.getCenter();

    // Convert lat/lng to tile coordinates (x, y) at current zoom
    const lat = center.lat;
    const lon = center.lng;
    const z = Math.floor(zoom);

    // Tile calculation for Web Mercator (EPSG:3857 style, but works for global grids)
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z));
    const y = Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, z)
    );

    setIsAnalyzing(true);
    setShowAnalyzeModal(false);
    setAnalyzedData(null);
    showStatus("🧠 Analyzing tile...");

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/analyze-tile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset: "global",
          z,
          x,
          y,
          question: analyzeQuestion,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = data.analysis || "No analysis available.";
      setAnalyzedData(result);
      showStatus("✅ Analysis complete!", "success");
    } catch (err) {
      console.error("Analysis failed:", err);
      showStatus("❌ Analysis failed", "error");
      setAnalyzedData("Error: Could not retrieve analysis.");
    } finally {
      setIsAnalyzing(false);
      setAnalyzeQuestion("");
    }
  };

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

    const userId =
      typeof window !== "undefined"
        ? parseInt(sessionStorage.getItem("userId") || "1", 10)
        : 1;

    const payload = {
      user_id: userId,
      celestialObject: "Moon",
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

  const submitQuestion = async () => {
    if (!questionText.trim()) {
      showStatus("❌ Question required", "error");
      return;
    }
    if (!currentShape) return;

    // Get user_id from sessionStorage
    const userIdStr =
      typeof window !== "undefined" ? sessionStorage.getItem("userId") : null;
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;

    if (!userId) {
      showStatus("❌ You must be logged in to post a question.", "error");
      return;
    }

    // Compute centroid as representative coordinate
    const bounds = currentShape.getBounds();
    const centroid = bounds.getCenter(); // LatLng object
    const coordinates = [centroid.lng, centroid.lat]; // [lon, lat] — matches your example [129.2, 212.9]

    // Optional: validate coordinates
    if (isNaN(centroid.lat) || isNaN(centroid.lng)) {
      showStatus("❌ Invalid area coordinates.", "error");
      return;
    }

    // Submit to forum API
    try {
      const forumPayload = {
        user_id: userId,
        title: questionText.substring(0, 100), // Optional: truncate if too long
        topic: "Moon",
        content: questionText,
        coordinates, // [lon, lat]
      };

      const res = await fetch(`${API_BASE_URL}/forum/create-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forumPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Forum post failed:", errorData);
        showStatus("❌ Failed to post question to forum.", "error");
        return;
      }

      // Success: style and display on map
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
      showStatus("✅ Question posted to forum!");
    } catch (err) {
      console.error("Network error posting question:", err);
      showStatus("❌ Network error. Could not post question.", "error");
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !currentPostId) return;

    const userIdStr =
      typeof window !== "undefined" ? sessionStorage.getItem("userId") : null;
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;

    if (!userId) {
      showStatus("❌ You must be logged in to comment.", "error");
      return;
    }

    setIsSubmittingComment(true);

    try {
      const payload = {
        post_id: currentPostId,
        user_id: userId,
        content: newComment.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/forum/add-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Optimistically add comment to UI
        const newCommentObj = {
          id: Date.now(), // temporary ID
          user_id: userId,
          content: newComment.trim(),
          created_at: new Date().toISOString(),
        };

        setPostDetails((prev) =>
          prev
            ? {
                ...prev,
                comments: [...prev.comments, newCommentObj],
              }
            : null
        );

        setNewComment("");
        showStatus("✅ Comment posted!");
      } else {
        showStatus("❌ Failed to post comment", "error");
      }
    } catch (err) {
      console.error("Comment submission error:", err);
      showStatus("❌ Network error", "error");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Expose expandQuestion globally for popup onclick
  useEffect(() => {
    (window as any).expandQuestion = async (postId: string) => {
      const id = parseInt(postId, 10);
      if (isNaN(id)) return;

      try {
        const res = await fetch(
          `${API_BASE_URL}/get-forum-thread?post_id=${id}`
        );
        if (!res.ok) throw new Error("Failed to load thread");
        const data = await res.json();
        setPostDetails({
          post: data.post,
          comments: data.comments || [],
        });
        setCurrentPostId(id);
        setShowQuestionPanel(true);
      } catch (err) {
        console.error("Failed to load forum thread", err);
        showStatus("❌ Could not load question details", "error");
      }
    };

    return () => {
      delete (window as any).expandQuestion;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div id="map" ref={mapRef} className={styles.map} />

      {/* Top Bar */}
      <div className={`${styles.topBar} ${styles.glass}`}>
        <div className={styles.searchContainer}>
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
          className={`${styles.btn} ${styles.btnAnalyze}`}
          onClick={() => setShowAnalyzeModal(true)}
        >
          <span>🧠</span>
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
          <div className={styles.infoLabel}>Analyzed Data</div>
          {isAnalyzing ? (
            <div className={styles.infoValue}>🧠 Analyzing...</div>
          ) : analyzedData ? (
            <div
              className={`${styles.infoValue} ${styles.analysisContent}`}
              dangerouslySetInnerHTML={{
                __html: analyzedData
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br />"),
              }}
            />
          ) : (
            <div className={styles.infoValue}>No analysis yet.</div>
          )}
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

      {/* Analyze Modal */}
      {showAnalyzeModal && (
        <div className={`${styles.modalOverlay} ${styles.show}`}>
          <div className={styles.modal}>
            <h3>🧠 Analyze Current Area</h3>
            <div className={styles.formGroup}>
              <label>Your Question</label>
              <textarea
                value={analyzeQuestion}
                onChange={(e) => setAnalyzeQuestion(e.target.value)}
                placeholder="e.g., What geological features are visible here?"
                rows={3}
              />
            </div>
            <div className={styles.modalButtons}>
              <button
                className={`${styles.modalBtn} ${styles.primary}`}
                onClick={analyseData}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Analyzing..." : "Ask AI"}
              </button>
              <button
                className={`${styles.modalBtn} ${styles.secondary}`}
                onClick={() => setShowAnalyzeModal(false)}
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
      {showQuestionPanel && postDetails && (
        <div className={`${styles.questionPanel} ${styles.open}`}>
          <div className={styles.panelHeader}>
            <h2>❓ Question Details</h2>
            <button
              className={styles.panelClose}
              onClick={() => {
                setShowQuestionPanel(false);
                setPostDetails(null);
                setCurrentPostId(null);
                setNewComment("");
              }}
            >
              ✕
            </button>
          </div>
          <div className={styles.panelContent}>
            {/* Question */}
            <div className={styles.forumPost}>
              <div className={styles.forumHeader}>
                <strong>{postDetails.post.title || "Untitled Question"}</strong>
                <div className={styles.forumMeta}>
                  By user {postDetails.post.user_id} •{" "}
                  {new Date(postDetails.post.created_at).toLocaleString()}
                </div>
              </div>
              <div className={styles.forumContent}>
                {postDetails.post.content}
              </div>
              {postDetails.post.coordinates && (
                <div className={styles.forumMeta} style={{ marginTop: "8px" }}>
                  📍 Coordinates: [{postDetails.post.coordinates.join(", ")}]
                </div>
              )}
            </div>

            <div className={styles.divider} style={{ margin: "16px 0" }}></div>

            {/* Comments */}
            <div className={styles.commentsSection}>
              <h3>💬 Comments ({postDetails.comments.length})</h3>
              {postDetails.comments.length === 0 ? (
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontStyle: "italic",
                  }}
                >
                  No comments yet. Be the first to reply!
                </p>
              ) : (
                postDetails.comments.map((comment: any) => (
                  <div key={comment.id} className={styles.forumComment}>
                    <div className={styles.commentHeader}>
                      <span>User {comment.user_id}</span>
                      <span
                        style={{
                          fontSize: "0.8em",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.commentContent}>
                      {comment.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <div className={styles.addCommentForm}>
              <h3>✏️ Add a Comment</h3>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your response..."
                className={styles.formInput}
                rows={3}
              />
              <button
                className={`${styles.modalBtn} ${styles.primary}`}
                onClick={submitComment}
                disabled={isSubmittingComment || !newComment.trim()}
              >
                {isSubmittingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
