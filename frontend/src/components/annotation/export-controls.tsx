import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AnnotationExport, BoundingBox } from '@/types/annotation';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Export & Save</h3>
          <Badge variant="secondary">
            {boundingBoxes.length} annotations
          </Badge>
        </div>

        {boundingBoxes.length > 0 && (
          <div className="space-y-3">
            {/* Summary */}
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

            {/* Export Options */}
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={exportAsJSON}
                className="gap-2"
                size="sm"
              >
                <Download className="h-4 w-4" />
                Download JSON
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
              
            </div>
          </div>
        )}

        {boundingBoxes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No annotations to export yet. Start by drawing bounding boxes on the image.
          </p>
        )}
      </div>
    </Card>
  );
};