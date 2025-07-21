import { AnnotationCanvas } from '@/components/annotation/annotation-canvas';
import { AnnotationsList } from '@/components/annotation/annotations-list';
import { ExportControls } from '@/components/annotation/export-controls';
import { ModelSelector } from '@/components/annotation/model-selector';
import { PredictButton } from '@/components/annotation/predict-button';
import { TagSelector } from '@/components/annotation/tag-selector';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';

interface AnnotationWorkspaceProps {
  onBoundingBoxDelete: (id: string) => void;
  onPredictionsReceived: (predictions: any[]) => void;
}

export const AnnotationWorkspace = ({ 
  onBoundingBoxDelete, 
  onPredictionsReceived 
}: AnnotationWorkspaceProps) => {
  const { imageUrl, getCurrentImageFile } = useImageStore();
  const {
    selectedTag,
    selectedModel,
    boundingBoxes,
    highlightedAnnotationId,
    imageDimensions,
    setSelectedTag,
    setSelectedModel,
    setHighlightedAnnotationId,
    setImageDimensions,
    addBoundingBox,
    deleteBoundingBox,
    updateBoundingBox
  } = useAnnotationStore();

  const currentImageFile = getCurrentImageFile();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar - Controls */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <TagSelector 
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
          
          <ModelSelector
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
          />
          
          <PredictButton
            imageFile={currentImageFile}
            selectedModel={selectedModel}
            onPredictionsReceived={onPredictionsReceived}
          />
          
          <AnnotationsList
            boundingBoxes={boundingBoxes}
            onBoundingBoxDelete={onBoundingBoxDelete}
            onBoundingBoxUpdate={updateBoundingBox}
            highlightedId={highlightedAnnotationId}
            onHighlight={setHighlightedAnnotationId}
          />
          
          <ExportControls
            imageName={currentImageFile?.name || ''}
            boundingBoxes={boundingBoxes}
            imageDimensions={imageDimensions || { width: 0, height: 0 }}
          />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="lg:col-span-3">
        <AnnotationCanvas
          imageUrl={imageUrl}
          selectedTag={selectedTag}
          boundingBoxes={boundingBoxes}
          onBoundingBoxAdd={addBoundingBox}
          onBoundingBoxDelete={deleteBoundingBox}
          highlightedId={highlightedAnnotationId}
          onImageLoaded={setImageDimensions}
        />
      </div>
    </div>
  );
};