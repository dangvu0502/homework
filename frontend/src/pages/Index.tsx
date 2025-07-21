import { Header } from '@/components/pages/index/header';
import { UploadSection } from '@/components/pages/index/upload-section';
import { ImageNavigationBar } from '@/components/pages/index/image-navigation-bar';
import { AnnotationWorkspace } from '@/components/pages/index/annotation-workspace';
import { useImageStore } from '@/stores/use-image-store';

const Index = () => {
  const { imageFiles } = useImageStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {imageFiles.length === 0 ? (
          <UploadSection />
        ) : (
          <div className="space-y-4">
            <ImageNavigationBar />
            <AnnotationWorkspace />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;