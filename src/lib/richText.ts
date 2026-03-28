const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const DROP_CONTENT_TAGS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);
const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ALLOWED_TAGS = new Set([
  "br",
  "p",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "math",
  "mrow",
  "mi",
  "mn",
  "mo",
  "msup",
  "msub",
  "msubsup",
  "mfrac",
  "msqrt",
  "mroot",
  "mfenced",
  "mtable",
  "mtr",
  "mtd",
  "mstyle",
  "mspace",
  "mtext",
  "munderover",
  "munder",
  "mover",
  "semantics",
  "annotation",
  "annotation-xml",
  "svg",
  "g",
  "path",
  "line",
  "rect",
  "circle",
  "ellipse",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "use",
  "clippath",
  "symbol",
]);

const MATHML_TAGS = new Set([
  "math",
  "mrow",
  "mi",
  "mn",
  "mo",
  "msup",
  "msub",
  "msubsup",
  "mfrac",
  "msqrt",
  "mroot",
  "mfenced",
  "mtable",
  "mtr",
  "mtd",
  "mstyle",
  "mspace",
  "mtext",
  "munderover",
  "munder",
  "mover",
  "semantics",
  "annotation",
  "annotation-xml",
]);

const SVG_TAGS = new Set([
  "svg",
  "g",
  "path",
  "line",
  "rect",
  "circle",
  "ellipse",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "use",
  "clippath",
  "symbol",
]);

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["style"]);
const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  math: new Set(["display", "xmlns"]),
  mstyle: new Set(["displaystyle", "mathsize", "mathcolor", "scriptlevel"]),
  mtable: new Set(["columnalign", "rowalign"]),
  mtd: new Set(["columnspan", "rowspan"]),
  annotation: new Set(["encoding"]),
  "annotation-xml": new Set(["encoding"]),
  svg: new Set(["xmlns", "viewBox", "width", "height", "fill", "stroke", "stroke-width", "preserveAspectRatio"]),
  g: new Set(["fill", "stroke", "stroke-width", "transform"]),
  path: new Set(["d", "fill", "stroke", "stroke-width", "transform"]),
  line: new Set(["x1", "y1", "x2", "y2", "stroke", "stroke-width", "transform"]),
  rect: new Set(["x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width", "transform"]),
  circle: new Set(["cx", "cy", "r", "fill", "stroke", "stroke-width", "transform"]),
  ellipse: new Set(["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width", "transform"]),
  polyline: new Set(["points", "fill", "stroke", "stroke-width", "transform"]),
  polygon: new Set(["points", "fill", "stroke", "stroke-width", "transform"]),
  text: new Set(["x", "y", "dx", "dy", "fill", "stroke", "stroke-width", "transform", "textLength", "lengthAdjust"]),
  tspan: new Set(["x", "y", "dx", "dy", "fill", "stroke", "stroke-width", "transform", "textLength", "lengthAdjust"]),
  defs: new Set([]),
  use: new Set(["href", "xlink:href", "x", "y", "width", "height", "transform"]),
  clippath: new Set(["id", "transform"]),
  symbol: new Set(["id", "viewBox", "preserveAspectRatio"]),
};

const MATH_WRAPPER_CLASS_PATTERNS = [/katex/i, /mathjax/i, /math-container/i, /mathml/i];

const ALLOWED_STYLE_PROPERTIES = new Set([
  "font-style",
  "font-weight",
  "text-decoration",
  "vertical-align",
  "font-size",
  "font-family",
  "white-space",
  "text-align",
  "margin-left",
  "margin-right",
  "padding-left",
  "letter-spacing",
]);

