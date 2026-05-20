import { useCallback, useEffect, useRef, useState } from 'react';
import { HiCamera, HiX } from 'react-icons/hi';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
};

export function LivenessSelfieModal({ open, onClose, onUploaded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    const v = videoRef.current;
    if (v) v.srcObject = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setCameraError(null);
      return;
    }

    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play().catch(() => {});
          setCameraReady(true);
        }
      } catch {
        if (!cancelled) {
          setCameraError('Camera access is required for the liveness check.');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !capturing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, capturing, onClose]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !streamRef.current || !cameraReady || capturing) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      toast.error('Camera is not ready yet');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    setCapturing(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) {
        toast.error('Could not capture image');
        return;
      }
      const fd = new FormData();
      fd.append('file', blob, 'liveness-selfie.jpg');
      await api.post('/v1/professional/upload-liveness-selfie', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Liveness selfie submitted');
      stopStream();
      onUploaded();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Failed to upload selfie');
    } finally {
      setCapturing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[62] flex items-center justify-center p-4 bg-black/60"
      onClick={() => !capturing && onClose()}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="liveness-modal-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div>
            <h3 id="liveness-modal-title" className="text-lg font-semibold text-gray-900">
              Liveness check
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Position your face in the frame, then capture. This is separate from your profile
              photo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !capturing && onClose()}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
            aria-label="Close"
            disabled={capturing}
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/5] max-h-[min(55vh,420px)] mx-auto">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
              playsInline
              muted
              autoPlay
            />
            {!cameraError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-[min(72%,220px)] aspect-[3/4] rounded-[50%] border-[3px] border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  aria-hidden
                />
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900 text-center">
                <p className="text-sm text-white">{cameraError}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => !capturing && onClose()}
              className="h-10 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
              disabled={capturing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCapture()}
              disabled={!cameraReady || !!cameraError || capturing}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:pointer-events-none"
            >
              <HiCamera className="w-4 h-4" />
              {capturing ? 'Uploading…' : 'Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
