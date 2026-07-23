// Generates lightweight SVG "packaging" illustrations as a fallback for
// products with no real photos (used by both the dummy catalog and any live
// WooCommerce products missing images) — looks like the right container type
// (bottle/jar/tube/pouch) instead of a plain color block.

const BRAND_COLORS = {
  Dabur: "#005F33",
  Baidyanath: "#8B5E34",
  Zandu: "#B45309",
  Himalaya: "#166534",
  Kottakkal: "#7C2D12",
  Patanjali: "#D4AF37",
  "SB Ayurveda": "#005F33",
};

function packagingType(name, packSize = "") {
  const s = `${name} ${packSize}`.toLowerCase();
  if (s.includes("oil")) return "bottle-oil";
  if (s.includes("gel") || s.includes("face wash") || s.includes("aloe vera gel")) return "tube";
  if (s.includes("syrup") || s.includes("juice") || s.includes("arishtam")) return "bottle-liquid";
  if (s.includes("churna") || s.includes("powder") || s.includes("mix") || s.includes("kadha")) return "pouch";
  if (s.includes("capsule")) return "jar-capsule";
  if (s.includes("tablet") || s.includes("vati")) return "bottle-tablet";
  if (s.includes("resin") || s.includes("shilajit")) return "jar-small";
  if (s.includes("combo") || s.includes("kit")) return "box";
  if (s.includes("face pack") || s.includes("multani") || s.includes("mitti")) return "jar-wide";
  return "bottle-tablet";
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapLabel(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

// Each packaging type defines its container markup plus the exact bounds of
// the white label patch, so text can always be centered inside it.
const SHAPES = {
  "bottle-oil": {
    label: { x: 160, y: 225, w: 90, h: 75 },
    body: (color, accent) => `
      <rect x="185" y="90" width="40" height="30" rx="6" fill="${accent}"/>
      <rect x="170" y="115" width="70" height="25" rx="10" fill="${color}" opacity="0.9"/>
      <path d="M175 138 h60 a12 12 0 0 1 12 12 v170 a14 14 0 0 1-14 14 h-56 a14 14 0 0 1-14-14 v-170 a12 12 0 0 1 12-12 z" fill="${color}"/>
    `,
  },
  "bottle-liquid": {
    label: { x: 155, y: 235, w: 100, h: 80 },
    body: (color, accent) => `
      <rect x="188" y="85" width="34" height="22" rx="4" fill="${accent}"/>
      <path d="M180 107 h50 l8 40 v170 a16 16 0 0 1-16 16 h-34 a16 16 0 0 1-16-16 v-170 z" fill="${color}"/>
    `,
  },
  tube: {
    label: { x: 160, y: 195, w: 90, h: 60 },
    body: (color, accent) => `
      <path d="M195 90 h20 l10 30 h-40 z" fill="${accent}"/>
      <path d="M170 120 h70 a10 10 0 0 1 10 10 v190 a30 30 0 0 1-30 30 h-30 a30 30 0 0 1-30-30 v-190 a10 10 0 0 1 10-10 z" fill="${color}"/>
    `,
  },
  pouch: {
    label: { x: 155, y: 218, w: 100, h: 72 },
    body: (color, accent) => `
      <path d="M165 110 h80 l15 30 v170 a20 20 0 0 1-20 20 h-70 a20 20 0 0 1-20-20 v-170 z" fill="${color}"/>
      <rect x="165" y="108" width="80" height="18" rx="8" fill="${accent}"/>
    `,
  },
  "jar-capsule": {
    label: { x: 150, y: 218, w: 110, h: 72 },
    body: (color, accent) => `
      <rect x="165" y="95" width="80" height="20" rx="4" fill="${accent}"/>
      <rect x="158" y="112" width="94" height="200" rx="16" fill="${color}"/>
    `,
  },
  "jar-small": {
    label: { x: 160, y: 128, w: 90, h: 48 },
    body: (color, accent) => `
      <rect x="175" y="90" width="60" height="18" rx="4" fill="${accent}"/>
      <rect x="168" y="105" width="74" height="90" rx="14" fill="${color}"/>
    `,
  },
  "jar-wide": {
    label: { x: 140, y: 198, w: 130, h: 48 },
    body: (color, accent) => `
      <rect x="150" y="110" width="110" height="26" rx="6" fill="${accent}"/>
      <rect x="145" y="132" width="120" height="130" rx="18" fill="${color}"/>
    `,
  },
  box: {
    label: { x: 150, y: 168, w: 110, h: 92 },
    body: (color, accent) => `
      <rect x="130" y="110" width="150" height="180" rx="8" fill="${color}"/>
      <rect x="130" y="110" width="150" height="34" rx="8" fill="${accent}"/>
    `,
  },
  "bottle-tablet": {
    label: { x: 158, y: 178, w: 94, h: 62 },
    body: (color, accent) => `
      <rect x="180" y="90" width="50" height="20" rx="6" fill="${accent}"/>
      <rect x="168" y="108" width="74" height="200" rx="18" fill="${color}"/>
    `,
  },
};

function svgDataUri(product, variant = 0) {
  const color = BRAND_COLORS[product.brand] || "#005F33";
  const accent = "#D4AF37";
  const type = packagingType(product.name, product.packSize);
  const shape = SHAPES[type] || SHAPES["bottle-tablet"];
  const bgShift = ["#FBF8F1", "#F3EFE4", "#EFF5F0"][variant % 3];

  const { x, y, w, h } = shape.label;
  const maxChars = Math.max(8, Math.round(w / 6.2));
  const lines = wrapLabel(product.name, maxChars);
  const fontSize = lines.length >= 3 ? 11 : 13;
  const lineHeight = fontSize + 4;
  const textStartY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize / 3;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${bgShift}"/>
    <circle cx="200" cy="205" r="150" fill="${color}" opacity="0.06"/>
    ${shape.body(color, accent)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="white" opacity="0.94"/>
    <text x="${x + w / 2}" y="${textStartY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${color}" text-anchor="middle">
      ${lines.map((l, i) => `<tspan x="${x + w / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l)}</tspan>`).join("")}
    </text>
    <text x="200" y="370" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="${color}" text-anchor="middle" opacity="0.7">${escapeXml(product.brand)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function productImages(product) {
  return [svgDataUri(product, 0), svgDataUri(product, 1), svgDataUri(product, 2)];
}