const SAFE_STYLE_VALUE = /^[\w\s.%(),\-+/'":#]+$/;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const plainTextToHtml = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br />");

const sanitizeStyle = (styleText: string) =>
  styleText
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [property, ...rest] = rule.split(":");
      const normalizedProperty = property?.trim().toLowerCase();
      const normalizedValue = rest.join(":").trim();

      if (!normalizedProperty || !normalizedValue) return null;
      if (!ALLOWED_STYLE_PROPERTIES.has(normalizedProperty)) return null;
      if (!SAFE_STYLE_VALUE.test(normalizedValue)) return null;

      return `${normalizedProperty}: ${normalizedValue}`;
    })
    .filter(Boolean)
    .join("; ");

const isMathWrapper = (element: HTMLElement, tag: string) => {
  if (tag === "mjx-container") return true;
  const className = typeof element.className === "string" ? element.className : "";
  return MATH_WRAPPER_CLASS_PATTERNS.some((pattern) => pattern.test(className));
};

const createSafeTextFallback = (doc: Document, value: string) => {
  const trimmed = value.trim();
  return trimmed ? doc.createTextNode(trimmed) : null;
};

const sanitizeNode = (node: Node, doc: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (DROP_CONTENT_TAGS.has(tag)) return null;

  if (isMathWrapper(element, tag)) {
    const mathOrGraphicNode = element.querySelector("math, svg");
    if (mathOrGraphicNode) {
      return sanitizeNode(mathOrGraphicNode, doc);
    }

    const texAnnotation = element.querySelector("annotation[encoding*='tex']");
    if (texAnnotation?.textContent) {
      return createSafeTextFallback(doc, `$${texAnnotation.textContent}$`);
    }

    return createSafeTextFallback(doc, element.textContent || "");
  }

  const childNodes = Array.from(element.childNodes)
    .map((child) => sanitizeNode(child, doc))
    .filter((child): child is Node => Boolean(child));

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment();
    childNodes.forEach((child) => fragment.appendChild(child));
    return fragment;
  }

  const cleanElement = MATHML_TAGS.has(tag)
    ? doc.createElementNS(MATHML_NAMESPACE, tag)
    : SVG_TAGS.has(tag)
      ? doc.createElementNS(SVG_NAMESPACE, tag)
      : doc.createElement(tag);

  Array.from(element.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    const allowedForTag = TAG_ALLOWED_ATTRIBUTES[tag];

    if (!GLOBAL_ALLOWED_ATTRIBUTES.has(attributeName) && !allowedForTag?.has(attributeName)) {
      return;
    }

    if ((attributeName === "href" || attributeName === "xlink:href") && !attribute.value.startsWith("#")) {
      return;
    }

    if (attributeName === "style") {
      const sanitizedStyle = sanitizeStyle(attribute.value);
      if (sanitizedStyle) {
        cleanElement.setAttribute("style", sanitizedStyle);
      }
      return;
    }

    cleanElement.setAttribute(attribute.name, attribute.value);
  });

  childNodes.forEach((child) => cleanElement.appendChild(child));
  return cleanElement;
};

export const sanitizeRichText = (value: string) => {
  if (!value?.trim()) return "";

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${value}</div>`, "text/html");
  const wrapper = parsed.body.firstElementChild || parsed.body;
  const cleanDocument = document.implementation.createHTMLDocument("");
  const container = cleanDocument.createElement("div");

  Array.from(wrapper.childNodes).forEach((child) => {
    const cleanChild = sanitizeNode(child, cleanDocument);
    if (cleanChild) {
      container.appendChild(cleanChild);
    }
  });

  return container.innerHTML.trim();
};

export const normalizeRichText = (value: string) => {
  if (!value?.trim()) return "";
  return HTML_TAG_PATTERN.test(value) ? sanitizeRichText(value) : plainTextToHtml(value);
};

export const isRichTextBlank = (value: string) => {
  if (!value?.trim()) return true;
  const normalized = normalizeRichText(value);
  if (!normalized) return true;
  const parser = new DOMParser();
  const parsed = parser.parseFromString(normalized, "text/html");
  const text = parsed.body.textContent?.replace(/\u00a0/g, " ").trim() || "";
  return text.length === 0;
};
