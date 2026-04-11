import type { ChatAttachment } from "@/components/chat/types";

const PDFJS_VERSION = "4.8.69";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
const MAX_EXTRACTED_TEXT_LENGTH = 12000;

type PdfTextItem = { str?: string };
type PdfTextContent = { items: PdfTextItem[] };
type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
type PdfDocument = { numPages: number; getPage: (pageNumber: number) => Promise<PdfPage> };
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;

const createLocalId = () =>
  globalThis.crypto?.randomUUID?.() || `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const truncateText = (value: string, limit = MAX_EXTRACTED_TEXT_LENGTH) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) {
    return cleaned;
  }

  return `${cleaned.slice(0, limit).trim()}...`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const isPdfFile = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

const isTextFile = (file: File) =>
  file.type.startsWith("text/") || /\.(txt|md|csv|json|js|jsx|ts|tsx|html|css|xml|yaml|yml)$/i.test(file.name);

const loadPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = import(/* @vite-ignore */ PDFJS_MODULE_URL).then((module) => {
      const pdfJs = module as PdfJsModule;
      pdfJs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfJs;
    });
  }

  return pdfJsPromise;
};

const extractPdfText = async (file: File) => {
  try {
    const pdfJs = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const documentRef = await pdfJs.getDocument({ data }).promise;
    const pageLimit = Math.min(documentRef.numPages, 8);
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await documentRef.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pageTexts.push(textContent.items.map((item) => item.str || "").join(" "));

      if (pageTexts.join(" ").length >= MAX_EXTRACTED_TEXT_LENGTH) {
        break;
      }
    }

    return truncateText(pageTexts.join(" "));
  } catch {
    return "";
  }
};

const prepareImageAttachment = async (file: File): Promise<ChatAttachment> => {
  const dataUrl = await readFileAsDataUrl(file);

  return {
    id: createLocalId(),
    name: file.name,
    kind: "image",
    mimeType: file.type || "image/png",
    size: file.size,
    previewUrl: dataUrl,
    imageDataUrl: dataUrl,
  };
};

const preparePdfAttachment = async (file: File): Promise<ChatAttachment> => ({
  id: createLocalId(),
  name: file.name,
  kind: "pdf",
  mimeType: file.type || "application/pdf",
  size: file.size,
  extractedText: await extractPdfText(file),
});

const prepareTextAttachment = async (file: File): Promise<ChatAttachment> => ({
  id: createLocalId(),
  name: file.name,
  kind: "text",
  mimeType: file.type || "text/plain",
  size: file.size,
  extractedText: truncateText(await file.text()),
});

export const isSupportedChatAttachment = (file: File) =>
  file.type.startsWith("image/") || isPdfFile(file) || isTextFile(file);

export const prepareChatAttachment = async (file: File): Promise<ChatAttachment | null> => {
  if (file.type.startsWith("image/")) {
    return prepareImageAttachment(file);
  }

  if (isPdfFile(file)) {
    return preparePdfAttachment(file);
  }

  if (isTextFile(file)) {
    return prepareTextAttachment(file);
  }

  return null;
};
