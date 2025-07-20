import type { AnnotationTag, BoundingBox } from "@/types/annotation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { tagColors } from "@/components/annotation/constants";

interface AnnotationCanvasProps {
  imageUrl: string;
  selectedTag: AnnotationTag;
  boundingBoxes: BoundingBox[];
  onBoundingBoxAdd: (box: Omit<BoundingBox, "id">) => void;
  onBoundingBoxDelete: (id: string) => void;
  highlightedId?: string | null;
  className?: string;
}

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const AnnotationCanvas = ({
  imageUrl,
  selectedTag,
  boundingBoxes,
  onBoundingBoxAdd,
  highlightedId,
  className,
}: AnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Draw canvas contents
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw existing bounding boxes
    boundingBoxes.forEach((box) => {
      const isHighlighted = highlightedId === box.id;
      const isPrediction = box.source === "prediction";

      // Use different colors for predictions
      const baseColor = tagColors[box.tag];
      const strokeColor = isPrediction ? "#8B5CF6" : baseColor; // Purple for predictions
      const fillColor = isPrediction
        ? baseColor + "15"
        : baseColor + (isHighlighted ? "40" : "20");

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = isHighlighted ? 3 : 2;

      // Use dashed lines for predictions
      if (isPrediction) {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.setLineDash([]);
      }

      if (isHighlighted) {
        // Add glow effect for highlighted annotation
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;
      }

      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Reset shadow and line dash
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);

      // Draw tag label with different background for predictions
      const labelBgColor = isPrediction ? "#8B5CF6" : baseColor;
      ctx.fillStyle = labelBgColor;
      ctx.font = isHighlighted ? "bold 12px system-ui" : "12px system-ui";
      const labelWidth = ctx.measureText(box.tag).width;
      ctx.fillRect(box.x, box.y - 20, labelWidth + 8, 16);
      ctx.fillStyle = "white";
      ctx.fillText(box.tag, box.x + 4, box.y - 8);

      // Add prediction indicator
      if (isPrediction) {
        ctx.fillStyle = "#8B5CF6";
        ctx.font = "bold 10px system-ui";
        ctx.fillText("AI", box.x + box.width - 20, box.y - 8);
      }
    });

    // Draw current drawing box
    if (drawingState.isDrawing) {
      const width = drawingState.currentX - drawingState.startX;
      const height = drawingState.currentY - drawingState.startY;

      ctx.strokeStyle = tagColors[selectedTag];
      ctx.fillStyle = tagColors[selectedTag] + "20";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.fillRect(drawingState.startX, drawingState.startY, width, height);
      ctx.strokeRect(drawingState.startX, drawingState.startY, width, height);
      ctx.setLineDash([]);
    }
  }, [image, boundingBoxes, drawingState, selectedTag, highlightedId]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setDrawingState({
      isDrawing: true,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing) return;

    const pos = getMousePos(e);
    setDrawingState((prev) => ({
      ...prev,
      currentX: pos.x,
      currentY: pos.y,
    }));
  };

  const handleMouseUp = () => {
    if (!drawingState.isDrawing) return;

    const width = Math.abs(drawingState.currentX - drawingState.startX);
    const height = Math.abs(drawingState.currentY - drawingState.startY);

    // Minimum size check
    if (width < 10 || height < 10) {
      toast.error("Bounding box too small. Please draw a larger area.");
      setDrawingState((prev) => ({ ...prev, isDrawing: false }));
      return;
    }

    const newBox: Omit<BoundingBox, "id"> = {
      x: Math.min(drawingState.startX, drawingState.currentX),
      y: Math.min(drawingState.startY, drawingState.currentY),
      width,
      height,
      tag: selectedTag,
      source: "user",
    };

    onBoundingBoxAdd(newBox);
    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    toast.success(`${selectedTag} annotation added!`);
  };

  // Load and setup image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        drawCanvas();
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Image Annotation</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tagColors[selectedTag] }}
              />
              Drawing: {selectedTag}
            </Badge>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden bg-muted"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="max-w-full h-auto cursor-crosshair"
            style={{ display: "block" }}
          />

          {!image && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Loading image...</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>Click and drag to create bounding boxes</span>
          <span>
            Current tag: <strong>{selectedTag}</strong>
          </span>
        </div>
      </Card>
    </div>
  );
};
