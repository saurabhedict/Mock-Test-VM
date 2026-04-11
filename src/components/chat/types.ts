export type ChatAttachmentKind = "image" | "pdf" | "text";

export interface ChatAttachment {
  id: string;
  name: string;
  kind: ChatAttachmentKind;
  mimeType: string;
  size: number;
  previewUrl?: string;
  extractedText?: string;
  imageDataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string | null;
  attachments?: ChatAttachment[];
}

export interface ChatSessionSummary {
  sessionId: string;
  title: string;
  contextLabel?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastMessagePreview?: string;
  messageCount: number;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[];
}
