import { AnnotationCanvas } from '@/components/annotation/annotation-canvas';
import { AnnotationsList } from '@/components/annotation/annotations-list';
import { ExportControls } from '@/components/annotation/export-controls';
import { ModelSelector } from '@/components/annotation/model-selector';
import { PredictButton } from '@/components/annotation/predict-button';
import { TagSelector } from '@/components/annotation/tag-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import type { AnnotationTag, BoundingBox } from '@/types/annotation';
import { RotateCcw, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const Index = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<AnnotationTag>('button');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [projectName, setProjectName] = useState<string>('UI Annotation Project');
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | undefined>(undefined);

  const handleFileSelect = (file: File, url: string) => {
    setImageFile(file);
    setImageUrl(url);
    setBoundingBoxes([]); // Reset annotations when new image is loaded
    setProjectName(`${file.name.split('.')[0]} Annotations`);
    toast.success('Image loaded successfully!');
  };

  const handleBoundingBoxAdd = (box: Omit<BoundingBox, 'id'>) => {
    const newBox: BoundingBox = {
      ...box,
      id: crypto.randomUUID()
    };
    setBoundingBoxes(prev => [...prev, newBox]);
  };

  const handleBoundingBoxDelete = (id: string) => {
    setBoundingBoxes(prev => prev.filter(box => box.id !== id));
    toast.success('Annotation deleted');
  };

  const handleBoundingBoxUpdate = (id: string, updates: Partial<BoundingBox>) => {
    setBoundingBoxes(prev => 
      prev.map(box => box.id === id ? { ...box, ...updates } : box)
    );
  };

  const handlePredictionsReceived = (predictions: BoundingBox[]) => {
    // Add predictions to existing annotations
    setBoundingBoxes(prev => [...prev, ...predictions]);
  };

  const resetProject = () => {
    setBoundingBoxes([]);
    setImageFile(null);
    setImageUrl('');
    setProjectName('UI Annotation Project');
    toast.success('Project reset');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
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
              {boundingBoxes.length > 0 && (
                <Badge variant="secondary" className="gap-2">
                  <Sparkles className="h-3 w-3" />
                  {boundingBoxes.length} annotations
                </Badge>
              )}
              {imageFile && (
                <Button variant="outline" size="sm" onClick={resetProject} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!imageFile ? (
          /* Upload Section */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Start Annotating</h2>
                <p className="text-muted-foreground">
                  Upload a UI screenshot or design image to begin creating bounding box annotations 
                  for training machine learning models.
                </p>
              </div>
            </div>

            <FileUpload 
              onFileSelect={handleFileSelect}
              className="max-w-lg mx-auto"
            />

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
                  <p className="text-muted-foreground">10+ UI element types: buttons, inputs, dropdowns, etc.</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-medium">AI-Powered Detection</h4>
                  <p className="text-muted-foreground">Automatically detect UI elements using machine learning</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* Annotation Interface */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Controls */}
            <div className="lg:col-span-1 space-y-6">
              <TagSelector 
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
              />
              
              <ModelSelector
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
              />
              
              <PredictButton
                imageFile={imageFile}
                selectedModel={selectedModel}
                onPredictionsReceived={handlePredictionsReceived}
              />
              
              <AnnotationsList
                boundingBoxes={boundingBoxes}
                onBoundingBoxDelete={handleBoundingBoxDelete}
                onBoundingBoxUpdate={handleBoundingBoxUpdate}
                highlightedId={highlightedAnnotationId}
                onHighlight={setHighlightedAnnotationId}
              />
              
              <ExportControls
                projectName={projectName}
                imageName={imageFile.name}
                imageUrl={imageUrl}
                boundingBoxes={boundingBoxes}
              />
            </div>

            {/* Main Canvas Area */}
            <div className="lg:col-span-3">
              <AnnotationCanvas
                imageUrl={imageUrl}
                selectedTag={selectedTag}
                boundingBoxes={boundingBoxes}
                onBoundingBoxAdd={handleBoundingBoxAdd}
                onBoundingBoxDelete={handleBoundingBoxDelete}
                highlightedId={highlightedAnnotationId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
