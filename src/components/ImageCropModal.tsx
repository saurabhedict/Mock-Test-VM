import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  imageSrc: string;
  onCropDone: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });

const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas is empty"));
    }, "image/jpeg", 0.95);
  });
};

export default function ImageCropModal({ imageSrc, onCropDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_: unknown, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleDone = async () => {
    if (!croppedAreaPixels) return;
    setLoading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropDone(blob);
    } catch {
      console.error("Crop failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Adjust Your Photo</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel crop"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative w-full h-72 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-4">

          {/* Zoom */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ZoomIn className="h-3.5 w-3.5 text-primary" /> Zoom
              </span>
              <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                aria-label="Zoom out"
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom level"
                className="flex-1 accent-primary"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                aria-label="Zoom in"
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-primary" /> Rotate
              </span>
              <span className="text-xs text-muted-foreground">{rotation}°</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRotation((r) => Math.max(-180, r - 90))}
                aria-label="Rotate left"
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <RotateCw className="h-4 w-4 text-muted-foreground scale-x-[-1]" />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                aria-label="Rotation angle"
                className="flex-1 accent-primary"
              />
              <button
                type="button"
                onClick={() => setRotation((r) => Math.min(180, r + 90))}
                aria-label="Rotate right"
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <RotateCw className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleDone}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Uploading...
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Apply & Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}