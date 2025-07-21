import type { BoundingBox, AnnotationTag } from "@/types/annotation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Edit3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { tagColors } from "@/components/annotation/constants";
import { useAnnotationStore } from "@/stores/use-annotation-store";

interface AnnotationsListProps {
  className?: string;
}

export const AnnotationsList = ({ className }: AnnotationsListProps) => {
  const { 
    boundingBoxes, 
    highlightedAnnotationId,
    updateBoundingBox,
    deleteBoundingBox,
    setHighlightedAnnotationId 
  } = useAnnotationStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleTagChange = (id: string, newTag: AnnotationTag) => {
    updateBoundingBox(id, { tag: newTag });
    setEditingId(null);
    toast.success(`Annotation updated to ${newTag}`);
  };

  const handleDelete = (id: string) => {
    deleteBoundingBox(id);
    if (highlightedAnnotationId === id) {
      setHighlightedAnnotationId(undefined);
    }
    toast.success('Annotation deleted');
  };

  if (boundingBoxes.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Edit3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h4 className="font-medium mb-2">No Annotations Yet</h4>
          <p className="text-sm text-muted-foreground">
            Draw bounding boxes on the image to start annotating
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Annotations</h3>
          <Badge variant="secondary">{boundingBoxes.length} total</Badge>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {boundingBoxes.map((box, index) => {
            const isEditing = editingId === box.id;
            const isHighlighted = highlightedAnnotationId === box.id;

            return (
              <div
                key={box.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isHighlighted
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-accent/50"
                }`}
                onMouseEnter={() => setHighlightedAnnotationId(box.id)}
                onMouseLeave={() => setHighlightedAnnotationId(undefined)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tagColors[box.tag] }}
                    />
                    <span className="text-sm font-medium">#{index + 1}</span>
                    {box.source === 'prediction' && (
                      <Badge variant="outline" className="text-xs px-1 py-0 text-purple-600 border-purple-300">
                        AI
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(isEditing ? null : box.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="h-3 w-3 text-muted-foreground" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(box.id);
                      }}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {isEditing ? (
                    <Select
                      value={box.tag}
                      onValueChange={(value) =>
                        handleTagChange(box.id, value as AnnotationTag)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="button">Button</SelectItem>
                        <SelectItem value="input">Input</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {box.tag}
                    </Badge>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Size: {Math.round(box.width)} × {Math.round(box.height)}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Position: ({Math.round(box.x)}, {Math.round(box.y)})
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {boundingBoxes.length > 5 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Tip: Hover over annotations to highlight them on the image
          </div>
        )}
      </div>
    </Card>
  );
};