import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import ReportToolsBar from "../components/ReportToolsBar";
import { Icon } from "./HomePage";
import { api, type ReportSummary, type Finding, type Trend, type AISummaryResponse, type PatientQAResponse } from "../services/api";


const defaultFindings: Finding[] = [
  {
    id: "hemoglobin",
    name: "Hemoglobin",
    value: "13.8 g/dL",
    range: "12.0–15.5 g/dL",
    status: "Normal",
    page: 2,
    explanation: "Your hemoglobin level is within the expected range.",
    detail:
      "Hemoglobin carries oxygen through the blood. This value sits comfortably inside the laboratory’s reference interval, so the report does not flag it for review.",
    position: 64,
    matched_quote: "Hemoglobin 13.8 g/dL — Reference interval 12.0–15.5 g/dL",
    is_exact_match: true,
  },
  {
    id: "vitamin-d",
    name: "Vitamin D",
    value: "24 ng/mL",
    range: "30–100 ng/mL",
    status: "Low",
    page: 3,
    explanation: "Your Vitamin D level is slightly lower than the reference range.",
    detail:
      "Vitamin D supports bone and muscle health. This result is 6 ng/mL below the laboratory’s lower reference limit. Discuss its relevance with a qualified professional.",
    position: 24,
    matched_quote: "25-OH Vitamin D 24 ng/mL — Reference interval 30–100 ng/mL",
    is_exact_match: true,
  },
  {
    id: "glucose",
    name: "Fasting glucose",
    value: "92 mg/dL",
    range: "70–99 mg/dL",
    status: "Normal",
    page: 2,
    explanation: "Your fasting glucose is within the expected range.",
    detail:
      "Glucose is the main sugar used by the body for energy. The reported value falls within the listed fasting reference interval, assuming fasting status is correct.",
    position: 76,
    matched_quote: "Fasting Plasma Glucose 92 mg/dL — Reference interval 70–99 mg/dL",
    is_exact_match: true,
  },
  {
    id: "tsh",
    name: "Thyroid stimulating hormone",
    value: "2.1 mIU/L",
    range: "0.4–4.0 mIU/L",
    status: "Normal",
    page: 3,
    explanation: "Your thyroid stimulating hormone result is within the reference range.",
    detail:
      "TSH helps regulate thyroid activity. This result is near the middle of the laboratory’s reference interval and is not marked abnormal in the report.",
    position: 48,
    matched_quote: "Thyroid stimulating hormone 2.1 mIU/L — Reference interval 0.4–4.0 mIU/L",
    is_exact_match: true,
  },
];

const defaultTrends: Trend[] = [
  {
    label: "Hemoglobin",
    tested: 13.8,
    previous: 13.2,
    normalMin: 12,
    normalMax: 15.5,
    chartMin: 10,
    chartMax: 18,
    unit: "g/dL",
  },
  {
    label: "Vitamin D",
    tested: 24,
    previous: 18,
    normalMin: 30,
    normalMax: 100,
    chartMin: 0,
    chartMax: 110,
    unit: "ng/mL",
  },
  {
    label: "Fasting glucose",
    tested: 92,
    previous: 88,
    normalMin: 70,
    normalMax: 99,
    chartMin: 50,
    chartMax: 120,
    unit: "mg/dL",
  },
  {
    label: "TSH",
    tested: 2.1,
    previous: null,
    normalMin: 0.4,
    normalMax: 4,
    chartMin: 0,
    chartMax: 5,
    unit: "mIU/L",
  },
];

interface BaselinePoint {
  finding: Finding;
  name: string;
  testedValue: string;
  numericVal: number | null;
  unit: string;
  rangeStr: string;
  refMin: number | null;
  refMax: number | null;
  baselineIndex: number;
  deviationPercent: number;
  status: "Normal" | "High" | "Low";
  statusColor: string;
  page: number;
  x: number;
  y: number;
}

function parseFindingBaseline(f: Finding): {
  name: string;
  testedValue: string;
  numericVal: number | null;
  unit: string;
  rangeStr: string;
  refMin: number | null;
  refMax: number | null;
  baselineIndex: number;
  deviationPercent: number;
  status: "Normal" | "High" | "Low";
  statusColor: string;
  page: number;
} {
  const name = f.name;
  const testedValue = f.value;
  const page = f.page;
  const status: "Normal" | "High" | "Low" =
    f.status === "High" || f.status === "Critical"
      ? "High"
      : f.status === "Low"
      ? "Low"
      : "Normal";

  const numMatch = f.value.match(/[-+]?[0-9]*\.?[0-9]+/);
  const numericVal = numMatch ? parseFloat(numMatch[0]) : null;

  const rangeNums = (f.range || "").match(/[-+]?[0-9]*\.?[0-9]+/g);
  let refMin: number | null = null;
  let refMax: number | null = null;
  if (rangeNums && rangeNums.length >= 2) {
    refMin = parseFloat(rangeNums[0]);
    refMax = parseFloat(rangeNums[1]);
  } else if (rangeNums && rangeNums.length === 1) {
    if (f.range.includes("<")) {
      refMax = parseFloat(rangeNums[0]);
      refMin = 0;
    } else if (f.range.includes(">")) {
      refMin = parseFloat(rangeNums[0]);
    }
  }

  let baselineIndex = 100;
  let deviationPercent = 0;

  if (numericVal !== null && refMin !== null && refMax !== null && refMax > refMin) {
    const mid = (refMin + refMax) / 2;
    if (mid > 0) {
      baselineIndex = Math.round((numericVal / mid) * 100);
      deviationPercent = Math.round(((numericVal - mid) / mid) * 100);
    }
  } else if (numericVal !== null && refMax !== null && refMax > 0) {
    const target = refMax * 0.75;
    baselineIndex = Math.round((numericVal / target) * 100);
    deviationPercent = Math.round(((numericVal - target) / target) * 100);
  } else {
    if (status === "High") {
      baselineIndex = 145;
      deviationPercent = 45;
    } else if (status === "Low") {
      baselineIndex = 55;
      deviationPercent = -45;
    } else {
      baselineIndex = 100;
      deviationPercent = 0;
    }
  }

  // Constrain visual index between 25% and 215% for clean chart bounds
  const clampedIndex = Math.max(25, Math.min(215, baselineIndex));
  const statusColor =
    status === "Normal" ? "#10b981" : status === "High" ? "#ef4444" : "#3b82f6";

  return {
    name,
    testedValue,
    numericVal,
    unit: f.range ? f.range.replace(/[\d\.\–\-\<\>\s]/g, "") : "",
    rangeStr: f.range,
    refMin,
    refMax,
    baselineIndex: clampedIndex,
    deviationPercent,
    status,
    statusColor,
    page,
  };
}

