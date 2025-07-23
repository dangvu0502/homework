import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';
import { RotateCcw, Sparkles, Target, FileImage, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { imageFiles, completedImages, reset: resetImages } = useImageStore();
  const { boundingBoxes, reset: resetAnnotations } = useAnnotationStore();

  const handleReset = () => {
    resetAnnotations();
    resetImages();
    toast.success('Project reset');
  };

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">UI Annotation Tool</h1>
              <p className="text-sm text-muted-foreground">Create training datasets for ML models</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/batch" className="gap-2">
                <Zap className="h-4 w-4" />
                Batch Process
              </Link>
            </Button>
            {completedImages > 0 && (
              <Badge variant="outline" className="gap-2">
                <FileImage className="h-3 w-3" />
                {completedImages} completed
              </Badge>
            )}
            {boundingBoxes.length > 0 && (
              <Badge variant="secondary" className="gap-2">
                <Sparkles className="h-3 w-3" />
                {boundingBoxes.length} annotations
              </Badge>
            )}
            {imageFiles.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};