import { useState } from "react";
import { cn } from "@/lib/utils";

type IntrinsicImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  trimWhitespace?: boolean;
};

const getDisplaySrc = (src?: string, trimWhitespace?: boolean) => {
  if (!src || !trimWhitespace) return src;
  if (!src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) return src;
  if (src.includes("/image/upload/e_trim")) return src;

  return src.replace("/image/upload/", "/image/upload/e_trim:20,f_png,q_100/");
};

export default function IntrinsicImage({ className, onLoad, style, trimWhitespace = false, src, ...props }: IntrinsicImageProps) {
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const displaySrc = getDisplaySrc(src, trimWhitespace);

  return (
    <img
      {...props}
      src={displaySrc}
      loading={props.loading ?? "lazy"}
      decoding={props.decoding ?? "async"}
      onLoad={(event) => {
        setNaturalWidth(event.currentTarget.naturalWidth || null);
        onLoad?.(event);
      }}
      className={cn("block self-start max-w-full rounded border bg-white object-contain shadow-sm", className)}
      style={{
        ...style,
        width: naturalWidth ? `${naturalWidth}px` : style?.width,
        maxWidth: "100%",
        height: "auto",
        imageRendering: "auto",
      }}
    />
  );
}
