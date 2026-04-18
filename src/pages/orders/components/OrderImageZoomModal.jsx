import { useEffect, useRef, useState } from 'react';

export default function OrderImageZoomModal({ isOpen, imageUrl, onClose }) {
  const handleClose = () => {
    onClose?.();
  };

  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const imageContainerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
    setIsDragging(false);
    setDragStart({ x: 0, y: 0, panX: 0, panY: 0 });
    setImageNaturalSize({ w: 0, h: 0 });
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/70 flex items-center justify-center p-4 overscroll-none touch-none"
      onClick={handleClose}
      onWheelCapture={(e) => e.preventDefault()}
    >
      <div className="relative w-full max-w-4xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white text-gray-700 shadow flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
        >
          ×
        </button>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-600">Zoom</div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setImageZoom((z) => {
                    const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                    if (next === 1) setImagePan({ x: 0, y: 0 });
                    return next;
                  });
                }}
                className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
              >
                -
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={imageZoom}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setImageZoom(next);
                  if (next === 1) setImagePan({ x: 0, y: 0 });
                }}
                className="w-48 accent-emerald-600"
              />
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
              >
                +
              </button>
              <span className="text-xs text-gray-600 w-14 text-center">{Math.round(imageZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => {
                  setImageZoom(1);
                  setImagePan({ x: 0, y: 0 });
                }}
                className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
          <div
            ref={imageContainerRef}
            className="flex-1 bg-black/5 flex items-center justify-center p-2 overflow-hidden"
            onWheel={(e) => {
              if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
              e.preventDefault();
              setImageZoom((z) => {
                const next = Math.min(3, Math.max(1, Number((z + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(2))));
                if (next === 1) setImagePan({ x: 0, y: 0 });
                return next;
              });
            }}
            onPointerDown={(e) => {
              if (imageZoom <= 1) return;
              setIsDragging(true);
              setDragStart({ x: e.clientX, y: e.clientY, panX: imagePan.x, panY: imagePan.y });
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!isDragging || imageZoom <= 1) return;
              const dx = e.clientX - dragStart.x;
              const dy = e.clientY - dragStart.y;
              const container = imageContainerRef.current;
              if (!container || !imageNaturalSize.w || !imageNaturalSize.h) return;
              const containerRect = container.getBoundingClientRect();
              const fitScale = Math.min(containerRect.width / imageNaturalSize.w, containerRect.height / imageNaturalSize.h);
              const baseW = imageNaturalSize.w * fitScale;
              const baseH = imageNaturalSize.h * fitScale;
              const scaledW = baseW * imageZoom;
              const scaledH = baseH * imageZoom;
              const maxX = Math.max(0, (scaledW - containerRect.width) / 2);
              const maxY = Math.max(0, (scaledH - containerRect.height) / 2);
              const nextX = Math.max(-maxX, Math.min(maxX, dragStart.panX + dx));
              const nextY = Math.max(-maxY, Math.min(maxY, dragStart.panY + dy));
              setImagePan({ x: nextX, y: nextY });
            }}
            onPointerUp={(e) => {
              setIsDragging(false);
              e.currentTarget.releasePointerCapture?.(e.pointerId);
            }}
            onPointerCancel={(e) => {
              setIsDragging(false);
              e.currentTarget.releasePointerCapture?.(e.pointerId);
            }}
          >
            <div
              className="will-change-transform"
              style={{
                transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                transformOrigin: "center",
              }}
            >
              <img
                src={imageUrl}
                alt=""
                className="block max-w-full max-h-[80vh] object-contain select-none"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
