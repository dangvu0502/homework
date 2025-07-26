import type { JobResultResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import { BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { ArrowLeft, Check, Download, FileImage, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FailedFile {
  file: File;
  error?: string;
}

const BatchProcess = () => {
  const navigate = useNavigate();
  const [processedResults, setProcessedResults] = useState<JobResultResponse[]>([]);
  const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleBatchComplete = async (results: JobResultResponse[], failed?: any[]) => {
    setProcessedResults(results);
    if (failed) {
      setFailedFiles(failed.map(f => ({ file: f.file, error: f.error })));
    }
    setShowResults(true);
  };

  const downloadResults = async () => {
    // Create a blob writer for the zip file
    const blobWriter = new BlobWriter();
    const zipWriter = new ZipWriter(blobWriter);
    
    // Create individual files for each image result
    for (const result of processedResults) {
      const imageName = result.image.split('/').pop() || `${result.task_id}.png`;
      const fileNameWithoutExt = imageName.replace(/\.[^/.]+$/, '');
      
      // Transform annotations to match the expected format
      const transformedAnnotations = result.analysis.annotations.map((ann, index) => ({
        id: `prediction-${Date.now()}-${index}`,
        x: ann.x,
        y: ann.y,
        width: ann.width,
        height: ann.height,
        tag: ann.tag || ann.label,
        source: "prediction" as const
      }));
      
      const resultData = {
        imageName: imageName,
        annotations: transformedAnnotations,
        metadata: {
          totalAnnotations: transformedAnnotations.length,
          exportedAt: new Date().toISOString()
        }
      };
      
      const resultBlob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
      await zipWriter.add(`${fileNameWithoutExt}_annotations.json`, resultBlob.stream());
    }
    
    // Close the zip writer and get the blob
    await zipWriter.close();
    const zipBlob = await blobWriter.getData();
    
    // Download the zip file
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_results_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBatch = () => {
    setProcessedResults([]);
    setFailedFiles([]);
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

        <Card className="mb-6">
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
              />
            </CardContent>
          </Card>
        )}

        {showResults && (processedResults.length > 0 || failedFiles.length > 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processing Results</span>
                <div className="flex gap-2 text-sm">
                  {processedResults.length > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      {processedResults.length} Successful
                    </Badge>
                  )}
                  {failedFiles.length > 0 && (
                    <Badge variant="destructive">
                      {failedFiles.length} Failed
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={downloadResults} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download ZIP
                  </Button>
                  <Button onClick={resetBatch} variant="outline" size="sm">
                    Process New Batch
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Processed {processedResults.length + failedFiles.length} images total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processedResults.map((result) => {
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
              
              {failedFiles.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3 text-red-600">Failed Files</h4>
                  <div className="space-y-2">
                    {failedFiles.map((failed, index) => (
                      <Card key={`failed-${index}`} className="p-4 border-red-200 bg-red-50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileImage className="h-5 w-5 text-red-600" />
                              <span className="font-medium text-red-900">
                                {failed.file.name}
                              </span>
                            </div>
                            {failed.error && (
                              <p className="text-sm text-red-700">
                                Error: {failed.error}
                              </p>
                            )}
                          </div>
                          <X className="h-5 w-5 text-red-600" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BatchProcess;