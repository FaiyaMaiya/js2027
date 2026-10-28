import { useState, useRef, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";

// ─── Module-level styles ────────────────────────────────────────
const sectionStyle = {
  border: "1px solid #e5e7eb", padding: "clamp(14px, 2.2vw, 22px)",
  marginBottom: "18px", borderRadius: "12px", background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const labelStyle = {
  display: "block", fontWeight: "700", fontSize: "clamp(0.92rem, 1.7vw, 0.98rem)",
  marginBottom: "4px", color: "#374151",
};
const inputStyle = {
  margin: "6px 0 10px", padding: "10px 12px", width: "100%",
  maxWidth: "100%", minWidth: 0, boxSizing: "border-box",
  fontSize: "clamp(0.95rem, 1.8vw, 1rem)", border: "1px solid #d1d5db",
  borderRadius: "8px", background: "#fcfcfd", color: "#111827",
};
const buttonStyle = {
  padding: "10px 16px", fontSize: "clamp(0.95rem, 2vw, 1rem)",
  borderRadius: "8px", cursor: "pointer", border: "1px solid #d1d5db",
  background: "#f8fafc", color: "#111827", fontWeight: 600,
};
const fieldRowStyle = {
  display: "grid", gap: "8px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};
const searchInputStyle = { ...inputStyle, margin: "0 0 10px" };

// ─── Photo helper ───────────────────────────────────────────────
function getPhotoSrc(record) {
  if (record.photo_url) return record.photo_url;
  if (record.photo) return record.photo;
  return null;
}

async function createIDCardPdf(record) {
  const width = 85.6;
  const height = 53.98;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [width, height] });
  const value = (field) => String(field || "—").replace(/[\r\n]+/g, " ");
  const fitText = (text, maxWidth, fontSize = 7) => {
    pdf.setFontSize(fontSize);
    let output = value(text);
    while (output.length > 1 && pdf.getTextWidth(output) > maxWidth) {
      output = `${output.slice(0, -2)}…`;
    }
    return output;
  };
  const field = (label, text, x, y, maxWidth, fontSize = 7, align = "left") => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(label.toUpperCase(), x, y, { align });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(15, 23, 42);
    pdf.text(fitText(text, maxWidth, fontSize), x, y + 3.1, { align });
  };

  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, width, height, "F");
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(1.5, 1.5, width - 3, height - 3, 2, 2, "S");
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(2.5, 2.5, width - 5, 8, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  const headerTitle = "Julie Soso - Voter's Identification Card";
  const headerIconSize = 5.5;
  const headerGap = 2;
  const headerGroupWidth = headerIconSize + headerGap + pdf.getTextWidth(headerTitle);
  const headerGroupX = (width - headerGroupWidth) / 2;
  try {
    const headerIcon = new Image();
    headerIcon.src = "/favicon.png";
    await headerIcon.decode();
    pdf.addImage(headerIcon, "PNG", headerGroupX, 3.25, headerIconSize, headerIconSize);
  } catch (err) {
    console.error("ID card header icon error:", err);
  }
  pdf.text(headerTitle, headerGroupX + headerIconSize + headerGap, 7.8);

  const photo = { x: 5, y: 13, width: 18, height: 27 };
  const photoSrc = getPhotoSrc(record);
  let photoAdded = false;
  if (photoSrc) {
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = photoSrc;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = 540;
      const context = canvas.getContext("2d");
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const cropWidth = canvas.width / scale;
      const cropHeight = canvas.height / scale;
      context.drawImage(
        image,
        (image.naturalWidth - cropWidth) / 2,
        (image.naturalHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", photo.x, photo.y, photo.width, photo.height);
      photoAdded = true;
    } catch (err) {
      console.error("ID card photo error:", err);
    }
  }
  if (!photoAdded) {
    pdf.setFillColor(226, 232, 240);
    pdf.roundedRect(photo.x, photo.y, photo.width, photo.height, 1.5, 1.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    pdf.text("PHOTO", photo.x + photo.width / 2, photo.y + photo.height / 2, { align: "center" });
  }
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(photo.x, photo.y, photo.width, photo.height, 1.5, 1.5, "S");

  field("ID number", record.idNumber, 80.6, 14, 18.6, 7, "right");
  field("Full Name", `${record.name || ""} ${record.surname || ""}`.trim(), 26, 21.5, 22, 6.8);
  field("Contact number", record.contact, 50, 21.5, 30.6);
  field("Date of birth", record.dob, 26, 29, 18);
  field("District", record.district, 50, 29, 30.6);
  field("Sex", record.sex, 26, 36.5, 18);
  field("Village", record.village, 50, 36.5, 30.6);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(5.2);
  pdf.setTextColor(100, 116, 139);
  pdf.setDrawColor(71, 85, 105);
  pdf.setLineWidth(0.25);
  pdf.line(5, 47.3, 80.6, 47.3);
  pdf.text("SIGNATURE", 5, 46.7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(4.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Cardholder's Signature", 42.8, 49.3, { align: "center" });

  const filename = `${record.name || "voter"}-${record.surname || ""}`
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-|-$/g, "") || "voter";
  pdf.save(`${filename}-id-card.pdf`);
}

// ─── FieldBlock helper component ────────────────────────────────
function FieldBlock({ title, fields }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px", background: "#fafafa" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#111827" }}>{title}</h4>
      <div style={{ display: "grid", gap: "6px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <span style={{ color: "#6b7280", fontSize: "0.82rem", display: "block" }}>{label}</span>
            <span style={{ color: "#111827", fontWeight: 600, fontSize: "0.92rem" }}>{value || "\u2014"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Spinner component ──────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
      <div style={{ fontSize: "1.2rem", marginBottom: 8 }}>Loading...</div>
      <div
        style={{
          width: 40, height: 40, border: "4px solid #e5e7eb",
          borderTop: "4px solid #111827", borderRadius: "50%",
          animation: "spin 1s linear infinite", margin: "0 auto",
        }}
      />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

// ─── Homepage Slideshow ────────────────────────────────────────
const slideshowImages = [
  "/js-main.png", "/js-main1.jpg", "/js-main2.jpg", "/js-main3.webp",
  "/js-main4.webp", "/js-main5.jpg", "/js-main6.jpg", "/js-main7.jpg",
  "/js-main8.png", "/js-main9.jpg", "/js-main10.webp", "/js-main11.webp",
];

function Slideshow({ images, onImageClick }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

const goTo = useCallback((i) => {
    const len = images.length;
    setIndex(((i % len) + len) % len);
  }, [images.length]);

  const next = useCallback(() => setIndex((prev) => (prev + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIndex((prev) => (prev - 1 + images.length) % images.length), [images.length]);

  // Auto-advance: if not interacted, slide randomly every 3 seconds.
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((prev) => {
        const len = images.length;
        const rnd = Math.floor(Math.random() * (len - 1));
        return (prev + 1 + rnd) % len;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [paused, images.length]);

  return (
    <div
      style={{
        position: "relative", width: "100%", maxWidth: 520, margin: "0 auto",
        borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
<div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", background: "#0f172a" }}>
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
alt={`Slide ${i + 1}`}
            onClick={() => {
              setPaused(true);
              if (onImageClick) onImageClick(src);
            }}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
objectFit: "contain", objectPosition: "center",
              padding: "8px", boxSizing: "border-box",
              opacity: i === index ? 1 : 0,
              transition: "opacity 0.6s ease",
              cursor: "pointer",
              pointerEvents: i === index ? "auto" : "none",
            }}
          />
        ))}
      </div>

      {/* Left / Right navigation buttons */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="Previous image"
        style={{
          position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.45)", color: "#fff", border: "none",
          borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
          fontSize: "1.4rem", lineHeight: 1, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        &#8249;
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="Next image"
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.45)", color: "#fff", border: "none",
          borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
          fontSize: "1.4rem", lineHeight: 1, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        &#8250;
      </button>

      {/* Dots indicator */}
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
        {images.map((src, i) => (
          <span
            key={src}
            onClick={() => goTo(i)}
            style={{
              width: 10, height: 10, borderRadius: "50%", cursor: "pointer",
              background: i === index ? "#fff" : "rgba(255,255,255,0.5)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Pagination UI ──────────────────────────────────────────────
const DEFAULT_SORT = "name_asc";

const sortOptions = [
  ["name_asc", "Name (A-Z)"],
  ["name_desc", "Name (Z-A)"],
  ["idNumber_asc", "ID Number (Ascending)"],
  ["idNumber_desc", "ID Number (Descending)"],
  ["district_asc", "District (A-Z)"],
  ["llg_asc", "LLG (A-Z)"],
  ["wd_asc", "WD (A-Z)"],
  ["residence_asc", "Residence (A-Z)"],
  ["sex_asc", "Sex (A-Z)"],
];

function Pagination({ safePage, totalPages, total, onPageChange, sortBy, onSortChange }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "center", gap: "8px",
        alignItems: "center", flexWrap: "wrap", marginTop: 12,
      }}
    >
      {onSortChange && (
        <>
          <span style={{ color: "#6b7280", fontSize: "0.95rem", fontWeight: 600 }}>Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort records"
            style={{ ...inputStyle, margin: 0, width: "auto", maxWidth: 210 }}
          >
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </>
      )}
      <span style={{ color: "#6b7280", fontSize: "0.95rem" }}>
        Page {safePage} of {totalPages} (Total: {total})
      </span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button" onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          style={{ ...buttonStyle, opacity: safePage === 1 ? 0.6 : 1 }}
        >
          First
        </button>
        <button
          type="button" onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          style={{ ...buttonStyle, opacity: safePage === 1 ? 0.6 : 1 }}
        >
          Prev
        </button>
        <button
          type="button" onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          style={{ ...buttonStyle, opacity: safePage === totalPages ? 0.6 : 1 }}
        >
          Next
        </button>
        <button
          type="button" onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          style={{ ...buttonStyle, opacity: safePage === totalPages ? 0.6 : 1 }}
        >
          Last
        </button>
      </div>
    </div>
  );
}

// ─── Record list (for non-admin views) ─────────────────────────
function RecordList({
  searchTerm, onSearchChange, total, records, isLoading,
  safePage, totalPages, onPageChange, onRecordClick, onPhotoClick,
  sortBy, onSortChange,
}) {
  return (
    <>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name, ID, district, contact, residence..."
        style={searchInputStyle}
      />
      <div style={{ margin: "-2px 0 10px", color: "#4b5563", fontSize: "0.95rem" }}>
        <div>Total entries: {total}</div>
        {searchTerm.trim() && <div>Showing {records.length} matching results</div>}
      </div>
      {isLoading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <p>{searchTerm.trim() ? "No matching records found." : "No records yet."}</p>
      ) : (
        <>
          <Pagination safePage={safePage} totalPages={totalPages} total={total} onPageChange={onPageChange} sortBy={sortBy} onSortChange={onSortChange} />
          <div style={{ display: "grid", gap: "12px" }}>
            {records.map((record) => {
              const ps = getPhotoSrc(record);
              return (
                <div
                  key={record.id || record.idNumber}
                  onClick={() => onRecordClick(record)}
                  style={{
                    border: "1px solid #e5e7eb", borderRadius: "10px",
                    padding: "12px", background: "#fafafa", cursor: "pointer",
                    transition: "box-shadow 0.2s, transform 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    {ps && (
                      <img
                        src={ps} alt={record.name || ""}
                        onClick={(e) => onPhotoClick(e, ps)}
                        style={{
                          width: 80, height: 80, borderRadius: "8px",
                          objectFit: "cover", border: "1px solid #e5e7eb",
                          flexShrink: 0, cursor: "pointer",
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: 8 }}>
                        <strong style={{ color: "#000" }}>{record.name || "Unnamed"} {record.surname || ""}</strong>
                        <span style={{ color: "#6b7280" }}>ID: {record.idNumber || "\u2014"}</span>
                      </div>
                      <div style={{ display: "grid", gap: "4px", color: "#374151" }}>
                        <div><strong>District:</strong> {record.district || "\u2014"}</div>
                        <div><strong>Contact:</strong> {record.contact || "\u2014"}</div>
                        <div><strong>Residence:</strong> {record.residence || "\u2014"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination safePage={safePage} totalPages={totalPages} total={total} onPageChange={onPageChange} sortBy={sortBy} onSortChange={onSortChange} />
        </>
      )}
    </>
  );
}

// ─── Admin record list (with edit/delete) ─────────────────────
function AdminRecordList({
  searchTerm, onSearchChange, total, records, isLoading,
  safePage, totalPages, onPageChange, onPhotoClick, onRecordClick,
  editingRecordId, editingRecord, onEditChange, onSaveEdit, onCancelEdit,
  onStartEdit, onDelete, sortBy, onSortChange,
}) {
  return (
    <>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search..."
        style={searchInputStyle}
      />
      <div style={{ margin: "-2px 0 10px", color: "#4b5563", fontSize: "0.95rem" }}>
        <div>Total entries: {total}</div>
        {searchTerm.trim() && <div>Showing {records.length} matching results</div>}
      </div>
      {isLoading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <p>{searchTerm.trim() ? "No matching records found." : "No records yet."}</p>
      ) : (
        <>
          <Pagination safePage={safePage} totalPages={totalPages} total={total} onPageChange={onPageChange} sortBy={sortBy} onSortChange={onSortChange} />
          <div style={{ display: "grid", gap: "10px" }}>
            {records.map((record) => {
              const rid = record.id || record.idNumber;
              const isEd = editingRecordId === rid;
              const ps = getPhotoSrc(record);

if (isEd) {
                const editFields = [
                  { label: "ID Number", name: "idNumber", type: "text" },
                  { label: "Name", name: "name", type: "text" },
                  { label: "Surname", name: "surname", type: "text" },
                  { label: "DOB", name: "dob", type: "date" },
                  { label: "Sex", name: "sex", type: "select", options: ["Male", "Female"] },
                  { label: "Contact", name: "contact", type: "text" },
                  { label: "Residence", name: "residence", type: "text" },
                  { label: "Village", name: "village", type: "text" },
                  { label: "WD", name: "wd", type: "text" },
                  { label: "LLG", name: "llg", type: "text" },
                  { label: "District", name: "district", type: "text" },
                  { label: "Marital Status", name: "maritalStatus", type: "marital", options: ["Single", "Married", "Divorced"] },
                  { label: "Spouse Name", name: "spouseName", type: "text" },
                  { label: "Spouse Sex", name: "spouseSex", type: "select", options: ["Male", "Female"] },
                  { label: "Siblings", name: "siblings", type: "text" },
                  { label: "Spouse Village", name: "spouseVillage", type: "text" },
                  { label: "Spouse District", name: "spouseDistrict", type: "text" },
                  { label: "Spouse LLG", name: "spouseLLG", type: "text" },
                  { label: "Spouse Contact", name: "spouseContact", type: "text" },
                  { label: "Polling Place", name: "pollingPlace", type: "text" },
                  { label: "Ballot Papers", name: "ballotPapers", type: "text" },
                  { label: "Vote", name: "vote", type: "vote", options: ["Vote 1", "Vote 2", "Vote 3"] },
                  { label: "Verified By", name: "verifiedBy", type: "text" },
                  { label: "Referred By", name: "referredBy", type: "text" },
                  { label: "Official WD", name: "officialWd", type: "text" },
                  { label: "Official Village", name: "officialVillage", type: "text" },
                  { label: "Official LLG", name: "officialLLG", type: "text" },
                  { label: "Official District", name: "officialDistrict", type: "text" },
                  { label: "Signed", name: "signed", type: "text" },
                  { label: "Witness", name: "witness", type: "text" },
                  { label: "Declaration Date", name: "declarationDate", type: "date" },
                ];
                return (
                  <div
                    key={rid}
                    style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#fafafa" }}
                  >
                    <h4 style={{ margin: "0 0 10px", color: "#111827" }}>Edit Record</h4>
                    <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                      {editFields.map((f) => (
                        <div key={f.name}>
                          <label style={labelStyle}>{f.label}</label>
                          {f.type === "select" || f.type === "marital" || f.type === "vote" ? (
                            <select name={f.name} value={editingRecord[f.name] || ""} onChange={onEditChange} style={inputStyle}>
                              <option value="">--</option>
                              {(f.options || []).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.type === "date" ? "date" : "text"}
                              name={f.name}
                              value={editingRecord[f.name] || ""}
                              onChange={onEditChange}
                              readOnly={f.name === "idNumber"}
                              disabled={f.name === "idNumber"}
                              title={f.name === "idNumber" ? "ID Number cannot be changed" : undefined}
                              style={{
                                ...inputStyle,
                                ...(f.name === "idNumber"
                                  ? { background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }
                                  : {}),
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: 10 }}>
                      <button type="button" onClick={onSaveEdit} style={{ ...buttonStyle, background: "#111827", color: "#fff" }}>Save</button>
                      <button type="button" onClick={onCancelEdit} style={buttonStyle}>Cancel</button>
                    </div>
                  </div>
                );
              }

return (
                <div
                  key={rid}
                  onClick={() => onRecordClick(record)}
                  style={{
                    border: "1px solid #e5e7eb", borderRadius: "10px",
                    padding: "12px", background: "#fafafa", cursor: "pointer",
                    transition: "box-shadow 0.2s, transform 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    {ps && (
                      <img
                        src={ps} alt={record.name || ""}
                        onClick={(e) => onPhotoClick(e, ps)}
                        style={{
                          width: 80, height: 80, borderRadius: "8px",
                          objectFit: "cover", border: "1px solid #e5e7eb",
                          flexShrink: 0, cursor: "pointer",
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: 8 }}>
                        <strong style={{ color: "#000" }}>{record.name || "Unnamed"} {record.surname || ""}</strong>
                        <span style={{ color: "#6b7280" }}>ID: {record.idNumber || "\u2014"}</span>
                      </div>
                      <div style={{ display: "grid", gap: "4px", color: "#374151", marginBottom: 8 }}>
                        <div><strong>District:</strong> {record.district || "\u2014"}</div>
                        <div><strong>Contact:</strong> {record.contact || "\u2014"}</div>
                        <div><strong>Residence:</strong> {record.residence || "\u2014"}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onStartEdit(record); }} style={buttonStyle}>Edit</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(rid); }} style={{ ...buttonStyle, background: "#fee2e2", color: "#991b1b" }}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination safePage={safePage} totalPages={totalPages} total={total} onPageChange={onPageChange} sortBy={sortBy} onSortChange={onSortChange} />
        </>
      )}
    </>
  );
}

// ─── Statistics column graph ───────────────────────────────────
function StatisticsGraph({ stats, mode, onModeChange }) {
  const modes = [
    { key: "overall", label: "Overall" },
    { key: "male", label: "Male" },
    { key: "female", label: "Female" },
  ];
  const data = stats[mode] || stats.overall || { vote1: 0, vote2: 0, vote3: 0 };
  const bars = [
    { label: "Vote 1", value: data.vote1 || 0, color: "#2563eb" },
    { label: "Vote 2", value: data.vote2 || 0, color: "#16a34a" },
    { label: "Vote 3", value: data.vote3 || 0, color: "#dc2626" },
  ];
  const maxValue = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div style={sectionStyle}>
      <h3 style={{ marginTop: 0 }}>Vote Statistics</h3>
      <p style={{ margin: "0 0 16px", color: "#4b5563" }}>
        Live count of records by Vote selection.
      </p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onModeChange(m.key)}
            style={{
              ...buttonStyle,
              background: mode === m.key ? "#111827" : "#f8fafc",
              color: mode === m.key ? "#fff" : "#111827",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "32px", justifyContent: "center", height: 260 }}>
        {bars.map((bar) => {
          const height = Math.max(6, Math.round((bar.value / maxValue) * 200));
          return (
            <div key={bar.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}>{bar.value}</span>
              <div
                style={{
                  width: 70, height,
                  background: bar.color,
                  borderRadius: "8px 8px 0 0",
                  transition: "height 0.4s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              />
              <span style={{ fontWeight: 600, color: "#374151" }}>{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Form section builder ──────────────────────────────────────
function FormSection({ title, fields, formData, onFieldChange }) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={fieldRowStyle}>
        {fields.map(([label, name, type, required]) => (
          <div key={name}>
            <label style={labelStyle}>
              {label}
              {required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
            </label>
            {type === "select" ? (
              <select name={name} style={inputStyle} value={formData[name] || ""} onChange={onFieldChange}>
                <option value="">--</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
</select>
            ) : type === "marital" ? (
              <select name={name} style={inputStyle} value={formData[name] || ""} onChange={onFieldChange}>
                <option value="">--</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
              </select>
            ) : type === "vote" ? (
              <select name={name} style={inputStyle} value={formData[name] || ""} onChange={onFieldChange}>
                <option value="">--</option>
                <option value="Vote 1">Vote 1</option>
                <option value="Vote 2">Vote 2</option>
                <option value="Vote 3">Vote 3</option>
              </select>
            ) : (
              <input
                type={type === "date" ? "date" : "text"}
                name={name}
                style={inputStyle}
                value={formData[name] || ""}
                onChange={onFieldChange}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────
function App() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "";
  const recordsPerPage = 20;

  useEffect(() => {
    document.title = "Team JS - 2027 Election";
  }, []);

  // State
const [formData, setFormData] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoMethod, setPhotoMethod] = useState(""); // "" | "upload" | "camera"
const [cameraFacingMode, setCameraFacingMode] = useState("environment");
    const [isCameraActive, setIsCameraActive] = useState(false);
  const [viewMode, setViewMode] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [adminLogin, setAdminLogin] = useState({ username: "", password: "" });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingRecord, setEditingRecord] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pageData, setPageData] = useState({ records: [], total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [voteStats, setVoteStats] = useState({
    overall: { vote1: 0, vote2: 0, vote3: 0 },
    male: { vote1: 0, vote2: 0, vote3: 0 },
    female: { vote1: 0, vote2: 0, vote3: 0 },
  });
  const [statsMode, setStatsMode] = useState("overall");

  // Refs
const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const photoUploadRef = useRef(null);
  const savedRecordsHeadingRef = useRef(null);
  const adminRecordsHeadingRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const prevPageRef = useRef(currentPage);
  const searchSkipFirstRef = useRef(true);

  const { records, total, totalPages } = pageData;
const safePage = Math.min(currentPage, totalPages);

  // ── Statistics fetching ───────────────────────────────────────
const fetchVoteStats = useCallback(async () => {
    try {
const res = await fetch(`${API_BASE_URL}/api/statistics`, { credentials: "include" });
      const data = await res.json();
      if (data) {
        setVoteStats({
          overall: {
            vote1: (data.overall && data.overall.vote1) || 0,
            vote2: (data.overall && data.overall.vote2) || 0,
            vote3: (data.overall && data.overall.vote3) || 0,
          },
          male: {
            vote1: (data.male && data.male.vote1) || 0,
            vote2: (data.male && data.male.vote2) || 0,
            vote3: (data.male && data.male.vote3) || 0,
          },
          female: {
            vote1: (data.female && data.female.vote1) || 0,
            vote2: (data.female && data.female.vote2) || 0,
            vote3: (data.female && data.female.vote3) || 0,
          },
        });
      }
    } catch (err) {
      console.error("Fetch statistics error:", err);
    }
  }, [API_BASE_URL]);

  // ── Data fetching ─────────────────────────────────────────────
const fetchPage = useCallback(async (page, search, sort) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: recordsPerPage });
      if (search && search.trim()) params.set("search", search.trim());
      if (sort) params.set("sort", sort);
      const res = await fetch(`${API_BASE_URL}/api/getForms?${params}`, { credentials: "include" });
      if (res.status === 401) {
        setAdminAuthenticated(false);
        setPageData({ records: [], total: 0, totalPages: 1 });
        return;
      }
      const data = await res.json();
      if (data && data.records) {
        setPageData({
          records: data.records,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } else {
        setPageData({ records: [], total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Fetch page error:", err);
      setPageData({ records: [], total: 0, totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  // Initial load (deferred so setState is not called synchronously in the effect).
  // The debounced-search effect below skips its first run, so this is the only
  // fetch on mount (in dev StrictMode the cleanup re-arms the skip flag).
  useEffect(() => {
    const t = setTimeout(() => {
      fetchPage(1, "", DEFAULT_SORT);
      fetchVoteStats();
    }, 0);
    return () => {
      clearTimeout(t);
      searchSkipFirstRef.current = true;
    };
  }, [fetchPage, fetchVoteStats]);

  // Debounced search / sort. Skips the first run (handled by the initial-load
  // effect). When the search term or sort changes we always jump to page 1 and
  // fetch exactly once (prevPageRef is kept in sync with the reset page so the
  // page-change effect below does not double-fetch).
  useEffect(() => {
    if (searchSkipFirstRef.current) {
      searchSkipFirstRef.current = false;
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      prevPageRef.current = 1;
      setCurrentPage(1);
      fetchPage(1, searchTerm, sortBy);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, sortBy, fetchPage]);

  // Page change fetch (only when the user explicitly navigated pages or when
  // the clamp effect moves to a valid page after a delete).
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      prevPageRef.current = currentPage;
      fetchPage(currentPage, searchTerm, sortBy);
    }
  }, [currentPage, searchTerm, sortBy, fetchPage]);

  // If currentPage exceeds totalPages (e.g. after deleting the last record on a
  // page), move to the last valid page. prevPageRef is set to the OLD page first
  // so the page-change effect above fetches the clamped page.
  useEffect(() => {
    if (currentPage > totalPages) {
      prevPageRef.current = currentPage;
      const t = setTimeout(() => setCurrentPage(totalPages), 0);
      return () => clearTimeout(t);
    }
  }, [currentPage, totalPages]);

  // ── Camera ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async (facingMode = cameraFacingMode) => {
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is unavailable. Use HTTPS and allow camera permission.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      stopCamera();
      alert(err.message || "Unable to access camera. Check camera permission and try again.");
    }
  }, [cameraFacingMode, stopCamera]);

  const switchCamera = useCallback(() => {
    const nextFacingMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacingMode);
    if (streamRef.current) startCamera(nextFacingMode);
  }, [cameraFacingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const { videoWidth, videoHeight } = videoRef.current;
    if (!videoWidth || !videoHeight) return;
    const targetAspectRatio = 4 / 5;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = videoWidth;
    let sourceHeight = videoHeight;
    if (videoWidth / videoHeight > targetAspectRatio) {
      sourceWidth = videoHeight * targetAspectRatio;
      sourceX = (videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = videoWidth / targetAspectRatio;
      sourceY = (videoHeight - sourceHeight) / 2;
    }
    canvasRef.current.width = Math.round(sourceWidth);
    canvasRef.current.height = Math.round(sourceHeight);
    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    context.drawImage(
      videoRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
    setPhoto(canvasRef.current.toDataURL("image/png"));
    setFormData((prev) => ({ ...prev, photoCaptured: true }));
    stopCamera();
  }, [stopCamera]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  // ── Form handlers ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

const handlePhotoUpload = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (event) => { setPhoto(event.target.result); };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handlePhotoDelete = () => {
    setPhoto(null);
    setPhotoMethod("");
    if (photoUploadRef.current) photoUploadRef.current.value = "";
    stopCamera();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = [
      ["Name", "name"],
      ["Surname", "surname"],
      ["DOB", "dob"],
      ["Sex", "sex"],
      ["Contact", "contact"],
      ["Residence", "residence"],
      ["LLG", "llg"],
      ["District", "district"],
      ["Vote", "vote"],
    ];
    // Collect every missing required field (whitespace-only counts as empty)
    // so one message lists them all. The form is intentionally left untouched
    // here so entered data is never lost on a failed save.
    const missingFields = requiredFields
      .filter(([, key]) => !String(formData[key] || "").trim())
      .map(([label]) => label);
    if (missingFields.length > 0) {
      alert(
        `Please provide the following required field${missingFields.length > 1 ? "s" : ""}: ${missingFields.join(", ")}.`
      );
      return;
    }
    if (!photo) {
      alert("Please provide a Photo (upload or capture).");
      return;
    }
    try {
const res = await fetch(`${API_BASE_URL}/api/saveForm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...formData, photo }),
      });
const json = await res.json();
      alert(json.message || "Saved");
      setFormData({});
      setPhoto(null);
      setPhotoMethod("");
      // Records are sorted newest-first, so jump to page 1 to see the new entry.
      // prevPageRef is synced to 1 so the page-change effect does not double-fetch.
      prevPageRef.current = 1;
      setCurrentPage(1);
      fetchPage(1, searchTerm, sortBy);
      fetchVoteStats();
      // Scroll back to the top of the admin panel and prepare the form
      // for the next entry.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    }
  };

const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(adminLogin),
      });
      const json = await res.json();
      if (res.ok) {
        setAdminAuthenticated(true);
        setAdminLogin({ username: "", password: "" });
        fetchVoteStats();
      } else {
        setAdminError(json.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setAdminError("Login failed. Please try again.");
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setAdminAuthenticated(false);
    setViewMode("home");
  };

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/status`, {
          credentials: "include",
        });
        const json = await res.json();
        setAdminAuthenticated(!!json.authenticated);
      } catch (err) {
        console.error("Auth status error:", err);
        setAdminAuthenticated(false);
      }
    };
    checkAuth();
  }, [API_BASE_URL]);

  // ── Edit / Delete handlers ────────────────────────────────────
  const startEditRecord = (record) => {
    setEditingRecordId(record.id || record.idNumber);
    setEditingRecord({ ...record });
  };

  // Opens the inline edit form for a record opened from the detail card.
  // Closes the card, switches to the admin page when browsing from another
  // view, and scrolls the record list into view.
  const handleEditFromModal = () => {
    if (!selectedRecord) return;
    startEditRecord(selectedRecord);
    setSelectedRecord(null);
    if (viewMode !== "admin") {
      setViewMode("admin");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          adminRecordsHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  };

  const cancelEditRecord = () => {
    setEditingRecordId(null);
    setEditingRecord({});
  };

  const handleEditRecordChange = (e) => {
    const { name, value } = e.target;
    setEditingRecord((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditedRecord = async () => {
    if (!editingRecordId) return;
    try {
const res = await fetch(`${API_BASE_URL}/api/updateForm/${editingRecordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingRecord),
      });
      const json = await res.json();
      alert(json.message || "Updated");
      setEditingRecordId(null);
      setEditingRecord({});
      fetchPage(currentPage, searchTerm, sortBy);
      fetchVoteStats();
    } catch (err) {
      console.error(err);
      alert("Failed to update.");
    }
  };

  const deleteRecord = (recordId) => {
    setPendingDeleteId(recordId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRecord = async () => {
    if (!pendingDeleteId) return;
    try {
const res = await fetch(`${API_BASE_URL}/api/deleteForm/${pendingDeleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
const json = await res.json();
      alert(json.message || "Deleted");
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
      fetchPage(currentPage, searchTerm, sortBy);
      fetchVoteStats();
    } catch (err) {
      console.error(err);
      alert("Failed to delete.");
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
    }
  };

  const cancelDeleteRecord = () => {
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  };

  // ── Pagination ────────────────────────────────────────────────
  const handlePageChange = (page) => {
    setCurrentPage(Math.min(totalPages, Math.max(1, page)));
    requestAnimationFrame(() => {
      savedRecordsHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // ── Photo helpers ─────────────────────────────────────────────
  const handlePhotoClick = (e, src) => {
    e.stopPropagation();
    setSelectedPhoto(src);
  };

  const recordListProps = {
    searchTerm,
    onSearchChange: setSearchTerm,
    total,
    records,
    isLoading,
    safePage,
    totalPages,
    onPageChange: handlePageChange,
    onRecordClick: setSelectedRecord,
    onPhotoClick: handlePhotoClick,
    sortBy,
    onSortChange: setSortBy,
  };

  const adminRecordListProps = {
    ...recordListProps,
    editingRecordId,
    editingRecord,
    onEditChange: handleEditRecordChange,
    onSaveEdit: saveEditedRecord,
    onCancelEdit: cancelEditRecord,
    onStartEdit: startEditRecord,
    onDelete: deleteRecord,
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "clamp(12px, 3vw, 24px)", maxWidth: 1100, margin: "auto",
        fontFamily: "Arial, sans-serif", width: "100%", boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: 24, padding: "12px 0 8px" }}>
        <div
          onClick={() => setViewMode("home")}
          title="Back to Home"
          style={{
            display: "inline-flex", cursor: "pointer",
            borderRadius: "50%", overflow: "hidden",
            border: "3px solid #111827", boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
            width: "clamp(76px, 12vw, 108px)", height: "clamp(76px, 12vw, 108px)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.06)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)";
          }}
        >
          <img
            src="/js-main.png" alt="JS Main"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
        <h1 style={{ margin: "10px 0 2px", fontSize: "clamp(1.5rem, 3.2vw, 2.5rem)", letterSpacing: "0.5px" }}>
          2027 National Elections
        </h1>
        <h2 style={{
          margin: "0", fontSize: "clamp(1.05rem, 2.2vw, 1.45rem)",
          color: "#1f2937", fontWeight: 700,
        }}>
          Eastern Highlands Provincial Seat
        </h2>
        <h3 style={{
          marginTop: "8px", fontSize: "clamp(0.95rem, 1.9vw, 1.15rem)",
          color: "#374151", fontWeight: 600, fontStyle: "italic",
        }}>
          Team JS 2027 — "Good Governance"
        </h3>
      </header>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button" onClick={() => setViewMode("home")}
          style={{
            ...buttonStyle,
            background: viewMode === "home" ? "#111827" : "#f8fafc",
            color: viewMode === "home" ? "#fff" : "#111827",
          }}
        >
          Home
        </button>
        
        <button
          type="button" onClick={() => setViewMode("records")}
          style={{
            ...buttonStyle,
            background: viewMode === "records" ? "#111827" : "#f8fafc",
            color: viewMode === "records" ? "#fff" : "#111827",
          }}
        >
          View Records
        </button>
        
<button
          type="button" onClick={() => setViewMode("admin")}
          style={{
            ...buttonStyle,
            background: viewMode === "admin" ? "#111827" : "#f8fafc",
            color: viewMode === "admin" ? "#fff" : "#111827",
          }}
        >
          Admin Entry
        </button>
        
{adminAuthenticated && (
          <button
            type="button" onClick={() => { setViewMode("statistics"); fetchVoteStats(); }}
            style={{
              ...buttonStyle,
              background: viewMode === "statistics" ? "#111827" : "#f8fafc",
              color: viewMode === "statistics" ? "#fff" : "#111827",
            }}
          >
            Statistics
          </button>
        )}
        {adminAuthenticated && (
          <button
            type="button" onClick={handleAdminLogout}
            style={{ ...buttonStyle, background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
          >
            Logout
          </button>
        )}
      </div>

      {/* ── HOME VIEW ── */}
      {viewMode === "home" && (
        <div style={sectionStyle}>
          <h3 style={{ marginTop: 0 }}>Welcome</h3>
          <p style={{ marginBottom: 12, color: "#4b5563", lineHeight: 1.6 }}>
            This portal is for managing election-related submissions for Julie Soso's Voters in 2027 Papua New Guinea National General Elelction - Eastern Highlands Province Governor Seat.
          </p>
          
<div style={{ margin: "8px 0 16px" }}>
            <Slideshow images={slideshowImages} onImageClick={setSelectedPhoto} />
          </div>

{/* About the Governor */}
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>About Julie Soso</h3>
            <p style={{ margin: "0 0 12px", color: "#374151", lineHeight: 1.7, fontSize: "0.98rem" }}>
              Julie Soso Akeke (born 29 August 1960) is a Papua New Guinean politician. She was the
              Governor of Eastern Highlands Province from 2012 to 2017.
            </p>

            <h4 style={{ margin: "14px 0 6px", color: "#111827" }}>Background</h4>
            <p style={{ margin: "0 0 10px", color: "#374151", lineHeight: 1.7, fontSize: "0.95rem" }}>
              Soso was a broadcaster and women's advocate before entering politics, serving as
              president of the Eastern Highlands Provincial Council of Women and the deputy
              chairperson of the district AIDS council. She advocated a ban on firearms and
              ammunition in Papua New Guinea, called on the provincial government to ban alcohol,
              and supported reserved seats for women in parliament. She unsuccessfully contested the
              Eastern Highlands seat at the 1997, 2002 and 2007 elections. A documentary, PNG: The
              Rules of the Game, was made about her 2007 campaign.
            </p>
            <p style={{ margin: "0 0 10px", color: "#374151", lineHeight: 1.7, fontSize: "0.95rem" }}>
              Soso was married to Paul Akeke for more than thirty years. He died in June 2016.
            </p>

            <h4 style={{ margin: "14px 0 6px", color: "#111827" }}>Election to Parliament</h4>
            <p style={{ margin: "0 0 10px", color: "#374151", lineHeight: 1.7, fontSize: "0.95rem" }}>
              Soso was elected to the National Parliament at the 2012 election, winning the Eastern
              Highlands governorship on her fourth attempt. She was the first woman to be elected to
              parliament from Papua New Guinea's Highlands region. She was elected as a member of the
              Triumph Heritage Empowerment Party. Former Governor-General Sir Paulias Matane stated
              that she had "created history as the first female governor and MP in the Highlands
              region, where politics was dominated and deemed as an art for men only." In her first
              months in office, she raised concerns around the enforcement of liquor licensing in her
              province, criticised the national government for poor facilities for treating women with
              cervical and breast cancers, and joined women colleagues Loujaya Toni and Delilah Gore
              in threatening to withdraw from the government if a bill introducing reserved seats for
              women was reintroduced. She credited former MP Louis Ambane with her changed position on
              reserved seats, stating that he had convinced her that women had to compete equally. In
              December 2012, she proposed introducing a ban on polygamy.
            </p>
            <p style={{ margin: "0 0 10px", color: "#374151", lineHeight: 1.7, fontSize: "0.95rem" }}>
              In 2014, Soso was a member of the Parliamentary Referral Committee on Education, which
              looked into issues around the payment of teachers' salaries and entitlements, and was
              widely praised for its investigation. She again revisited her position on reserved
              seats for women in April 2014, arguing that the bill should be "re-looked at" because
              "women...throughout the country still say they do not have a voice." In November 2014,
              her party crossed into Opposition; although she was absent from the initial
              announcement, she subsequently announced that she would join them in Opposition. In
              2014, she initiated the Eastern Highlands Women's Credit Scheme, a women's microfinance
              scheme. In July 2015, Soso defected back to the government, leaving her party for the
              People's National Congress.
            </p>

            <h4 style={{ margin: "14px 0 6px", color: "#111827" }}>Provincial Administration Issues and Defeat</h4>
            <p style={{ margin: "0 0 10px", color: "#374151", lineHeight: 1.7, fontSize: "0.95rem" }}>
              In mid-2014, Soso faced substantial criticism for long delays in her appointment of a
              permanent administrator for the provincial government after she rejected two shortlists
              of candidates in their entirety. When the National Executive Council attempted to fill
              the position in late 2014, appointing Solomon Tato, Soso appointed her own candidate,
              resulting in a standoff as both candidates attempted to take control of the
              administration building. Soso admitted that major projects had "not been implemented
              because the provincial administration is in turmoil", but blamed her predecessor as
              Governor. She also clashed bitterly with some open MPs in the province, most
              prominently Goroka MP Bire Kimisopa.
            </p>
            <p style={{ margin: "0 0 10px", color: "#374151", lineHeight: 1.7, fontSize: "0.95rem" }}>
              In September 2015, the National Court held that Soso's nominee was acting
              administrator, being that Tato had been suspended on misappropriation charges since his
              appointment. The standoff continued, however, as Tato sought to lift his suspension and
              resume his duties, resulting in further court hearings, which resulted in the National
              Court ordering Tato's reinstatement in January 2016. In February 2016, the Supreme
              Court upheld Tato being restored to office, pending an outcome of an appeal. Soso then
              wrote to him instructing that he step down, for which the Supreme Court fined her
              K15,000 for contempt of court. Soso recontested her seat for the People's National
              Congress at the 2017 election, but was defeated.
            </p>
          </div>
          <h4 ref={savedRecordsHeadingRef} style={{ margin: "12px 0 10px" }}>Saved Records</h4>
          <RecordList {...recordListProps} />
        </div>
      )}

      {/* ── ADMIN VIEW ── */}
      {viewMode === "admin" && !adminAuthenticated && (
        <div style={sectionStyle}>
          <h3 style={{ marginTop: 0 }}>Admin Access</h3>
          {adminError && <p style={{ color: "#b91c1c", marginBottom: 10 }}>{adminError}</p>}
          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text" value={adminLogin.username}
                onChange={(e) => setAdminLogin((p) => ({ ...p, username: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showAdminPassword ? "text" : "password"}
                  value={adminLogin.password}
                  onChange={(e) => setAdminLogin((p) => ({ ...p, password: e.target.value }))}
                  style={{ ...inputStyle, paddingRight: 44, marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((visible) => !visible)}
                  aria-label={showAdminPassword ? "Hide password" : "Show password"}
                  aria-pressed={showAdminPassword}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: 6, border: 0, borderRadius: 4, background: "transparent",
                    color: "#4b5563", cursor: "pointer",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showAdminPassword ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 4 10 7a11.8 11.8 0 0 1-3 4.3" />
                        <path d="M6.6 6.6A12 12 0 0 0 2 12c1 3 5 7 10 7a10.8 10.8 0 0 0 4-.8" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" style={{ ...buttonStyle, background: "#111827", color: "#fff" }}>
              Log In
            </button>
          </form>
        </div>
      )}

      {viewMode === "admin" && adminAuthenticated && (
        <form onSubmit={handleSubmit}>
          {/* ID / Photo */}
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>ID / Photo</h3>
<div style={fieldRowStyle}>
<div>
                <label style={labelStyle}>ID Number</label>
                <input
                  name="idNumber"
                  style={{ ...inputStyle, background: "#f3f4f6", color: "#6b7280" }}
                  value={formData.idNumber || ""}
                  placeholder="ID Number Auto Generates on save"
                  readOnly
                  disabled
                />
              </div>
              
            </div>
<div style={{ marginTop: 6 }}>
              <label style={labelStyle}>
                Photo <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "6px 0 10px" }}>
                <button
                  type="button"
                  onClick={() => { setPhotoMethod("upload"); stopCamera(); }}
                  style={{
                    ...buttonStyle,
                    flex: "1 1 140px",
                    background: photoMethod === "upload" ? "#111827" : "#f8fafc",
                    color: photoMethod === "upload" ? "#fff" : "#111827",
                  }}
                >
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMethod("camera")}
                  style={{
                    ...buttonStyle,
                    flex: "1 1 140px",
                    background: photoMethod === "camera" ? "#111827" : "#f8fafc",
                    color: photoMethod === "camera" ? "#fff" : "#111827",
                  }}
                >
                  Capture with Camera
                </button>
              </div>
            </div>

            {/* Upload Photo option */}
            <div style={{ marginTop: 6 }}>
<label style={labelStyle} htmlFor="photo-upload">Upload Photo <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                id="photo-upload"
                ref={photoUploadRef}
                type="file" accept="image/*" onChange={handlePhotoUpload}
                disabled={photoMethod && photoMethod !== "upload"}
                style={{ ...inputStyle, padding: "8px 10px", opacity: photoMethod && photoMethod !== "upload" ? 0.5 : 1 }}
              />
            </div>

            {/* Camera option */}
            <div style={{ marginTop: 16, padding: 14, border: "1px solid #d1d5db", borderRadius: 10, background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Take a photo <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <span
                  role="status"
                  aria-live="polite"
                  style={{
                    padding: "4px 9px",
                    borderRadius: 999,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: isCameraActive ? "#166534" : "#475569",
                    background: isCameraActive ? "#dcfce7" : "#e2e8f0",
                  }}
                >
                  {isCameraActive ? "Camera is on" : "Camera is off"}
                </span>
              </div>
              <p style={{ margin: "6px 0 12px", color: "#475569", fontSize: "0.88rem", lineHeight: 1.5 }}>
                Start the camera, center the person in the frame, then take a photo. The captured image is saved in portrait format.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button" onClick={startCamera}
                  disabled={photoMethod && photoMethod !== "camera"}
                  style={{ ...buttonStyle, flex: "1 1 160px", background: "#111827", color: "#fff", opacity: photoMethod && photoMethod !== "camera" ? 0.5 : 1 }}
                >{isCameraActive ? "Restart camera" : "Start camera"}</button>
                <button
                  type="button" onClick={capturePhoto}
                  disabled={!isCameraActive || (photoMethod && photoMethod !== "camera")}
                  style={{ ...buttonStyle, flex: "1 1 160px", background: isCameraActive ? "#166534" : "#e2e8f0", color: isCameraActive ? "#fff" : "#64748b", opacity: photoMethod && photoMethod !== "camera" ? 0.5 : 1 }}
                >Take photo</button>
                <button
                  type="button" onClick={switchCamera}
                  disabled={!isCameraActive || (photoMethod && photoMethod !== "camera")}
                  style={{ ...buttonStyle, flex: "1 1 160px", opacity: !isCameraActive || (photoMethod && photoMethod !== "camera") ? 0.5 : 1 }}
                >
                  Use {cameraFacingMode === "environment" ? "front" : "rear"} camera
                </button>
                <button
                  type="button" onClick={stopCamera}
                  disabled={!isCameraActive || (photoMethod && photoMethod !== "camera")}
                  style={{ ...buttonStyle, flex: "1 1 140px", opacity: !isCameraActive || (photoMethod && photoMethod !== "camera") ? 0.5 : 1 }}
                >Close camera</button>
              </div>
              <div style={{ marginTop: 12, position: "relative", width: "100%", maxWidth: 560, minHeight: 180, background: "#111827", borderRadius: 8, overflow: "hidden" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera preview"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "70vh",
                    height: "auto",
                    objectFit: "contain",
                    visibility: isCameraActive ? "visible" : "hidden",
                  }}
                />
                {!isCameraActive && (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 16, color: "#fff", textAlign: "center" }}>
                    Your live camera preview will appear here.
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            {photo && (
              <div
                style={{
                  marginTop: 12, border: "1px solid #e5e7eb", borderRadius: "10px",
                  padding: "12px", background: "#fafafa",
                }}
              >
                <label style={labelStyle}>Photo Preview</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={photo}
                      alt="Photo preview"
                      onClick={() => setSelectedPhoto(photo)}
                      title="Click to view full size"
                      style={{
                        width: "100%", maxWidth: 160, height: "auto",
                        border: "1px solid #d1d5db", borderRadius: "8px",
                        cursor: "zoom-in", display: "block",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.65)",
                        color: "#fff", fontSize: "0.72rem", padding: "2px 8px",
                        borderRadius: "999px", pointerEvents: "none",
                      }}
                    >
                      Click to view full size
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      type="button" onClick={handlePhotoDelete}
                      style={{ ...buttonStyle, background: "#fee2e2", color: "#991b1b" }}
                    >
                      Delete Photo
                    </button>
                    <span style={{ color: "#6b7280", fontSize: "0.8rem", maxWidth: 220 }}>
                      {photoMethod === "upload" ? "Selected via file upload." : "Captured with the camera."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form sections */}
          <FormSection
            title="A. Personal Information"
            formData={formData}
            onFieldChange={handleChange}
fields={[
              ["Name", "name", null, true], ["Surname", "surname", null, true], ["DOB", "dob", "date", true],
              ["Sex", "sex", "select", true], ["Contact", "contact", null, true], ["Residence", "residence", null, true],
              ["Village", "village"], ["WD", "wd"], ["LLG", "llg", null, true], ["District", "district", null, true],
            ]}
          />
          <FormSection
            title="B. Spouse Information"
            formData={formData}
            onFieldChange={handleChange}
            fields={[
              ["Marital Status", "maritalStatus", "marital"], ["Spouse Name", "spouseName"],
              ["Spouse Sex", "spouseSex", "select"], ["Siblings", "siblings"],
              ["Village", "spouseVillage"], ["District", "spouseDistrict"],
              ["LLG", "spouseLLG"], ["Contact", "spouseContact"],
            ]}
          />
          <FormSection
            title="C. Official Use"
            formData={formData}
            onFieldChange={handleChange}
fields={[
              ["Polling Place", "pollingPlace"], ["Ballot Papers", "ballotPapers"],
              ["Vote", "vote", "vote", true],
              ["Verified By", "verifiedBy"], ["Referred By", "referredBy"],
              ["Official WD", "officialWd"], ["Official Village", "officialVillage"],
              ["Official LLG", "officialLLG"], ["Official District", "officialDistrict"],
            ]}
          />
          <FormSection
            title="D. Declaration"
            formData={formData}
            onFieldChange={handleChange}
            fields={[
              ["Signed", "signed"], ["Witness", "witness"], ["Date", "declarationDate", "date"],
            ]}
          />

          {/* Sticky save button */}
          <div style={{ position: "sticky", bottom: 8, zIndex: 10, marginBottom: 24, padding: "10px 0", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)" }}>
            <button type="submit" style={{ ...buttonStyle, width: "100%", maxWidth: 280 }}>Save Form</button>
          </div>

          {/* Admin records management */}
          <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
            <h3 ref={adminRecordsHeadingRef} style={{ margin: "0 0 10px" }}>Manage Saved Records</h3>
            <p style={{ margin: "0 0 12px", color: "#4b5563" }}>Review, edit, or delete saved entries.</p>
            <AdminRecordList {...adminRecordListProps} />
          </div>
        </form>
      )}

{/* ── RECORDS VIEW ── */}
      {viewMode === "records" && (
        <div style={sectionStyle}>
          <h3 ref={savedRecordsHeadingRef} style={{ marginTop: 0 }}>Saved Records</h3>
          <p style={{ marginBottom: 12, color: "#4b5563" }}>Browse the saved submissions below.</p>
          <RecordList {...recordListProps} />
        </div>
      )}

{/* ── STATISTICS VIEW ── */}
      {viewMode === "statistics" && adminAuthenticated && (
        <StatisticsGraph stats={voteStats} mode={statsMode} onModeChange={setStatsMode} />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div
          onClick={cancelDeleteRecord}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: "12px", padding: "28px 32px",
              maxWidth: 400, width: "90%",
              boxShadow: "0 8px 30px rgba(0,0,0,0.2)", textAlign: "center",
            }}
          >
            <h3 style={{ margin: "0 0 12px", color: "#111827" }}>Confirm Delete</h3>
            <p style={{ margin: "0 0 20px", color: "#4b5563" }}>Are you sure you want to delete?</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button" onClick={confirmDeleteRecord}
                style={{
                  padding: "10px 28px", fontSize: "1rem", borderRadius: "8px",
                  cursor: "pointer", border: "none", background: "#dc2626",
                  color: "#fff", fontWeight: 600,
                }}
              >
                Yes
              </button>
              <button
                type="button" onClick={cancelDeleteRecord}
                style={{
                  padding: "10px 28px", fontSize: "1rem", borderRadius: "8px",
                  cursor: "pointer", border: "1px solid #d1d5db",
                  background: "#f8fafc", color: "#111827", fontWeight: 600,
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Fullscreen Modal ── */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)", display: "flex",
            alignItems: "center", justifyContent: "center",
            zIndex: 3000, cursor: "pointer", padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative", background: "#fff", borderRadius: "12px",
              padding: "16px", maxWidth: "94vw", display: "flex",
              flexDirection: "column", alignItems: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: "absolute", top: -44, right: -8, background: "none",
                border: "none", fontSize: "2.4rem", cursor: "pointer",
                color: "#fff", lineHeight: 1,
              }}
            >
              &times;
            </button>
            <img
              src={selectedPhoto} alt="Full size"
              style={{
                maxWidth: "90vw", maxHeight: "78vh", borderRadius: "8px",
                display: "block",
              }}
            />
            <div
              style={{
                display: "flex", alignItems: "center", gap: 12, marginTop: 12,
                flexWrap: "wrap", justifyContent: "center",
              }}
            >
              <span style={{ color: "#4b5563", fontSize: "0.9rem" }}>
                Full-size photo — for confirmation only.
              </span>
              {selectedPhoto === photo && (
                <button
                  type="button"
                  onClick={() => { setSelectedPhoto(null); handlePhotoDelete(); }}
                  style={{ ...buttonStyle, background: "#fee2e2", color: "#991b1b" }}
                >
                  Delete Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Record Detail Modal ── */}
      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center",
            zIndex: 2000, padding: "20px", overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: "16px", maxWidth: 680, width: "100%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)", padding: "28px 32px",
              position: "relative", maxHeight: "90vh", overflowY: "auto",
            }}
          >
            <button
              onClick={() => setSelectedRecord(null)}
              style={{
                position: "absolute", top: 12, right: 16, background: "none",
                border: "none", fontSize: "1.8rem", cursor: "pointer",
                color: "#6b7280", lineHeight: 1,
              }}
            >
              &times;
            </button>

            {adminAuthenticated && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", margin: "0 28px 14px 0" }}>
                <button
                  type="button"
                  onClick={handleEditFromModal}
                  style={buttonStyle}
                >
                  Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => createIDCardPdf(selectedRecord)}
                  style={{
                    ...buttonStyle,
                    background: "#0f172a",
                    color: "#fff",
                    borderColor: "#0f172a",
                  }}
                >
                  Create ID Card
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: 20 }}>
              {getPhotoSrc(selectedRecord) && (
                <img
                  src={getPhotoSrc(selectedRecord)}
                  alt={`${selectedRecord.name || "Unnamed"} ${selectedRecord.surname || ""}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedPhoto(getPhotoSrc(selectedRecord)); }}
                  style={{
                    width: 160, height: 160, borderRadius: "12px",
                    objectFit: "cover", border: "1px solid #e5e7eb",
                    flexShrink: 0, cursor: "pointer",
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.5rem", color: "#000" }}>
                  {selectedRecord.name || "Unnamed"} {selectedRecord.surname || ""}
                </h2>
                <p style={{ margin: "0 0 4px", color: "#6b7280" }}>
                  ID: {selectedRecord.idNumber || "\u2014"}
                </p>
                {selectedRecord.dob && (
                  <p style={{ margin: "0", color: "#6b7280" }}>DOB: {selectedRecord.dob}</p>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <FieldBlock
                title="A. Personal Information"
                fields={[
                  ["Name", selectedRecord.name], ["Surname", selectedRecord.surname],
                  ["DOB", selectedRecord.dob], ["Sex", selectedRecord.sex],
                  ["Contact", selectedRecord.contact], ["Residence", selectedRecord.residence],
                  ["Village", selectedRecord.village], ["WD", selectedRecord.wd],
                  ["LLG", selectedRecord.llg], ["District", selectedRecord.district],
                ]}
              />
<FieldBlock
                title="B. Spouse Information"
                fields={[
                  ["Marital Status", selectedRecord.maritalStatus],
                  ["Spouse Name", selectedRecord.spouseName],
                  ["Spouse Sex", selectedRecord.spouseSex],
                  ["Siblings", selectedRecord.siblings],
                  ["Spouse Village", selectedRecord.spouseVillage],
                  ["Spouse District", selectedRecord.spouseDistrict],
                  ["Spouse LLG", selectedRecord.spouseLLG],
                  ["Spouse Contact", selectedRecord.spouseContact],
                ]}
              />
              {adminAuthenticated && (
                <>
                  <FieldBlock
                    title="C. Official Use"
                    fields={[
                      ["Polling Place", selectedRecord.pollingPlace],
                      ["Ballot Papers", selectedRecord.ballotPapers],
                      ["Vote", selectedRecord.vote],
                      ["Verified By", selectedRecord.verifiedBy],
                      ["Referred By", selectedRecord.referredBy],
                      ["Official WD", selectedRecord.officialWd],
                      ["Official Village", selectedRecord.officialVillage],
                      ["Official LLG", selectedRecord.officialLLG],
                      ["Official District", selectedRecord.officialDistrict],
                    ]}
                  />
                  <FieldBlock
                    title="D. Declaration"
                    fields={[
                      ["Signed", selectedRecord.signed],
                      ["Witness", selectedRecord.witness],
                      ["Date", selectedRecord.declarationDate],
                    ]}
                  />
                </>
              )}
</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
