import { AnnotationCanvas } from '@/components/annotation/annotation-canvas';
import { AnnotationsList } from '@/components/annotation/annotations-list';
import { ExportControls } from '@/components/annotation/export-controls';
import { PredictButton } from '@/components/annotation/predict-button';
import { TagSelector } from '@/components/annotation/tag-selector';

export const AnnotationWorkspace = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar - Controls */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <TagSelector />
          
          <PredictButton />
          
          <AnnotationsList />
          
          <ExportControls />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="lg:col-span-3">
        <AnnotationCanvas />
      </div>
    </div>
  );
};