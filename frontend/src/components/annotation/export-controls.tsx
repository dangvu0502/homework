import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';
import type { AnnotationExport, BoundingBox } from '@/types/annotation';
import { Download, FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
import { BlobWriter, ZipWriter } from '@zip.js/zip.js';

interface ExportControlsProps {
  imageName: string;
  boundingBoxes: BoundingBox[];
  imageDimensions: { width: number; height: number };
}

export const ExportControls = ({
  imageName,
  boundingBoxes,
  imageDimensions,
}: ExportControlsProps) => {
  const { annotationsPerImage, saveAnnotationsForImage } = useAnnotationStore();
  const { imageFiles } = useImageStore();
  
  const generateExportData = (): AnnotationExport => {
    return {
      imageName,
      imageDimensions: {
        width: imageDimensions.width,
        height: imageDimensions.height
      },
      annotations: boundingBoxes.map(box => ({
        id: box.id,
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        tag: box.tag,
        source: box.source || 'user'
      })),
      metadata: {
        totalAnnotations: boundingBoxes.length,
        exportedAt: new Date().toISOString()
      }
    };
  };

  const exportAsJSON = () => {
    try {
      const data = generateExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${imageName.split('.')[0]}_annotations.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Annotations exported successfully!');
    } catch (error) {
      toast.error('Failed to export annotations');
      console.error('Export error:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      const data = generateExportData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success('Annotations copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getTagSummary = () => {
    const tagCounts = boundingBoxes.reduce((acc, box) => {
      acc[box.tag] = (acc[box.tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
  };

  const exportAllAnnotations = async () => {
    try {
      if (imageFiles.length === 0) {
        toast.error('No images to export');
        return;
      }

      // First, save current image annotations if needed
      if (imageName && boundingBoxes.length > 0) {
        saveAnnotationsForImage(imageName);
      }

      // Create a zip file with all annotations
      const blobWriter = new BlobWriter('application/zip');
      const zipWriter = new ZipWriter(blobWriter);
      
      // Export all loaded images, even those without annotations
      for (const imageFile of imageFiles) {
        const fileName = imageFile.name;
        const boxes = annotationsPerImage[fileName] || [];
        
        // If this is the current image and has annotations not yet saved
        const currentImageBoxes = (fileName === imageName) ? boundingBoxes : boxes;
        
        const exportData: AnnotationExport = {
          imageName: fileName,
          imageDimensions: { width: 1920, height: 1080 }, // Default dimensions
          annotations: currentImageBoxes.map(box => ({
            id: box.id,
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
            tag: box.tag,
            source: box.source || 'user'
          })),
          metadata: {
            totalAnnotations: boxes.length,
            exportedAt: new Date().toISOString()
          }
        };

        const jsonContent = JSON.stringify(exportData, null, 2);
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
        
        // Add file to zip
        await zipWriter.add(
          `${fileName.split('.')[0]}_annotations.json`,
          jsonBlob.stream()
        );
      }
      
      // Close the zip writer and get the blob
      const zipBlob = await zipWriter.close();
      
      // Download the zip file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotations_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${imageFiles.length} annotation files in zip!`);
    } catch (error) {
      toast.error('Failed to export all annotations');
      console.error('Export error:', error);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Export & Save</h3>
          <Badge variant="secondary">
            {boundingBoxes.length} annotations
          </Badge>
        </div>

        {/* Summary */}
        {boundingBoxes.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Summary</h4>
            <div className="flex flex-wrap gap-1">
              {getTagSummary().map(([tag, count]) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Export Options - Always visible */}
        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={exportAsJSON}
            className="gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Download Current
          </Button>
          
          <Button 
            variant="outline" 
            onClick={copyToClipboard}
            className="gap-2"
            size="sm"
          >
            <FileText className="h-4 w-4" />
            Copy to Clipboard
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={exportAllAnnotations}
            className="gap-2"
            size="sm"
          >
            <Package className="h-4 w-4" />
            Download All ({imageFiles.length} images)
          </Button>
        </div>
      </div>
    </Card>
  );
};