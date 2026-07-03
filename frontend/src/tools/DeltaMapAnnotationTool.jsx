import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text, Transformer, Group } from 'react-konva';

// ─── Constants ───
const STORAGE_KEY = 'delta_annotation_autosave';

const TYPE_COLORS = {
  room: '#4A90D9',
  stairs: '#E67E22',
  restroom: '#9B59B6',
  corridor: '#95A5A6',
  courtyard: '#2ECC71',
  door: '#E74C3C',
  library: '#F39C12',
  utility: '#7F8C8D',
  startup: '#1ABC9C',
  wall: '#34495E',
  entrance: '#2980B9',
  icpdp: '#16A085',
  default: '#BDC3C7',
};

const FLOOR_IMAGES = {
  1: '/mapping/floor1.png',
  2: '/mapping/floor2.png',
  3: '/mapping/floor3.png',
  4: '/mapping/floor4.png',
};

const FLOOR_LABELS = { 1: 'Tầng 1', 2: 'Tầng 2', 3: 'Tầng 3', 4: 'Tầng 4' };

// ??? items are intentional mapped labels — not suspect
// tường items are structural walls — not suspect
const SUSPECT_NAMES = new Set([]);

function isSuspect(item) {
  // Respect explicit flag if present
  if (item.suspect_flag !== undefined) return item.suspect_flag;
  // Use review_status metadata
  if (item.review_status === 'structural_reference') return false;
  // Confidence-based fallback
  return item.confidence === 'needs_review';
}

function getDuplicateLabel(item, allItems) {
  const sameFloor = allItems.filter(
    (i) => i.floor === item.floor && i.display_name === item.display_name && i.item_id !== item.item_id
  );
  if (sameFloor.length === 0) return null;
  const cols = item.source_cols || [];
  const otherCols = sameFloor.flatMap((i) => i.source_cols || []);
  const minCol = Math.min(...cols, Infinity);
  const otherMin = Math.min(...otherCols, Infinity);
  if (minCol < otherMin) return '(trái)';
  if (minCol > otherMin) return '(phải)';
  const minRow = Math.min(...(item.source_rows || []), Infinity);
  const otherMinRow = Math.min(...sameFloor.flatMap((i) => i.source_rows || []), Infinity);
  return minRow < otherMinRow ? '(trên)' : '(dưới)';
}

// ─── localStorage helpers ───
function loadAutosave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* ignore corrupt data */ }
  return null;
}

function saveAutosave(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded, ignore */ }
}

function clearAutosaveStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// ─── Component ───
export default function DeltaMapAnnotationTool() {
  // Data state
  const [allItems, setAllItems] = useState([]);
  const [annotations, setAnnotations] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // UI state
  const [currentFloor, setCurrentFloor] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [mode, setMode] = useState('rectangle');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Image state
  const [imageObj, setImageObj] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Konva refs
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const containerRef = useRef(null);

  // Export state
  const [showExport, setShowExport] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  // ─── Load data + restore autosave ───
  useEffect(() => {
    setLoading(true);
    fetch('/data/delta_manual_measurements_draft.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setAllItems(data);
        // Try to restore from localStorage first
        const saved = loadAutosave();
        if (saved && saved.annotations) {
          setAnnotations(saved.annotations);
          if (saved.currentFloor) setCurrentFloor(saved.currentFloor);
        } else {
          // Fallback: load from data items that already have bbox
          const ann = {};
          data.forEach((item) => {
            if (item.bbox && item.bbox.min_x != null) {
              ann[item.item_id] = {
                bbox: item.bbox,
                center_x: item.center_x,
                center_y: item.center_y,
                label_x: item.label_x,
                label_y: item.label_y,
                annotation_mode: item.annotation_mode || 'rectangle',
              };
            }
          });
          setAnnotations(ann);
        }
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Autosave to localStorage (debounced) ───
  const autosaveTimerRef = useRef(null);
  useEffect(() => {
    if (loading) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveAutosave({ annotations, currentFloor });
    }, 800);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [annotations, currentFloor, loading]);

  // ─── Load floor image ───
  useEffect(() => {
    const path = FLOOR_IMAGES[currentFloor];
    if (!path) {
      setImageObj(null);
      setImageSize({ width: 0, height: 0 });
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setImageObj(null);
      setImageSize({ width: 0, height: 0 });
    };
    img.src = path;
  }, [currentFloor]);

  // ─── Resize observer ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Derived items ───
  const floorItems = allItems.filter((i) => i.floor === currentFloor);

  const filteredItems = floorItems.filter((i) => {
    const q = searchQuery.toLowerCase();
    if (q) {
      const matchId = i.item_id.toLowerCase().includes(q);
      const matchName = (i.display_name || '').toLowerCase().includes(q);
      const matchRoom = (i.room_code || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchRoom) return false;
    }
    // Status filter
    const status = i.annotation_status || 'unassigned';
    if (filterStatus === 'auto_assigned_needs_review') {
      if (status !== 'auto_assigned_needs_review') return false;
    } else if (filterStatus === 'unassigned') {
      if (status !== 'unassigned') return false;
    } else if (filterStatus === 'assigned') {
      if (status !== 'assigned') return false;
    } else if (filterStatus === 'suspect') {
      if (!isSuspect(i)) return false;
    }
    return true;
  });

  // Per-status counts for current floor
  const statusCounts = {
    auto: floorItems.filter((i) => (i.annotation_status || 'unassigned') === 'auto_assigned_needs_review').length,
    assigned: floorItems.filter((i) => (i.annotation_status || 'unassigned') === 'assigned').length,
    unassigned: floorItems.filter((i) => (i.annotation_status || 'unassigned') === 'unassigned').length,
    suspect: floorItems.filter((i) => isSuspect(i)).length,
  };

  const assignedCount = floorItems.filter((i) => (i.annotation_status || 'unassigned') === 'assigned').length;
  const autoCount = floorItems.filter((i) => (i.annotation_status || 'unassigned') === 'auto_assigned_needs_review').length;
  const unassignedCount = floorItems.filter((i) => (i.annotation_status || 'unassigned') === 'unassigned').length;
  const totalCount = floorItems.length;
  const selectedItem = allItems.find((i) => i.item_id === selectedItemId) || null;

  // ─── Per-floor progress (tri-state) ───
  const floorProgress = [1, 2, 3, 4].map((f) => {
    const fi = allItems.filter((i) => i.floor === f);
    const assigned = fi.filter((i) => (i.annotation_status || 'unassigned') === 'assigned').length;
    const auto = fi.filter((i) => (i.annotation_status || 'unassigned') === 'auto_assigned_needs_review').length;
    return { floor: f, total: fi.length, assigned, auto };
  });

  // ─── Suspect count ───
  const suspectCount = allItems.filter(isSuspect).length;

  // ─── Konva scale ───
  const hasImage = imageObj && imageSize.width > 0;
  const scale = hasImage
    ? Math.min((stageSize.width - 40) / imageSize.width, (stageSize.height - 40) / imageSize.height, 1)
    : 1;
  const offsetX = hasImage ? (stageSize.width - imageSize.width * scale) / 2 : 0;
  const offsetY = hasImage ? (stageSize.height - imageSize.height * scale) / 2 : 0;

  // ─── Convert stage coords to natural pixels ───
  const toNatural = useCallback(
    (stageX, stageY) => ({
      x: Math.round((stageX - offsetX) / scale),
      y: Math.round((stageY - offsetY) / scale),
    }),
    [offsetX, offsetY, scale]
  );

  const toStage = useCallback(
    (naturalX, naturalY) => ({
      x: naturalX * scale + offsetX,
      y: naturalY * scale + offsetY,
    }),
    [offsetX, offsetY, scale]
  );

  // ─── Mouse handlers ───
  const handleMouseDown = (e) => {
    if (mode !== 'rectangle' || !selectedItemId) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawEnd(pos);
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const nat = toNatural(pos.x, pos.y);
    setMousePos(nat);
    if (isDrawing) setDrawEnd(pos);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !selectedItemId || !drawStart || !drawEnd) {
      setIsDrawing(false); setDrawStart(null); setDrawEnd(null);
      return;
    }
    const startNat = toNatural(drawStart.x, drawStart.y);
    const endNat = toNatural(drawEnd.x, drawEnd.y);
    const minX = Math.min(startNat.x, endNat.x);
    const minY = Math.min(startNat.y, endNat.y);
    const maxX = Math.max(startNat.x, endNat.x);
    const maxY = Math.max(startNat.y, endNat.y);

    if (Math.abs(maxX - minX) < 3 && Math.abs(maxY - minY) < 3) {
      setIsDrawing(false); setDrawStart(null); setDrawEnd(null);
      return;
    }

    const cx = Math.round((minX + maxX) / 2);
    const cy = Math.round((minY + maxY) / 2);

    setAnnotations((prev) => ({
      ...prev,
      [selectedItemId]: {
        bbox: { min_x: minX, min_y: minY, max_x: maxX, max_y: maxY },
        center_x: cx, center_y: cy,
        label_x: cx, label_y: maxY + 20,
        annotation_mode: 'rectangle',
      },
    }));

    setIsDrawing(false); setDrawStart(null); setDrawEnd(null);

    const unassigned = floorItems.filter((i) => !annotations[i.item_id] && i.item_id !== selectedItemId);
    if (unassigned.length > 0) setSelectedItemId(unassigned[0].item_id);
  };

  // ─── Point mode click ───
  const handleCanvasClick = (e) => {
    if (mode !== 'point' || !selectedItemId) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const nat = toNatural(pos.x, pos.y);
    setAnnotations((prev) => ({
      ...prev,
      [selectedItemId]: {
        ...(prev[selectedItemId] || {}),
        center_x: nat.x, center_y: nat.y,
        label_x: nat.x, label_y: nat.y - 15,
        annotation_mode: 'point',
        bbox: null,
      },
    }));
    const unassigned = floorItems.filter((i) => !annotations[i.item_id] && i.item_id !== selectedItemId);
    if (unassigned.length > 0) setSelectedItemId(unassigned[0].item_id);
  };

  // ─── Drag end for existing rectangles ───
  const handleDragEnd = (itemId, e) => {
    const node = e.target;
    const natTopLeft = toNatural(node.x(), node.y());
    const natBottomRight = toNatural(node.x() + node.width() * node.scaleX(), node.y() + node.height() * node.scaleY());
    setAnnotations((prevAnn) => ({
      ...prevAnn,
      [itemId]: {
        ...prevAnn[itemId],
        bbox: { min_x: natTopLeft.x, min_y: natTopLeft.y, max_x: natBottomRight.x, max_y: natBottomRight.y },
        center_x: Math.round((natTopLeft.x + natBottomRight.x) / 2),
        center_y: Math.round((natTopLeft.y + natBottomRight.y) / 2),
        label_x: Math.round((natTopLeft.x + natBottomRight.x) / 2),
        label_y: natBottomRight.y + 20,
        annotation_mode: 'rectangle',
      },
    }));
  };

  // ─── Transformer update ───
  const handleTransformEnd = (itemId, e) => {
    const node = e.target;
    const newX = node.x(), newY = node.y();
    const newW = node.width() * node.scaleX(), newH = node.height() * node.scaleY();
    node.scaleX(1); node.scaleY(1); node.width(newW); node.height(newH);
    const natTL = toNatural(newX, newY);
    const natBR = toNatural(newX + newW, newY + newH);
    setAnnotations((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        bbox: { min_x: natTL.x, min_y: natTL.y, max_x: natBR.x, max_y: natBR.y },
        center_x: Math.round((natTL.x + natBR.x) / 2),
        center_y: Math.round((natTL.y + natBR.y) / 2),
        label_x: Math.round((natTL.x + natBR.x) / 2),
        label_y: natBR.y + 20,
        annotation_mode: 'rectangle',
      },
    }));
  };

  // ─── Next unassigned ───
  const nextUnassigned = () => {
    const unassigned = floorItems.filter((i) => !annotations[i.item_id]);
    if (unassigned.length > 0) setSelectedItemId(unassigned[0].item_id);
  };

  // ─── Export ───
  const handleExport = () => {
    const output = allItems.map((item) => {
      const ann = annotations[item.item_id];
      const hasBbox = ann?.bbox && (ann.bbox.max_x > 0 || ann.bbox.min_x > 0 || ann.bbox.max_y > 0 || ann.bbox.min_y > 0);
      return {
        ...item,
        bbox: ann?.bbox || item.bbox || null,
        center_x: ann?.center_x ?? item.center_x ?? null,
        center_y: ann?.center_y ?? item.center_y ?? null,
        label_x: ann?.label_x ?? item.label_x ?? null,
        label_y: ann?.label_y ?? item.label_y ?? null,
        annotation_mode: ann?.annotation_mode || item.annotation_mode || 'rectangle',
        annotation_status: hasBbox ? 'assigned' : (item.annotation_status || 'unassigned'),
        source: hasBbox ? 'manual_reviewed_from_auto_prefill' : (item.source || 'auto_uniform_grid_prefill'),
        confidence: hasBbox ? 'human_reviewed' : (item.confidence || 'needs_human_review'),
      };
    });
    setExportJson(JSON.stringify(output, null, 2));
    setShowExport(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportJson).then(() => {
      setCopyMsg('Đã sao chép!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  const handleDownload = () => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delta_annotations_${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Mark reviewed ───
  const handleMarkReviewed = () => {
    if (!selectedItemId) return;
    const anno = annotations[selectedItemId];
    if (!anno || !anno.bbox) return;
    setAllItems((prev) =>
      prev.map((item) =>
        item.item_id === selectedItemId
          ? { ...item, annotation_status: 'assigned', confidence: 'human_reviewed', source: 'manual_reviewed_from_auto_prefill' }
          : item
      )
    );
  };

  // ─── Clear autosave ───
  const handleClearAutosave = () => {
    clearAutosaveStorage();
    setAnnotations({});
  };

  // ─── Drawing preview rect ───
  let previewRect = null;
  if (isDrawing && drawStart && drawEnd) {
    previewRect = {
      x: Math.min(drawStart.x, drawEnd.x),
      y: Math.min(drawStart.y, drawEnd.y),
      width: Math.abs(drawEnd.x - drawStart.x),
      height: Math.abs(drawEnd.y - drawStart.y),
    };
  }

  // ─── Render ───
  const hasFloorImage = FLOOR_IMAGES[currentFloor] !== null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e74c3c', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Lỗi tải dữ liệu</h2>
        <p>Không thể tải file /data/delta_manual_measurements_draft.json</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{loadError}</p>
        <button
          onClick={handleClearAutosave}
          style={{ marginTop: '1rem', padding: '0.4rem 0.8rem', borderRadius: 4, border: '1px solid #e74c3c', backgroundColor: 'transparent', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Clear corrupted autosave
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* ─── LEFT PANEL ─── */}
      <div style={{
        width: 320, minWidth: 320, backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Dev-only warning banner */}
        <div style={{ padding: '0.35rem 1rem', backgroundColor: '#c0392b', color: '#fff', fontSize: '0.7rem', fontWeight: 600, textAlign: 'center', letterSpacing: '0.03em' }}>
          Developer tool — not part of public MVP map
        </div>

        {/* Title */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Delta Map Annotation Tool</h2>
        </div>

        {/* ─── Floor progress bar (tri-color) ─── */}
        <div style={{ padding: '0.4rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.25rem' }}>All floors</div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {floorProgress.map((fp) => {
              const assignedPct = fp.total > 0 ? (fp.assigned / fp.total) * 100 : 0;
              const autoPct = fp.total > 0 ? (fp.auto / fp.total) * 100 : 0;
              return (
                <div key={fp.floor} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-light)', marginBottom: '0.15rem' }}>F{fp.floor}</div>
                  <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--color-border)', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', width: `${assignedPct}%`, backgroundColor: '#27ae60', transition: 'width 0.3s' }} />
                    <div style={{ height: '100%', width: `${autoPct}%`, backgroundColor: '#e67e22', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--color-text-light)', marginTop: '0.1rem' }}>{fp.assigned}/{fp.total}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floor selector */}
        <div style={{ padding: '0.4rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[1, 2, 3, 4].map((f) => (
              <button
                key={f}
                onClick={() => { setCurrentFloor(f); setSelectedItemId(null); }}
                style={{
                  flex: 1, padding: '0.3rem 0.4rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 5,
                  border: currentFloor === f ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: currentFloor === f ? 'rgba(41,128,185,0.1)' : 'transparent',
                  color: currentFloor === f ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                {FLOOR_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0.4rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <input
            type="text" placeholder="Tìm kiếm item_id, tên, mã phòng..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: 5, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filter row */}
        <div style={{ padding: '0.35rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginBottom: '0.2rem' }}>Status</div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'auto_assigned_needs_review', label: `Auto (${statusCounts.auto})` },
              { key: 'unassigned', label: `Unassigned (${statusCounts.unassigned})` },
              { key: 'assigned', label: `Reviewed (${statusCounts.assigned})` },
              { key: 'suspect', label: `Suspect (${suspectCount})` },
            ].map(({ key, label }) => {
              const isActive = filterStatus === key;
              const isSuspect = key === 'suspect';
              const activeColor = isSuspect ? '#e67e22' : 'var(--color-primary)';
              return (
                <button key={key} onClick={() => setFilterStatus(key)}
                  style={{
                    padding: '0.25rem 0.45rem', fontSize: '0.68rem', fontWeight: 500, borderRadius: 4,
                    border: isActive ? `1.5px solid ${activeColor}` : '1px solid var(--color-border)',
                    backgroundColor: isActive ? (isSuspect ? 'rgba(230,126,34,0.12)' : 'rgba(41,128,185,0.08)') : 'transparent',
                    color: isActive ? activeColor : 'var(--color-text-light)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '0.3rem 1rem', fontSize: '0.68rem', color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{assignedCount}/{totalCount} reviewed — {autoCount} auto, {unassignedCount} unassigned</span>
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
          {filteredItems.map((item) => {
            const isSelected = item.item_id === selectedItemId;
            const isAssigned = !!annotations[item.item_id];
            const dupLabel = getDuplicateLabel(item, allItems);
            const typeColor = TYPE_COLORS[item.item_type] || TYPE_COLORS.default;
            const suspect = isSuspect(item);

            return (
              <div
                key={item.item_id}
                onClick={() => setSelectedItemId(item.item_id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem',
                  cursor: 'pointer', borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                  backgroundColor: isSelected ? 'rgba(41,128,185,0.06)' : suspect ? 'rgba(230,126,34,0.04)' : 'transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                {isAssigned && <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#27ae60', flexShrink: 0 }} />}
                {!isAssigned && <span style={{ width: 7, height: 7, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {item.display_name}
                    {dupLabel && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>{dupLabel}</span>}
                    {suspect && <span style={{ fontSize: '0.55rem', backgroundColor: '#e67e22', color: '#fff', padding: '0 3px', borderRadius: 2, flexShrink: 0 }}>!</span>}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-light)' }}>
                    <span style={{ display: 'inline-block', backgroundColor: typeColor, color: '#fff', padding: '0 4px', borderRadius: 2, fontSize: '0.55rem', marginRight: '0.25rem' }}>{item.item_type}</span>
                    T{item.floor}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.75rem' }}>
              Không có mục nào
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: '0.4rem 1rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {selectedItemId && annotations[selectedItemId]?.bbox && (
            <button onClick={handleMarkReviewed}
              style={{ padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 5, border: 'none', backgroundColor: '#27ae60', color: '#fff', cursor: 'pointer' }}>
              Mark Reviewed
            </button>
          )}
          <button onClick={handleExport}
            style={{ padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 5, border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', cursor: 'pointer' }}>
            Export JSON
          </button>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button onClick={handleClearAutosave}
              style={{ flex: 1, padding: '0.3rem', fontSize: '0.65rem', borderRadius: 4, border: '1px solid #e74c3c', backgroundColor: 'transparent', color: '#e74c3c', cursor: 'pointer' }}>
              Clear autosave
            </button>
            <button onClick={() => { loadAutosave(); window.location.reload(); }}
              style={{ flex: 1, padding: '0.3rem', fontSize: '0.65rem', borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-light)', cursor: 'pointer' }}>
              Reload with autosave
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CANVAS (unchanged) ─── */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#1a1a2e' }}>
        {!hasFloorImage ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ảnh sơ đồ tầng {currentFloor} chưa có</p>
              <p style={{ fontSize: '0.85rem' }}>Vui lòng thêm ảnh floor{currentFloor}.png vào thư mục mapping.</p>
            </div>
          </div>
        ) : (
          <>
            <Stage
              ref={stageRef} width={stageSize.width} height={stageSize.height}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
              onClick={handleCanvasClick} style={{ backgroundColor: '#1a1a2e' }}
            >
              <Layer>
                {imageObj && (
                  <KonvaImage image={imageObj} x={offsetX} y={offsetY}
                    width={imageSize.width * scale} height={imageSize.height * scale} listening={false} />
                )}
              </Layer>
              <Layer>
                {floorItems.map((item) => {
                  const ann = annotations[item.item_id];
                  if (!ann || !ann.bbox) return null;
                  const isSel = item.item_id === selectedItemId;
                  const color = TYPE_COLORS[item.item_type] || TYPE_COLORS.default;
                  const stagePos = toStage(ann.bbox.min_x, ann.bbox.min_y);
                  const w = (ann.bbox.max_x - ann.bbox.min_x) * scale;
                  const h = (ann.bbox.max_y - ann.bbox.min_y) * scale;
                  return (
                    <Group key={item.item_id}>
                      <Rect x={stagePos.x} y={stagePos.y} width={w} height={h}
                        fill={color + '30'} stroke={isSel ? '#2980b9' : color} strokeWidth={isSel ? 2 : 1}
                        draggable={isSel}
                        onDragEnd={(e) => handleDragEnd(item.item_id, e)}
                        onTransformEnd={(e) => handleTransformEnd(item.item_id, e)} />
                      <Text x={stagePos.x + 2} y={stagePos.y + 2} text={item.display_name}
                        fontSize={11} fill="#fff" fillAfterStrokeEnabled stroke="#00000080" strokeWidth={2} listening={false} />
                    </Group>
                  );
                })}
                {selectedItemId && annotations[selectedItemId]?.bbox && (
                  <Transformer ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => newBox.width < 5 || newBox.height < 5 ? oldBox : newBox} />
                )}
                {floorItems.map((item) => {
                  const ann = annotations[item.item_id];
                  if (!ann || ann.bbox || ann.center_x == null) return null;
                  const color = TYPE_COLORS[item.item_type] || TYPE_COLORS.default;
                  const stagePos = toStage(ann.center_x, ann.center_y);
                  const labelPos = toStage(ann.label_x ?? ann.center_x, ann.label_y ?? ann.center_y - 15);
                  return (
                    <Group key={item.item_id}>
                      <Circle x={stagePos.x} y={stagePos.y} radius={5} fill={color} stroke="#fff" strokeWidth={1.5} />
                      <Text x={labelPos.x - 30} y={labelPos.y - 8} width={60} text={item.display_name}
                        fontSize={10} fill="#fff" align="center" fillAfterStrokeEnabled stroke="#00000080" strokeWidth={2} listening={false} />
                    </Group>
                  );
                })}
              </Layer>
              <Layer>
                {previewRect && (
                  <Rect x={previewRect.x} y={previewRect.y} width={previewRect.width} height={previewRect.height}
                    fill="rgba(41,128,185,0.2)" stroke="#2980b9" strokeWidth={1.5} dash={[5, 3]} listening={false} />
                )}
              </Layer>
            </Stage>
            <div style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', color: '#aaa', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'monospace' }}>
              ({mousePos.x}, {mousePos.y}) px
            </div>
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: '0.35rem' }}>
              <button onClick={nextUnassigned}
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', fontWeight: 500, borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.6)', color: '#ddd', cursor: 'pointer' }}>
                Next Unassigned
              </button>
              <button onClick={() => setSelectedItemId(null)}
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', fontWeight: 500, borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.6)', color: '#ddd', cursor: 'pointer' }}>
                Clear Selection
              </button>
            </div>
            <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: '0.35rem' }}>
              {['rectangle', 'point'].map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  style={{
                    padding: '0.35rem 0.7rem', fontSize: '0.72rem', fontWeight: 600, borderRadius: 4,
                    border: mode === m ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: mode === m ? 'rgba(41,128,185,0.3)' : 'rgba(0,0,0,0.6)',
                    color: mode === m ? '#fff' : '#bbb', cursor: 'pointer',
                  }}>
                  {m === 'rectangle' ? 'Rectangle' : 'Point'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── Export Modal ─── */}
      {showExport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 8, padding: '1.25rem', width: '90%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Exported JSON</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleCopy} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>
                  {copyMsg || 'Copy to Clipboard'}
                </button>
                <button onClick={handleDownload} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: 4, border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', cursor: 'pointer' }}>
                  Download
                </button>
                <button onClick={() => { setShowExport(false); setCopyMsg(''); }} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-light)', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
            <textarea readOnly value={exportJson}
              style={{ flex: 1, width: '100%', minHeight: 300, padding: '0.75rem', fontSize: '0.72rem', fontFamily: 'monospace', borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}
    </div>
  );
}