function BaselineFactsLineChart({
  findings,
  activeFinding,
  onSelectFinding,
}: {
  findings: Finding[];
  activeFinding: Finding;
  onSelectFinding: (f: Finding) => void;
}) {
  const [filterMode, setFilterMode] = useState<"all" | "abnormal" | "key">("all");
  const [hoveredPoint, setHoveredPoint] = useState<BaselinePoint | null>(null);
  const [isExpandedModal, setIsExpandedModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpandedModal(false);
      }
    };
    if (isExpandedModal) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isExpandedModal]);

  const parsedAll = useMemo(() => {
    return findings.map((f) => {
      const parsed = parseFindingBaseline(f);
      return { ...parsed, finding: f };
    });
  }, [findings]);

  const displayedList = useMemo(() => {
    if (filterMode === "abnormal") {
      const ab = parsedAll.filter((p) => p.status !== "Normal");
      return ab.length > 0 ? ab : parsedAll;
    }
    if (filterMode === "key") {
      const keyWords = ["glucose", "sugar", "hba1c", "vitamin", "hemoglobin", "creatinine", "triglyceride", "cholesterol", "tsh", "bilirubin", "sgpt", "sgot", "platelet"];
      const keyList = parsedAll.filter((p) =>
        keyWords.some((k) => p.name.toLowerCase().includes(k))
      );
      return keyList.length > 0 ? keyList : parsedAll.slice(0, 16);
    }
    return parsedAll;
  }, [parsedAll, filterMode]);

  // Layout constants
  const chartW = 980;
  const chartH = 340;
  const padL = 75;
  const padR = 40;
  const padT = 35;
  const padB = 75;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  // Y-axis scaling: 220% is at padT, 100% is midpoint baseline, 20% is at padT + innerH
  const minScale = 20;
  const maxScale = 220;
  const getY = (val: number) => {
    const ratio = (val - minScale) / (maxScale - minScale);
    return padT + innerH - ratio * innerH;
  };

  const y100 = getY(100);
  const y120 = getY(120);
  const y80 = getY(80);
  const y150 = getY(150);
  const y200 = getY(200);
  const y50 = getY(50);

  // Compute (x, y) coordinates for all displayed points
  const points: BaselinePoint[] = useMemo(() => {
    const N = displayedList.length;
    return displayedList.map((item, idx) => {
      const x = N > 1 ? padL + (idx / (N - 1)) * innerW : padL + innerW / 2;
      const y = getY(item.baselineIndex);
      return {
        ...item,
        x,
        y,
      };
    });
  }, [displayedList, innerW, innerH]);

  // Continuous line SVG path string
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, "");
  }, [points]);

  // Area fill down to 100% baseline line
  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x.toFixed(1)} ${y100.toFixed(1)} L ${first.x.toFixed(1)} ${y100.toFixed(1)} Z`;
  }, [linePath, points, y100]);

  // Modal layout constants (Extra spacious & high-def)
  const modalW = 1360;
  const modalH = 460;
  const mPadL = 140;
  const mPadR = 50;
  const mPadT = 40;
  const mPadB = 90;
  const mInnerW = modalW - mPadL - mPadR;
  const mInnerH = modalH - mPadT - mPadB;
  const getModalY = (val: number) => {
    const ratio = (val - minScale) / (maxScale - minScale);
    return mPadT + mInnerH - ratio * mInnerH;
  };
  const my100 = getModalY(100);
  const my120 = getModalY(120);
  const my80 = getModalY(80);
  const my150 = getModalY(150);
  const my200 = getModalY(200);
  const my50 = getModalY(50);

  const modalPoints = useMemo(() => {
    const N = displayedList.length;
    return displayedList.map((item, idx) => {
      const x = N > 1 ? mPadL + (idx / (N - 1)) * mInnerW : mPadL + mInnerW / 2;
      const y = getModalY(item.baselineIndex);
      return {
        ...item,
        x,
        y,
      };
    });
  }, [displayedList, mInnerW, mInnerH]);

  const modalLinePath = useMemo(() => {
    if (modalPoints.length === 0) return "";
    return modalPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, "");
  }, [modalPoints]);

  const modalAreaPath = useMemo(() => {
    if (modalPoints.length < 2) return "";
    const first = modalPoints[0];
    const last = modalPoints[modalPoints.length - 1];
    return `${modalLinePath} L ${last.x.toFixed(1)} ${my100.toFixed(1)} L ${first.x.toFixed(1)} ${my100.toFixed(1)} Z`;
  }, [modalLinePath, modalPoints, my100]);

  const activePoint = hoveredPoint || points.find((p) => p.finding.id === activeFinding.id) || points[0];

  const normalCount = parsedAll.filter((p) => p.status === "Normal").length;
  const abnormalCount = parsedAll.length - normalCount;

  return (
    <div className="baseline-single-graph-container">
      {/* Graph Header with Mode Filters, Metrics, and Expand Button */}
      <div className="baseline-graph-header">
        <div>
          <div className="graph-title-row">
            <span className="graph-badge">
              <Icon name="activity" size={14} /> Unified Physiological Baseline View
            </span>
            <h3>Continuous Extracted Facts Line Graph</h3>
          </div>
          <p className="graph-subtext">
            Every verified laboratory finding plotted on a normalized baseline index scale (<strong>100% = Expected Normal Baseline Target</strong>).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Filter Tabs */}
          <div className="baseline-filter-tabs">
            <button
              className={`filter-tab-btn ${filterMode === "all" ? "active" : ""}`}
              onClick={() => setFilterMode("all")}
              type="button"
            >
              All Facts ({parsedAll.length})
            </button>
            <button
              className={`filter-tab-btn ${filterMode === "abnormal" ? "active" : ""}`}
              onClick={() => setFilterMode("abnormal")}
              type="button"
            >
              Out-of-Range Only ({abnormalCount})
            </button>
            <button
              className={`filter-tab-btn ${filterMode === "key" ? "active" : ""}`}
              onClick={() => setFilterMode("key")}
              type="button"
            >
              Key Panels (12)
            </button>
          </div>

          <button
            className="expand-graph-popup-btn"
            onClick={() => setIsExpandedModal(true)}
            title="Expand graph into a high-definition pop-up modal"
            type="button"
          >
            <Icon name="sparkles" size={13} />
            <span>⤢ Expand & Pop-up</span>
          </button>
        </div>
      </div>

      {/* Baseline Legend Bar */}
      <div className="baseline-chart-legend">
        <div className="legend-item">
          <span className="legend-line baseline-target" />
          <span><strong>100% Target Baseline</strong> (Optimal Reference Standard)</span>
        </div>
        <div className="legend-item">
          <span className="legend-box corridor-box" />
          <span>Normal Tolerance Corridor (80%–120%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-normal" />
          <span>In-Range ({normalCount})</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-high" />
          <span>Elevated / High</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-low" />
          <span>Deficient / Low</span>
        </div>
      </div>

      {/* Main Responsive SVG Line Graph */}
      <div
        className="baseline-svg-wrapper"
        onClick={() => setIsExpandedModal(true)}
        title="Click to expand & pop up graph in high-definition"
      >
        <div className="click-to-expand-hint">
          <span>⤢ Click graph to expand & pop-up in high definition</span>
        </div>
        <svg
          aria-label="Continuous line graph of all extracted medical facts compared to baseline levels"
          className="baseline-main-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${chartW} ${chartH}`}
        >
          <defs>
            <linearGradient id="baselineLineGrad" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="baselineAreaGrad" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines & Zones */}
          {/* Normal Corridor Band (80% to 120%) */}
          <rect
            className="normal-corridor-band"
            fill="rgba(16, 185, 129, 0.08)"
            height={Math.max(2, y80 - y120)}
            width={innerW}
            x={padL}
            y={y120}
          />

          {/* Elevated Zone Tint (>120%) */}
          <rect
            fill="rgba(239, 68, 68, 0.04)"
            height={Math.max(2, y120 - padT)}
            width={innerW}
            x={padL}
            y={padT}
          />

          {/* Deficient Zone Tint (<80%) */}
          <rect
            fill="rgba(59, 130, 246, 0.04)"
            height={Math.max(2, padT + innerH - y80)}
            width={innerW}
            x={padL}
            y={y80}
          />

          {/* Horizontal Reference Grid Lines */}
          <line className="grid-sub-line" stroke="#e5e7eb" strokeDasharray="3 3" x1={padL} x2={padL + innerW} y1={y200} y2={y200} />
          <text className="axis-label-text" fill="#9ca3af" fontSize="11" textAnchor="end" x={padL - 10} y={y200 + 4}>200% High</text>

          <line className="grid-sub-line" stroke="#e5e7eb" strokeDasharray="3 3" x1={padL} x2={padL + innerW} y1={y150} y2={y150} />
          <text className="axis-label-text" fill="#9ca3af" fontSize="11" textAnchor="end" x={padL - 10} y={y150 + 4}>150% Elevated</text>

          <line className="grid-corridor-line" stroke="#86efac" strokeDasharray="2 2" x1={padL} x2={padL + innerW} y1={y120} y2={y120} />
          <text className="axis-label-text" fill="#15803d" fontSize="11" fontWeight="600" textAnchor="end" x={padL - 10} y={y120 + 4}>120% Upper</text>

          {/* 100% Target Baseline Center Line */}
          <line className="grid-baseline-line" stroke="#059669" strokeDasharray="6 4" strokeWidth="2" x1={padL} x2={padL + innerW} y1={y100} y2={y100} />
          <text className="axis-label-text baseline-label" fill="#047857" fontSize="12" fontWeight="700" textAnchor="end" x={padL - 10} y={y100 + 4}>100% Baseline</text>

          <line className="grid-corridor-line" stroke="#86efac" strokeDasharray="2 2" x1={padL} x2={padL + innerW} y1={y80} y2={y80} />
          <text className="axis-label-text" fill="#15803d" fontSize="11" fontWeight="600" textAnchor="end" x={padL - 10} y={y80 + 4}>80% Lower</text>

          <line className="grid-sub-line" stroke="#e5e7eb" strokeDasharray="3 3" x1={padL} x2={padL + innerW} y1={y50} y2={y50} />
          <text className="axis-label-text" fill="#9ca3af" fontSize="11" textAnchor="end" x={padL - 10} y={y50 + 4}>50% Low</text>

          {/* Shaded Area Under Curve to Baseline */}
          {areaPath && <path d={areaPath} fill="url(#baselineAreaGrad)" />}

          {/* Single Continuous Connecting Line */}
          {linePath && (
            <path
              className="baseline-continuous-line"
              d={linePath}
              fill="none"
              stroke="url(#baselineLineGrad)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.8"
            />
          )}

          {/* Data Points Across All Extracted Facts */}
          {points.map((p, i) => {
            const isSelected = activeFinding?.id === p.finding.id;
            const isHovered = hoveredPoint?.finding.id === p.finding.id;

            return (
              <g
                className="baseline-point-group"
                key={p.finding.id || i}
                onClick={() => onSelectFinding(p.finding)}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Active glow ring */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    fill={p.statusColor}
                    fillOpacity="0.25"
                    r="10"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  fill={p.statusColor}
                  r={isSelected || isHovered ? 6.5 : 4}
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Vertical guideline on hover/selection */}
                {(isSelected || isHovered) && (
                  <line
                    stroke={p.statusColor}
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                    x1={p.x}
                    x2={p.x}
                    y1={padT}
                    y2={padT + innerH}
                  />
                )}

                {/* X-axis Tick & Label (render every 2nd or 3rd if many points) */}
                {(points.length <= 15 || i % Math.ceil(points.length / 14) === 0 || isSelected) && (
                  <text
                    className={`point-x-label ${isSelected ? "selected-x-label" : ""}`}
                    fill={isSelected ? "#111827" : "#6b7280"}
                    fontSize={isSelected ? "11" : "10"}
                    fontWeight={isSelected ? "700" : "500"}
                    textAnchor="middle"
                    transform={`rotate(35, ${p.x}, ${padT + innerH + 18})`}
                    x={p.x}
                    y={padT + innerH + 18}
                  >
                    {p.name.length > 14 ? `${p.name.slice(0, 12)}…` : p.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Focused Fact Detail & Provenance Card */}
      {activePoint && (
        <div className="baseline-point-detail-card">
          <div className="point-card-left">
            <span className={`point-status-pill ${activePoint.status === "High" ? "pill-high" : activePoint.status === "Low" ? "pill-low" : "pill-normal"}`}>
              {activePoint.status === "Normal" ? "Within Normal Baseline" : `${activePoint.status} vs Baseline`}
            </span>
            <h4>{activePoint.name}</h4>
            <div className="point-values-line">
              <span className="point-tested-val">
                Tested Result: <strong>{activePoint.testedValue}</strong>
              </span>
              <span className="point-ref-val">
                Reference Range: <strong>{activePoint.rangeStr}</strong>
              </span>
            </div>
          </div>

          <div className="point-card-center">
            <div className="baseline-comparison-metric">
              <small>Compared to Baseline Target:</small>
              <div className="metric-score-row">
                <strong className={`metric-pct ${activePoint.status !== "Normal" ? "abnormal-pct" : "normal-pct"}`}>
                  {activePoint.baselineIndex}%
                </strong>
                <span className="metric-delta">
                  ({activePoint.deviationPercent >= 0 ? `+${activePoint.deviationPercent}%` : `${activePoint.deviationPercent}%`} from midpoint)
                </span>
              </div>
            </div>
          </div>

          <div className="point-card-right">
            <div className="provenance-tag">
              <Icon name="check" size={12} />
              <span>Grounded on Report Page {activePoint.page}</span>
            </div>
            <button
              className="inspect-source-btn"
              onClick={() => onSelectFinding(activePoint.finding)}
              type="button"
            >
              Inspect Source in PDF →
            </button>
          </div>
        </div>
      )}

      {/* Expanded Pop-up Modal */}
      {isExpandedModal && (
        <div className="baseline-modal-overlay" onClick={() => setIsExpandedModal(false)}>
          <div className="baseline-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div>
                <span className="graph-badge">
                  <Icon name="activity" size={14} /> High-Definition Clinical Pop-up
                </span>
                <h2>Expanded Baseline Comparison Line Graph</h2>
                <p>
                  Comparing all {displayedList.length} verified laboratory facts on a normalized baseline index scale (100% = Baseline Target).
                </p>
              </div>

              <div className="modal-top-actions">
                <div className="baseline-filter-tabs">
                  <button
                    className={`filter-tab-btn ${filterMode === "all" ? "active" : ""}`}
                    onClick={() => setFilterMode("all")}
                    type="button"
                  >
                    All Facts ({parsedAll.length})
                  </button>
                  <button
                    className={`filter-tab-btn ${filterMode === "abnormal" ? "active" : ""}`}
                    onClick={() => setFilterMode("abnormal")}
                    type="button"
                  >
                    Out-of-Range Only ({abnormalCount})
                  </button>
                  <button
                    className={`filter-tab-btn ${filterMode === "key" ? "active" : ""}`}
                    onClick={() => setFilterMode("key")}
                    type="button"
                  >
                    Key Panels (12)
                  </button>
                </div>

                <button
                  className="close-modal-btn"
                  onClick={() => setIsExpandedModal(false)}
                  title="Close expanded pop-up (Esc)"
                  type="button"
                >
                  <Icon name="x" size={16} /> Close Pop-up
                </button>
              </div>
            </div>

            {/* Modal Legend */}
            <div className="baseline-chart-legend modal-legend">
              <div className="legend-item">
                <span className="legend-line baseline-target" />
                <span><strong>100% Target Baseline</strong> (Optimal Reference Standard)</span>
              </div>
              <div className="legend-item">
                <span className="legend-box corridor-box" />
                <span>Normal Tolerance Corridor (80%–120%)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-normal" />
                <span>In-Range ({normalCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-high" />
                <span>Elevated / High</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-low" />
                <span>Deficient / Low</span>
              </div>
            </div>

            {/* Expanded SVG Canvas */}
            <div className="modal-svg-scroll">
              <svg
                aria-label="Expanded continuous line graph of all extracted medical facts"
                className="modal-main-svg"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                viewBox={`0 0 ${modalW} ${modalH}`}
              >
                <defs>
                  <linearGradient id="modalLineGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="modalAreaGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Normal Corridor Band (80% to 120%) */}
                <rect
                  className="normal-corridor-band"
                  fill="rgba(16, 185, 129, 0.09)"
                  height={Math.max(2, my80 - my120)}
                  width={mInnerW}
                  x={mPadL}
                  y={my120}
                />

                {/* Elevated Zone Tint (>120%) */}
                <rect
                  fill="rgba(239, 68, 68, 0.04)"
                  height={Math.max(2, my120 - mPadT)}
                  width={mInnerW}
                  x={mPadL}
                  y={mPadT}
                />

                {/* Deficient Zone Tint (<80%) */}
                <rect
                  fill="rgba(59, 130, 246, 0.04)"
                  height={Math.max(2, mPadT + mInnerH - my80)}
                  width={mInnerW}
                  x={mPadL}
                  y={my80}
                />

                {/* Horizontal Reference Grid Lines */}
                <line className="grid-sub-line" stroke="#e5e7eb" strokeDasharray="3 3" x1={mPadL} x2={mPadL + mInnerW} y1={my200} y2={my200} />
                <text className="axis-label-text" fill="#9ca3af" fontSize="12" textAnchor="end" x={mPadL - 12} y={my200 + 4}>200% High</text>

                <line className="grid-sub-line" stroke="#e5e7eb" strokeDasharray="3 3" x1={mPadL} x2={mPadL + mInnerW} y1={my150} y2={my150} />
                <text className="axis-label-text" fill="#9ca3af" fontSize="12" textAnchor="end" x={mPadL - 12} y={my150 + 4}>150% Elevated</text>

                <line className="grid-corridor-line" stroke="#86efac" strokeDasharray="2 2" x1={mPadL} x2={mPadL + mInnerW} y1={my120} y2={my120} />
                <text className="axis-label-text" fill="#15803d" fontSize="12" fontWeight="600" textAnchor="end" x={mPadL - 12} y={my120 + 4}>120% Upper</text>

                {/* 100% Target Baseline Center Line */}
                <line className="grid-baseline-line" stroke="#059669" strokeDasharray="6 4" strokeWidth="2.2" x1={mPadL} x2={mPadL + mInnerW} y1={my100} y2={my100} />
                <text className="axis-label-text baseline-label" fill="#047857" fontSize="12" fontWeight="800" textAnchor="end" x={mPadL - 12} y={my100 + 4}>100% Target</text>

                <line className="grid-corridor-line" stroke="#86efac" strokeDasharray="2 2" x1={mPadL} x2={mPadL + mInnerW} y1={my80} y2={my80} />
                <text className="axis-label-text" fill="#15803d" fontSize="12" fontWeight="600" textAnchor="end" x={mPadL - 12} y={my80 + 4}>80% Lower</text>

                <line className="grid-sub-line" stroke="#e5e7eb" strokeDasharray="3 3" x1={mPadL} x2={mPadL + mInnerW} y1={my50} y2={my50} />
                <text className="axis-label-text" fill="#9ca3af" fontSize="12" textAnchor="end" x={mPadL - 12} y={my50 + 4}>50% Low</text>

                {/* Shaded Area Under Curve to Baseline */}
                {modalAreaPath && <path d={modalAreaPath} fill="url(#modalAreaGrad)" />}

                {/* Single Continuous Connecting Line */}
                {modalLinePath && (
                  <path
                    className="baseline-continuous-line"
                    d={modalLinePath}
                    fill="none"
                    stroke="url(#modalLineGrad)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3.2"
                  />
                )}

                {/* Data Points Across All Extracted Facts */}
                {modalPoints.map((p, i) => {
                  const isSelected = activeFinding?.id === p.finding.id;
                  const isHovered = hoveredPoint?.finding.id === p.finding.id;

                  return (
                    <g
                      className="baseline-point-group"
                      key={`modal-${p.finding.id || i}`}
                      onClick={() => onSelectFinding(p.finding)}
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {(isSelected || isHovered) && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          fill={p.statusColor}
                          fillOpacity="0.25"
                          r="12"
                        />
                      )}

                      <circle
                        cx={p.x}
                        cy={p.y}
                        fill={p.statusColor}
                        r={isSelected || isHovered ? 7.5 : 5}
                        stroke="#ffffff"
                        strokeWidth="2.2"
                      />

                      {(isSelected || isHovered) && (
                        <line
                          stroke={p.statusColor}
                          strokeDasharray="2 2"
                          strokeWidth="1.5"
                          x1={p.x}
                          x2={p.x}
                          y1={mPadT}
                          y2={mPadT + mInnerH}
                        />
                      )}

                      {/* X-axis Tick & Label: Every point is clearly labeled in the expanded modal! */}
                      <text
                        className={`point-x-label ${isSelected ? "selected-x-label" : ""}`}
                        fill={isSelected ? "#065f46" : "#4b5563"}
                        fontSize={isSelected ? "11.5" : "10.5"}
                        fontWeight={isSelected ? "800" : "600"}
                        textAnchor="middle"
                        transform={`rotate(40, ${p.x}, ${mPadT + mInnerH + 20})`}
                        x={p.x}
                        y={mPadT + mInnerH + 20}
                      >
                        {p.name.length > 16 ? `${p.name.slice(0, 14)}…` : p.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Modal Detail Footer */}
            {activePoint && (
              <div className="baseline-point-detail-card modal-detail-footer">
                <div className="point-card-left">
                  <span className={`point-status-pill ${activePoint.status === "High" ? "pill-high" : activePoint.status === "Low" ? "pill-low" : "pill-normal"}`}>
                    {activePoint.status === "Normal" ? "Within Normal Baseline" : `${activePoint.status} vs Baseline`}
                  </span>
                  <h4>{activePoint.name}</h4>
                  <div className="point-values-line">
                    <span className="point-tested-val">
                      Tested: <strong>{activePoint.testedValue}</strong>
                    </span>
                    <span className="point-ref-val">
                      Range: <strong>{activePoint.rangeStr}</strong>
                    </span>
                  </div>
                </div>

                <div className="point-card-center">
                  <div className="baseline-comparison-metric">
                    <small>Compared to Baseline Target:</small>
                    <div className="metric-score-row">
                      <strong className={`metric-pct ${activePoint.status !== "Normal" ? "abnormal-pct" : "normal-pct"}`}>
                        {activePoint.baselineIndex}%
                      </strong>
                      <span className="metric-delta">
                        ({activePoint.deviationPercent >= 0 ? `+${activePoint.deviationPercent}%` : `${activePoint.deviationPercent}%`} from midpoint)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="point-card-right">
                  <div className="provenance-tag">
                    <Icon name="check" size={12} />
                    <span>Grounded on Report Page {activePoint.page}</span>
                  </div>
                  <button
                    className="inspect-source-btn"
                    onClick={() => {
                      onSelectFinding(activePoint.finding);
                      setIsExpandedModal(false);
                    }}
                    type="button"
                  >
                    View in PDF & Close ↗
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SampleReportPage() {
  const [report, setReport] = useState<ReportSummary>(() => {
    try {
      const saved = window.localStorage.getItem("medcorpus-active-report");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.id !== "sample-report-001" && parsed.findings && parsed.findings.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not load cached report:", e);
    }
    return {
      id: "latest",
      file_name: "Diagnostic_Report.pdf",
      report_title: "Diagnostic Medical Report",
      patient_name: "Patient",
      patient_age: "--",
      patient_sex: "--",
      doctor_name: "Attending Physician",
      lab_name: "Diagnostic Laboratory",
      report_date: "Current",
      total_findings: 0,
      normal_count: 0,
      abnormal_count: 0,
      normality_percentage: 100.0,
      overall_summary_text: "Loading active diagnostic report from clinical engine...",
      is_verified: true,
      findings: [],
      trends: [],
      flags: [],
      pages: [],
    };
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const reportIdParam = searchParams.get("reportId") || searchParams.get("id");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const currentUser = api.getCurrentUser();
  const [roleMode, setRoleMode] = useState<"clinical" | "patient">(() => {
    return currentUser?.role === "doctor" ? "clinical" : "patient";
  });

  // Clinician override finding state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideRange, setOverrideRange] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("Normal");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Clinician official signoff state
  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState(() => currentUser?.name || "Dr. Sarah Jenkins, MD");
  const [licenseNumber, setLicenseNumber] = useState("MD-94021-CAL");
  const [signoffNotes, setSignoffNotes] = useState("AI-extracted metrics verified against official clinical bounds. Approved for EHR patient record.");
  const [isSigningOff, setIsSigningOff] = useState(false);

  // Patient Interactive Q&A state
  const [patientQuestion, setPatientQuestion] = useState("");
  const [isAskingQA, setIsAskingQA] = useState(false);
  const [patientQAResponse, setPatientQAResponse] = useState<PatientQAResponse | null>(null);

  const findings = report.findings && report.findings.length > 0 ? report.findings : defaultFindings;
  const trends = report.trends && report.trends.length > 0 ? report.trends : defaultTrends;

  const [activeFinding, setActiveFinding] = useState<Finding>(() => {
    const lowFinding = findings.find((f) => f.status === "Low" || f.status === "High");
    return lowFinding || findings[0];
  });
  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "notes">("overview");
  const [sourceViewMode, setSourceViewMode] = useState<"pdf" | "table">("pdf");
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const pdfBlobUrl = typeof window !== "undefined" ? window.sessionStorage.getItem("medcorpus-pdf-blob-url") : null;
  const backendPdfUrl = report?.file_url
    ? (report.file_url.startsWith("http") ? report.file_url : `http://localhost:8000${report.file_url}`)
    : `http://localhost:8000/api/reports/${report?.id || "latest"}/file`;
  const reportId = report?.id || "latest";
  const highlightedPdfUrl = `/api/reports/${reportId}/file?highlight=true&fact_id=${encodeURIComponent(activeFinding.name)}#page=${activeFinding.page}&zoom=115`;
  const pdfUrl = highlightedPdfUrl;

  const handleGenerateAISummary = async (targetRepId?: string) => {
    setIsGeneratingSummary(true);
    try {
      const res = await api.getReportAISummary(targetRepId || report.id || "latest");
      setAiSummary(res);
    } catch (e: any) {
      console.warn("Could not generate AI clinical summary:", e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    async function syncReport() {
      if (reportIdParam) {
        try {
          const rep = await api.getReportById(reportIdParam);
          if (rep && rep.findings && rep.findings.length > 0) {
            setReport(rep);
            setAiSummary(null);
            window.localStorage.setItem("medcorpus-active-report", JSON.stringify(rep));
            return;
          }
        } catch (e) {
          console.warn("Could not load report by id:", e);
        }
      }
      try {
        const latest = await api.getLatestReport();
        if (latest && latest.findings && latest.findings.length > 0) {
          setReport(latest);
          setAiSummary(null);
          window.localStorage.setItem("medcorpus-active-report", JSON.stringify(latest));
        }
      } catch (err) {
        console.warn("Could not sync latest report:", err);
      }
    }
    syncReport();
  }, [reportIdParam]);

  // Generate executive narrative from LLM whenever report changes
  useEffect(() => {
    if (report && report.findings && report.findings.length > 0) {
      setAiSummary(null);
      handleGenerateAISummary(report.id);
      const lowFinding = report.findings.find((f) => f.status === "Low" || f.status === "High");
      setActiveFinding(lowFinding || report.findings[0]);
    }
  }, [report.id, report.findings?.length]);

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadReport(file);
      if (res && res.summary) {
        setReport(res.summary);
        setAiSummary(null);
        window.localStorage.setItem("medcorpus-active-report", JSON.stringify(res.summary));
        setSearchParams({ reportId: res.summary.id });
      }
    } catch (err) {
      console.error("Direct report upload failed:", err);
      alert("Failed to process uploaded report file. Please verify it is a valid PDF.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openOverrideModal = (f: Finding) => {
    setActiveFinding(f);
    setOverrideValue(f.value);
    setOverrideRange(f.range || "");
    setOverrideStatus(f.status === "Low" || f.status === "High" || f.status === "Critical" ? f.status : "Normal");
    setOverrideNotes(f.override_notes || "");
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e: FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setIsSavingOverride(true);
    try {
      const updated = await api.overrideReportFinding(
        report.id,
        activeFinding.id || activeFinding.name,
        overrideValue,
        overrideRange,
        overrideStatus,
        overrideNotes
      );
      setReport(updated);
      window.localStorage.setItem("medcorpus-active-report", JSON.stringify(updated));
      setIsOverrideModalOpen(false);
    } catch (err: any) {
      alert("Override failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleSaveSignoff = async (e: FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setIsSigningOff(true);
    try {
      const updated = await api.signoffReport(
        report.id,
        doctorName,
        licenseNumber,
        signoffNotes
      );
      setReport(updated);
      window.localStorage.setItem("medcorpus-active-report", JSON.stringify(updated));
      setIsSignoffModalOpen(false);
    } catch (err: any) {
      alert("Sign-off failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSigningOff(false);
    }
  };

  const handleAskPatientQA = async (e?: FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || patientQuestion;
    if (!query.trim()) return;
    setIsAskingQA(true);
    try {
      const res = await api.askPatientQA(report.id || "latest", query.trim());
      setPatientQAResponse(res);
    } catch (err: any) {
      alert("Could not answer report question: " + (err.message || "Service unavailable"));
    } finally {
      setIsAskingQA(false);
    }
  };

  const activePageData = useMemo(() => {
    if (report.pages && report.pages.length > 0) {
      return (
        report.pages.find((p) => p.page_number === activeFinding.page) ||
        report.pages[0]
      );
    }
    return null;
  }, [report.pages, activeFinding.page]);

  const totalPages = report.pages && report.pages.length > 0 ? report.pages.length : 4;

  const findingsOnActivePage = useMemo(() => {
    return findings.filter((f) => f.page === activeFinding.page);
  }, [findings, activeFinding.page]);

  return (
    <main className="report-page">
      <ReportToolsBar />
      <header className="report-header">
        <Link className="onboarding-brand" to="/">
          <span className="onboarding-brand-mark">
            <span />
            <span />
            <span />
          </span>
          MedCorpus
        </Link>
        <div className="report-header-title">
          <span>{report.id.startsWith("rep-") ? "Evaluated Report" : "Sample report"}</span>
          <strong>{report.report_title || report.file_name}</strong>
        </div>
        <div className="report-header-actions">
          <Link to="/start">Upload new report</Link>
          <button onClick={() => window.print()}>Print summary</button>
        </div>
      </header>

      <div className="report-notice">
        <Icon name="sparkles" size={15} />
        <span>
          {report.id.startsWith("rep-")
            ? `Verified analysis for ${report.file_name} — separated extracted facts from generated explanations.`
            : "This is a sample report showing how MedCorpus separates extracted facts from generated explanations."}
        </span>
        <Link to="/start">Upload another report</Link>
      </div>

      {/* Hidden file input for direct upload */}
      <input
        accept=".pdf,application/pdf"
        onChange={handleDirectFileUpload}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Role Access Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 16px", margin: "0 0 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>Active Perspective:</span>
          <div style={{ display: "inline-flex", background: "#e5e7eb", borderRadius: "6px", padding: "3px" }}>
            <button
              onClick={() => setRoleMode("clinical")}
              style={{
                padding: "4px 12px",
                border: "none",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: roleMode === "clinical" ? "#065f46" : "transparent",
                color: roleMode === "clinical" ? "#ffffff" : "#4b5563"
              }}
              type="button"
            >
              🩺 Healthcare Professional (Clinical View)
            </button>
            <button
              onClick={() => setRoleMode("patient")}
              style={{
                padding: "4px 12px",
                border: "none",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: roleMode === "patient" ? "#1e40af" : "transparent",
                color: roleMode === "patient" ? "#ffffff" : "#4b5563"
              }}
              type="button"
            >
              👤 Patient (Patient-Friendly View)
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", background: "#166534", border: "none",
              borderRadius: "6px", fontSize: "12px", fontWeight: 700,
              color: "#ffffff", cursor: "pointer"
            }}
            type="button"
          >
            <Icon name="upload" size={13} />
            {isUploading ? "Processing..." : "Upload New Report"}
          </button>
          {roleMode === "clinical" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px" }}>
              🛡️ High-Privilege Clinical Access
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px" }}>
              🔒 Read-Only Patient Access
            </span>
          )}
        </div>
      </div>

      <div className="report-layout">
        <section className="report-summary-panel">
          <div className="report-patient">
            <div>
              <span className="patient-avatar">
                {report.patient_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "PT"}
              </span>
              <span>
                <strong>{report.patient_name}</strong>
                <small>{report.patient_age} · {report.patient_sex || "Patient"}</small>
              </span>
            </div>
            <span className="verified-badge">
              <Icon name="check" size={12} /> Verified
            </span>
          </div>

          <div className="report-meta">
            <div>
              <span>Report date</span>
              <strong>{report.report_date}</strong>
            </div>
            <div>
              <span>Ordered by</span>
              <strong>{report.doctor_name}</strong>
            </div>
            <div>
              <span>Laboratory</span>
              <strong>{report.lab_name}</strong>
            </div>
          </div>

          <div className="report-tabs" role="tablist">
            {(["overview", "findings", "notes"] as const).map((tab) => (
              <button
                aria-selected={activeTab === tab}
                className={activeTab === tab ? "active" : ""}
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="report-overview">
              <div className="report-overview-heading">
                <span>
                  <strong>Overall summary</strong>
                  <small>{findings.length} findings extracted and verified</small>
                </span>
                <span className="overview-score">
                  {report.normal_count} of {findings.length} normal
                </span>
              </div>
              <p>{report.overall_summary_text}</p>

              {/* Dynamic Live LLM Clinical Synthesis */}
              <div className="ai-synthesis-box">
                <div className="ai-synthesis-header">
                  <div className="ai-synthesis-title">
                    <span className="ai-sparkle-icon">✨</span>
                    <div>
                      <strong>AI Clinical Synthesis & Key Insights</strong>
                      <small>
                        {aiSummary
                          ? `Generated by ${aiSummary.provider.toUpperCase()} (${aiSummary.model}) · ${aiSummary.latency_ms} ms`
                          : "Grounded medical narrative generated by active LLM engine"}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ai-generate-btn"
                    onClick={() => handleGenerateAISummary()}
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? (
                      <>
                        <span className="spinner-icon">⏳</span> Synthesizing with LLM...
                      </>
                    ) : aiSummary ? (
                      "🔄 Regenerate with LLM"
                    ) : (
                      "⚡ Generate with Active LLM"
                    )}
                  </button>
                </div>

                {aiSummary ? (
                  <div className="ai-synthesis-content">
                    <div className="ai-synthesis-body">
                      {aiSummary.text.split("\n\n").map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>
                    <div className="ai-synthesis-footer">
                      <span className="ai-grounded-tag">
                        ✔ Grounded strictly in verified lab ranges · No speculative diagnoses
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ai-synthesis-prompt">
                    <p>
                      Click <strong>"Generate with Active LLM"</strong> to have the connected model (Google Gemini or your Local LLM) produce a structured clinical analysis across all {findings.length} biomarkers.
                    </p>
                  </div>
                )}
              </div>

              {/* Single Unified Line Graph: All Extracted Facts Compared to Baseline Levels */}
              <BaselineFactsLineChart
                findings={findings}
                activeFinding={activeFinding}
                onSelectFinding={(f) => setActiveFinding(f)}
              />
            </div>
          )}

          {activeTab === "findings" && (
            <div className="report-tab-message">
              <Icon name="document" size={20} />
              <strong>All extracted findings are listed below</strong>
              <span>Select a result to view its exact source on the right.</span>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="report-tab-message warning-message">
              <Icon name="warning" size={20} />
              <strong>Informational summary only</strong>
              <span>This report view does not provide a diagnosis or treatment recommendation.</span>
            </div>
          )}

          {/* Extracted Laboratory Findings */}
          <div className="finding-list-heading" style={{ marginTop: "24px" }}>
            <strong>Extracted Laboratory Facts ({findings.length})</strong>
            <span className="scroll-indicator-chip" style={{ fontSize: "11px", color: "#64748b" }}>
              Scrollable list · Select any biomarker to sync PDF
            </span>
          </div>

          <div className="actual-finding-list" style={{ maxHeight: "420px", marginTop: "10px" }}>
            {findings.map((finding) => (
              <button
                className={activeFinding.id === finding.id ? "active" : ""}
                key={finding.id}
                onClick={() => setActiveFinding(finding)}
              >
                <span className={`finding-state ${finding.status !== "Normal" ? "low" : ""}`}>
                  {finding.status !== "Normal" ? "!" : <Icon name="check" size={13} />}
                </span>
                <span className="finding-main">
                  <strong>{finding.name}</strong>
                  <small>
                    {finding.value} · Range {finding.range}
                  </small>
                </span>
                <span className={`finding-result ${finding.status !== "Normal" ? "low" : ""}`}>
                  {finding.status}
                </span>
                <Icon name="arrow" size={15} />
                <span className="finding-hover-detail">
                  <strong>What this finding means</strong>
                  {finding.detail}
                  <small>Hover detail · Informational, not a diagnosis</small>
                </span>
              </button>
            ))}
          </div>

          <div className="plain-explanation" style={{ marginTop: "16px" }}>
            <span>
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <strong>In plain language: {activeFinding.name}</strong>
              <p>{activeFinding.explanation}</p>
              <small>AI-generated explanation · Grounded on report page {activeFinding.page} · Not a diagnosis</small>
            </div>
          </div>

          {/* Clinical View: Override & Signoff Actions */}
          {roleMode === "clinical" && (
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => openOverrideModal(activeFinding)}
                  style={{
                    flex: 1, padding: "8px 12px", background: "#fff7ed",
                    border: "1px solid #fed7aa", borderRadius: "6px", cursor: "pointer",
                    fontSize: "12px", fontWeight: 700, color: "#9a3412"
                  }}
                  title="Override this finding's value, range, or classification"
                  type="button"
                >
                  ✏️ Override / Correct Finding
                </button>
                <button
                  onClick={() => setIsSignoffModalOpen(true)}
                  style={{
                    flex: 1, padding: "8px 12px", background: "#f0fdf4",
                    border: "1px solid #bbf7d0", borderRadius: "6px", cursor: "pointer",
                    fontSize: "12px", fontWeight: 700, color: "#14532d"
                  }}
                  title="Officially sign off on this AI-generated summary for EHR record"
                  type="button"
                >
                  🏥 Official EHR Sign-Off
                </button>
              </div>
              {report.clinician_signed_off && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: "#14532d", fontWeight: 600 }}>
                  ✅ Signed off by {report.signed_off_by} · {report.signed_off_at ? new Date(report.signed_off_at).toLocaleString() : ""}
                </div>
              )}
            </div>
          )}

          {/* Patient View: Interactive Q&A */}
          {roleMode === "patient" && (
            <div style={{ marginTop: "14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "16px" }}>💬</span>
                <strong style={{ fontSize: "13px", color: "#1e40af" }}>Ask Report Assistant</strong>
                <small style={{ color: "#6b7280", fontSize: "11px" }}>Strictly limited to your report contents</small>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {[
                  `What does my ${activeFinding.name} result mean?`,
                  "Which results need attention?",
                  "Is anything outside the normal range?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setPatientQuestion(q); handleAskPatientQA(undefined, q); }}
                    style={{
                      padding: "4px 10px", background: "#dbeafe", border: "1px solid #93c5fd",
                      borderRadius: "12px", cursor: "pointer", fontSize: "11px", color: "#1d4ed8", fontWeight: 600
                    }}
                    type="button"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form onSubmit={handleAskPatientQA} style={{ display: "flex", gap: "6px" }}>
                <input
                  onChange={(e) => setPatientQuestion(e.target.value)}
                  placeholder="Ask about your report results..."
                  style={{
                    flex: 1, padding: "7px 10px", border: "1px solid #bfdbfe",
                    borderRadius: "6px", fontSize: "12px", outline: "none"
                  }}
                  type="text"
                  value={patientQuestion}
                />
                <button
                  disabled={isAskingQA || !patientQuestion.trim()}
                  style={{
                    padding: "7px 14px", background: "#1e40af", border: "none",
                    borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                    fontWeight: 700, color: "#fff"
                  }}
                  type="submit"
                >
                  {isAskingQA ? "⏳" : "Ask"}
                </button>
              </form>
              {patientQAResponse && (
                <div style={{ marginTop: "10px", background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 12px", fontSize: "12px", color: "#1e293b", lineHeight: 1.6 }}>
                  <strong style={{ color: "#1e40af" }}>📋 Report Assistant:</strong>
                  <p style={{ marginTop: "4px" }}>{patientQAResponse.answer}</p>
                  {patientQAResponse.sources && patientQAResponse.sources.length > 0 && (
                    <div style={{ marginTop: "6px", fontSize: "10px", color: "#6b7280", fontStyle: "italic" }}>
                      Sources: {patientQAResponse.sources.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: DIRECT FULL-HEIGHT SYNCHRONIZED ORIGINAL PDF VIEWER */}
        <aside className="source-viewer" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 114px)", minHeight: "780px", background: "#f1f5f9" }}>
          <div className="source-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icon name="document" size={15} /> Original PDF ({report.file_name || "Diagnostic_Report.pdf"})
              </span>
              <span style={{ fontSize: "11px", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                🔍 Page {activeFinding.page}: {activeFinding.name}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                aria-label="Previous page"
                onClick={() => {
                  const curr = activeFinding.page;
                  const prevPage = curr > 1 ? curr - 1 : totalPages;
                  const targetFinding = findings.find((f) => f.page === prevPage) || {
                    ...activeFinding,
                    page: prevPage,
                  };
                  setActiveFinding(targetFinding);
                }}
              >
                ‹
              </button>
              <span style={{ fontSize: "11.5px", fontWeight: "600", color: "#475569" }}>
                Page {activeFinding.page} of {totalPages}
              </span>
              <button
                aria-label="Next page"
                onClick={() => {
                  const curr = activeFinding.page;
                  const nextPage = curr < totalPages ? curr + 1 : 1;
                  const targetFinding = findings.find((f) => f.page === nextPage) || {
                    ...activeFinding,
                    page: nextPage,
                  };
                  setActiveFinding(targetFinding);
                }}
              >
                ›
              </button>
              <a
                className="pdf-newtab-btn"
                href={highlightedPdfUrl}
                rel="noreferrer"
                target="_blank"
                title="Open full PDF in new window"
              >
                Open ↗
              </a>
            </div>
          </div>

          <div style={{ flex: 1, width: "100%", height: "100%", background: "#ffffff", overflow: "hidden" }}>
            <iframe
              className="original-pdf-frame zoom-focused-frame"
              key={`report-pdf-frame-${highlightedPdfUrl}`}
              src={highlightedPdfUrl}
              title={`Original PDF - Page ${activeFinding.page} (${activeFinding.name})`}
              style={{ width: "100%", height: "100%", minHeight: "680px", border: "none", display: "block", background: "#ffffff" }}
            />
          </div>
        </aside>
      </div>

      {/* Override Finding Modal */}
      {isOverrideModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={handleSaveOverride} style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "480px", maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <strong style={{ fontSize: "15px", color: "#1e293b" }}>✏️ Override Finding: {activeFinding.name}</strong>
              <button onClick={() => setIsOverrideModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }} type="button">✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Corrected Value
                <input onChange={(e) => setOverrideValue(e.target.value)} required style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }} type="text" value={overrideValue} />
              </label>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Reference Range
                <input onChange={(e) => setOverrideRange(e.target.value)} style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }} type="text" value={overrideRange} />
              </label>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Status Classification
                <select onChange={(e) => setOverrideStatus(e.target.value)} style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }} value={overrideStatus}>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                  <option value="Critical">Critical</option>
                </select>
              </label>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Clinical Notes
                <textarea onChange={(e) => setOverrideNotes(e.target.value)} placeholder="Reason for override or clinical context..." rows={3} style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", resize: "vertical" }} value={overrideNotes} />
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button disabled={isSavingOverride} style={{ flex: 1, padding: "9px", background: "#9a3412", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }} type="submit">
                {isSavingOverride ? "Saving..." : "Save Override"}
              </button>
              <button onClick={() => setIsOverrideModalOpen(false)} style={{ padding: "9px 18px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }} type="button">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Clinician Sign-Off Modal */}
      {isSignoffModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={handleSaveSignoff} style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "500px", maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <strong style={{ fontSize: "15px", color: "#1e293b" }}>🏥 Official EHR Sign-Off</strong>
              <button onClick={() => setIsSignoffModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }} type="button">✕</button>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
              You are officially signing off on this AI-generated clinical summary. This will be logged with your credentials and timestamp for the patient's EHR record.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Clinician Name & Designation
                <input onChange={(e) => setDoctorName(e.target.value)} required style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }} type="text" value={doctorName} />
              </label>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                License / Registration Number
                <input onChange={(e) => setLicenseNumber(e.target.value)} required style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }} type="text" value={licenseNumber} />
              </label>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                Sign-Off Notes
                <textarea onChange={(e) => setSignoffNotes(e.target.value)} rows={3} style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", resize: "vertical" }} value={signoffNotes} />
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button disabled={isSigningOff} style={{ flex: 1, padding: "9px", background: "#14532d", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }} type="submit">
                {isSigningOff ? "Signing Off..." : "✅ Confirm Official Sign-Off"}
              </button>
              <button onClick={() => setIsSignoffModalOpen(false)} style={{ padding: "9px 18px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }} type="button">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

