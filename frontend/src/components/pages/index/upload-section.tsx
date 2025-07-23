import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import { useImageStore } from '@/stores/use-image-store';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { Target, Sparkles, FileImage } from 'lucide-react';
import { toast } from 'sonner';

export const UploadSection = () => {
  const { 
    completedImages, 
    imageUrl: oldUrl,
    setImageFiles, 
    setImageUrl, 
    setCurrentImageIndex 
  } = useImageStore();
  const { setAnnotationsPerImage, setBoundingBoxes } = useAnnotationStore();

  const handleFilesSelect = (files: File[]) => {
    if (files.length === 0) return;
    
    // Release the previous blob URL to prevent memory leaks
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }
    
    setImageFiles(files);
    setCurrentImageIndex(0);
    setAnnotationsPerImage({});
    setBoundingBoxes([]);
    
    // Load first image
    const firstFile = files[0];
    const url = URL.createObjectURL(firstFile);
    setImageUrl(url);
    
    toast.success(`${files.length} images loaded successfully!`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Start Annotating</h2>
          <p className="text-muted-foreground">
            Upload UI screenshots or design images to begin creating bounding box annotations 
            for training machine learning models. You can process multiple images in one session.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <MultiFileUpload
        onFilesSelect={handleFilesSelect}
        maxFiles={100}
        className="max-w-2xl mx-auto"
        mode="select"
      />

      {/* Multi-Image Workflow Info */}
      {completedImages > 0 && (
        <Card className="p-4 bg-success/10 border-success/20 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <FileImage className="h-3 w-3" />
              {completedImages}
            </Badge>
            <p className="text-sm">
              You've completed {completedImages} image{completedImages !== 1 ? 's' : ''}! Upload more to continue.
            </p>
          </div>
        </Card>
      )}

      {/* Features */}
      <Card className="p-6 bg-gradient-to-r from-card to-accent/20">
        <h3 className="font-semibold mb-4">Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-medium">Precise Annotation</h4>
            <p className="text-muted-foreground">Draw accurate bounding boxes with mouse interaction</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Badge className="w-4 h-4" />
            </div>
            <h4 className="font-medium">Element Tagging</h4>
            <p className="text-muted-foreground">UI elements: buttons, inputs, dropdowns, radio</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-medium">AI-Powered Detection</h4>
            <p className="text-muted-foreground">Automatically detect UI elements using LLM</p>
          </div>
        </div>
      </Card>
    </div>
  );
};