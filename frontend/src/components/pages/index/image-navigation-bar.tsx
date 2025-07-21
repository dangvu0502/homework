import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ImageNavigationBar = () => {
  const { 
    imageFiles, 
    currentImageIndex, 
    getCurrentImageFile,
    navigateToImage 
  } = useImageStore();
  const { 
    annotationsPerImage, 
    saveAnnotationsForImage,
    loadAnnotationsForImage 
  } = useAnnotationStore();
  
  const currentImageFile = getCurrentImageFile();

  const handleNavigate = (index: number) => {
    if (index < 0 || index >= imageFiles.length) return;
    
    // Save current annotations
    if (currentImageFile) {
      saveAnnotationsForImage(currentImageFile.name);
    }
    
    // Navigate to new image
    navigateToImage(index);
    
    // Load existing annotations for this image
    const newFile = imageFiles[index];
    loadAnnotationsForImage(newFile.name);
  };

  if (imageFiles.length <= 1) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(currentImageIndex - 1)}
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
            onClick={() => handleNavigate(currentImageIndex + 1)}
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