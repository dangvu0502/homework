import type { AnnotationTag, BoundingBox } from "@/types/annotation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { tagColors } from "@/components/annotation/constants";

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface DragState {
  isDragging: boolean;
  draggedBoxId: string | null;
  dragOffsetX: number;
  dragOffsetY: number;
}

interface UseAnnotationCanvasProps {
  imageUrl: string;
  selectedTag: AnnotationTag;
  boundingBoxes: BoundingBox[];
  onBoundingBoxAdd: (box: Omit<BoundingBox, "id">) => void;
  onBoundingBoxUpdate?: (id: string, updates: { x: number; y: number }) => void;
  highlightedId?: string | null;
  onImageLoaded?: (dimensions: { width: number; height: number }) => void;
}

export const useAnnotationCanvas = ({
  imageUrl,
  selectedTag,
  boundingBoxes,
  onBoundingBoxAdd,
  onBoundingBoxUpdate,
  highlightedId,
  onImageLoaded,
}: UseAnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBoxId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
  });

  // Helper functions
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const isPointInBox = useCallback((x: number, y: number, box: BoundingBox): boolean => {
    return (
      x >= box.x &&
      x <= box.x + box.width &&
      y >= box.y &&
      y <= box.y + box.height
    );
  }, []);

  const getBoxAtPoint = useCallback((x: number, y: number): BoundingBox | null => {
    // Check boxes in reverse order (top to bottom) to prioritize boxes drawn on top
    for (let i = boundingBoxes.length - 1; i >= 0; i--) {
      if (isPointInBox(x, y, boundingBoxes[i])) {
        return boundingBoxes[i];
      }
    }
    return null;
  }, [boundingBoxes, isPointInBox]);

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
      const isHovered = hoveredBoxId === box.id;
      const isDragging = dragState.draggedBoxId === box.id;
      const isPrediction = box.source === "prediction";

      // Use different colors for predictions
      const baseColor = tagColors[box.tag];
      const strokeColor = isPrediction ? "#8B5CF6" : baseColor; // Purple for predictions
      const fillColor = isPrediction
        ? baseColor + "15"
        : baseColor + (isHighlighted || isHovered || isDragging ? "40" : "20");

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = isHighlighted || isHovered || isDragging ? 3 : 2;

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
  }, [image, boundingBoxes, drawingState, selectedTag, highlightedId, hoveredBoxId, dragState]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const clickedBox = getBoxAtPoint(pos.x, pos.y);

    if (clickedBox && onBoundingBoxUpdate) {
      // Start dragging an existing box
      setDragState({
        isDragging: true,
        draggedBoxId: clickedBox.id,
        dragOffsetX: pos.x - clickedBox.x,
        dragOffsetY: pos.y - clickedBox.y,
      });
    } else {
      // Start drawing a new box
      setDrawingState({
        isDrawing: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    }
  }, [getMousePos, getBoxAtPoint, onBoundingBoxUpdate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (dragState.isDragging && dragState.draggedBoxId && onBoundingBoxUpdate) {
      // Update position of dragged box
      const newX = pos.x - dragState.dragOffsetX;
      const newY = pos.y - dragState.dragOffsetY;
      
      // Keep box within canvas bounds
      const canvas = canvasRef.current;
      if (canvas) {
        const box = boundingBoxes.find(b => b.id === dragState.draggedBoxId);
        if (box) {
          const clampedX = Math.max(0, Math.min(newX, canvas.width - box.width));
          const clampedY = Math.max(0, Math.min(newY, canvas.height - box.height));
          onBoundingBoxUpdate(dragState.draggedBoxId, { x: clampedX, y: clampedY });
        }
      }
    } else if (drawingState.isDrawing) {
      setDrawingState((prev) => ({
        ...prev,
        currentX: pos.x,
        currentY: pos.y,
      }));
    } else {
      // Update hover state
      const hoveredBox = getBoxAtPoint(pos.x, pos.y);
      setHoveredBoxId(hoveredBox ? hoveredBox.id : null);
    }
  }, [getMousePos, dragState, drawingState.isDrawing, boundingBoxes, onBoundingBoxUpdate, getBoxAtPoint]);

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      // Check if we dragged an AI prediction
      const draggedBox = boundingBoxes.find(b => b.id === dragState.draggedBoxId);
      if (draggedBox && draggedBox.source === "prediction") {
        toast.success("AI prediction converted to user annotation");
      }
      
      // End dragging
      setDragState({
        isDragging: false,
        draggedBoxId: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
      });
      return;
    }

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
  }, [dragState, drawingState, boundingBoxes, selectedTag, onBoundingBoxAdd]);

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
      // Report image dimensions
      if (onImageLoaded) {
        onImageLoaded({ width: img.width, height: img.height });
      }
    };
    img.src = imageUrl;
  }, [imageUrl, onImageLoaded, drawCanvas]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return {
    canvasRef,
    image,
    hoveredBoxId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    canDrag: !!onBoundingBoxUpdate,
  };
};