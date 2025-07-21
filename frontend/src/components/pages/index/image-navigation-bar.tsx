import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageNavigationBarProps {
  onNavigate: (index: number) => void;
}

export const ImageNavigationBar = ({ onNavigate }: ImageNavigationBarProps) => {
  const { imageFiles, currentImageIndex, getCurrentImageFile } = useImageStore();
  const { annotationsPerImage } = useAnnotationStore();
  const currentImageFile = getCurrentImageFile();

  if (imageFiles.length <= 1) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(currentImageIndex - 1)}
            disabled={currentImageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Image {currentImageIndex + 1} of {imageFiles.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(currentImageIndex + 1)}
            disabled={currentImageIndex === imageFiles.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {currentImageFile?.name}
          </Badge>
          {currentImageFile && annotationsPerImage[currentImageFile.name]?.length > 0 && (
            <Badge variant="secondary">
              {annotationsPerImage[currentImageFile.name].length} saved
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};