import { useRef, useState, type ChangeEvent } from "react";
import { Camera, RefreshCw } from "lucide-react";

interface SelfieCaptureProps {
  onChange: (blob: Blob | null) => void;
}

// Opens the front camera (on mobile) to capture a selfie; shows a preview.
export function SelfieCapture({ onChange }: SelfieCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary"
      >
        {preview ? (
          <>
            <img src={preview} alt="Selfie" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 right-1 rounded-full bg-background/90 p-1.5 shadow">
              <RefreshCw className="h-4 w-4" />
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="h-7 w-7" />
            <span className="text-xs">Tap to capture</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onPick}
      />
      <p className="text-xs text-muted-foreground">Selfie (optional)</p>
    </div>
  );
}
