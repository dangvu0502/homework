import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Download, FileImage, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import { useImageStore } from '@/stores/use-image-store';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ModelSelector } from '@/components/annotation/model-selector';
import { Badge } from '@/components/ui/badge';
import type { JobResultResponse } from '@/api/types';
import type { BoundingBox, AnnotationTag } from '@/types/annotation';

const BatchProcess = () => {
  const navigate = useNavigate();
  const { setImageFiles } = useImageStore();
  const { setAnnotationsPerImage, selectedModel } = useAnnotationStore();
  const [processedResults, setProcessedResults] = useState<JobResultResponse[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleBatchComplete = async (results: JobResultResponse[]) => {
    setProcessedResults(results);
    setShowResults(true);
  };

  const downloadResults = () => {
    const resultsData = processedResults.map(result => ({
      image: result.image,
      task_id: result.task_id,
      model: result.model_used,
      processing_time: result.processing_time,
      annotations: result.analysis.annotations
    }));

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_results_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewInAnnotationTool = async () => {
    // Convert results to the format expected by the annotation system
    const imagePromises = processedResults.map(async (result) => {
      // Create a blob from the result (you might need to fetch the image from S3)
      // For now, we'll create a placeholder
      const imageFile = new File([new Blob()], result.image, { type: 'image/png' });
      
      return {
        file: imageFile,
        fileName: result.image,
        annotations: result.analysis.annotations.map((ann, idx) => ({
          id: `${result.task_id}-${idx}`,
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          tag: (ann.tag || ann.label) as AnnotationTag,
          source: 'prediction' as const,
        })),
      };
    });

    const processedImages = await Promise.all(imagePromises);
    
    // Add images to the store
    const imageFiles = processedImages.map(img => img.file);
    setImageFiles(imageFiles);

    // Create annotations object for all images
    const annotationsMap: Record<string, BoundingBox[]> = {};
    processedImages.forEach((img) => {
      annotationsMap[img.fileName] = img.annotations;
    });
    setAnnotationsPerImage(annotationsMap);

    // Navigate to annotation tool
    navigate('/');
  };

  const resetBatch = () => {
    setProcessedResults([]);
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Annotation Tool
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Batch Processing</h1>
          </div>
          <p className="text-muted-foreground">
            Process multiple images simultaneously using our scalable backend
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Select Model</CardTitle>
              <CardDescription>
                Choose the AI model for processing your images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How it Works</CardTitle>
              <CardDescription>
                Scalable processing for large batches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>Images are uploaded to cloud storage (S3)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>Tasks are queued for processing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>Workers process images in parallel</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-primary">4.</span>
                <span>Results are retrieved when ready</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {!showResults && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>
                Select multiple images to process in batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MultiFileUpload
                onComplete={handleBatchComplete}
                modelName={selectedModel || undefined}
              />
            </CardContent>
          </Card>
        )}

        {showResults && processedResults.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processing Results</span>
                <div className="flex gap-2">
                  <Button onClick={downloadResults} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                  <Button onClick={viewInAnnotationTool} size="sm">
                    View in Annotation Tool
                  </Button>
                  <Button onClick={resetBatch} variant="outline" size="sm">
                    Process New Batch
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Successfully processed {processedResults.length} images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processedResults.map((result, index) => {
                  const totalElements = result.analysis.annotations.length;
                  const elementTypes = result.analysis.annotations.reduce((acc, ann) => {
                    const label = ann.label || ann.tag || 'unknown';
                    acc[label] = (acc[label] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <Card key={result.task_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileImage className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{result.image.split('/').pop()}</span>
                            <Badge variant="outline" className="text-xs">
                              {result.model_used}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="secondary">
                              {totalElements} elements detected
                            </Badge>
                            {Object.entries(elementTypes).map(([type, count]) => (
                              <Badge key={type} variant="outline">
                                {count} {type}{count > 1 ? 's' : ''}
                              </Badge>
                            ))}
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            Processed in {result.processing_time.toFixed(2)}s
                          </p>
                        </div>
                        
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BatchProcess;