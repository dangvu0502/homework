import { Header } from '@/components/pages/index/header';
import { UploadSection } from '@/components/pages/index/upload-section';
import { ImageNavigationBar } from '@/components/pages/index/image-navigation-bar';
import { AnnotationWorkspace } from '@/components/pages/index/annotation-workspace';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';
import { toast } from 'sonner';

const Index = () => {
  // Image store
  const {
    imageFiles,
    setImageFiles,
    setImageUrl,
    setCurrentImageIndex,
    getCurrentImageFile,
    navigateToImage,
    reset: resetImages
  } = useImageStore();

  // Annotation store
  const {
    boundingBoxes,
    setAnnotationsPerImage,
    setBoundingBoxes,
    deleteBoundingBox,
    addPredictions,
    saveAnnotationsForImage,
    loadAnnotationsForImage,
    reset: resetAnnotations
  } = useAnnotationStore();

  // Get current image file
  const currentImageFile = getCurrentImageFile();

  const handleFilesSelect = (files: File[]) => {
    if (files.length === 0) return;
    
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

  const handleNavigateToImage = (index: number) => {
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

  const handleBoundingBoxDelete = (id: string) => {
    deleteBoundingBox(id);
    toast.success('Annotation deleted');
  };

  const handlePredictionsReceived = (predictions: typeof boundingBoxes) => {
    addPredictions(predictions);
  };

  const resetProject = () => {
    resetAnnotations();
    resetImages();
    toast.success('Project reset');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header onReset={resetProject} />

      <div className="container mx-auto px-4 py-8">
        {imageFiles.length === 0 ? (
          <UploadSection onFilesSelect={handleFilesSelect} />
        ) : (
          <div className="space-y-4">
            <ImageNavigationBar onNavigate={handleNavigateToImage} />
            <AnnotationWorkspace
              onBoundingBoxDelete={handleBoundingBoxDelete}
              onPredictionsReceived={handlePredictionsReceived}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;