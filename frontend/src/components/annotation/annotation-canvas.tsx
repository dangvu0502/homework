import { tagColors } from "@/components/annotation/constants";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAnnotationCanvas } from "@/hooks/use-annotation-canvas";
import { useAnnotationStore } from "@/stores/use-annotation-store";
import { useImageStore } from "@/stores/use-image-store";

interface AnnotationCanvasProps {
  className?: string;
}

export const AnnotationCanvas = ({ className }: AnnotationCanvasProps) => {
  const { imageUrl } = useImageStore();
  const {
    selectedTag,
    boundingBoxes,
    highlightedAnnotationId,
    addBoundingBox,
    updateBoundingBox,
    setImageDimensions,
  } = useAnnotationStore();

  const {
    canvasRef,
    image,
    hoveredBoxId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    canDrag,
  } = useAnnotationCanvas({
    imageUrl,
    selectedTag,
    boundingBoxes,
    onBoundingBoxAdd: addBoundingBox,
    onBoundingBoxUpdate: updateBoundingBox,
    highlightedId: highlightedAnnotationId,
    onImageLoaded: setImageDimensions,
  });

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

        <div className="relative border rounded-lg overflow-hidden bg-muted">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="max-w-full h-auto"
            style={{ 
              display: "block",
              cursor: hoveredBoxId && canDrag ? "move" : "crosshair"
            }}
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