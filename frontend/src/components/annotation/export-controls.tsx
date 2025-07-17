import type { BoundingBox, AnnotationExport, AnnotationTag } from '@/types/annotation';
import { Download, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ExportControlsProps {
  projectName: string;
  imageName: string;
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  className?: string;
}

export const ExportControls = ({
  projectName,
  imageName,
  imageUrl,
  boundingBoxes,
  className
}: ExportControlsProps) => {
  
  const generateExportData = (): AnnotationExport => {
    // Calculate relative coordinates (0-1 range)
    const image = new Image();
    image.src = imageUrl;
    
    const tagCounts = boundingBoxes.reduce((acc, box) => {
      acc[box.tag] = (acc[box.tag] || 0) + 1;
      return acc;
    }, {} as Record<AnnotationTag, number>);

    return {
      project: {
        name: projectName,
        imageName,
        imageUrl
      },
      annotations: boundingBoxes.map(box => ({
        id: box.id,
        tag: box.tag,
        boundingBox: {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height)
        },
        relativeCoordinates: {
          x: Number((box.x / image.width).toFixed(4)),
          y: Number((box.y / image.height).toFixed(4)),
          width: Number((box.width / image.width).toFixed(4)),
          height: Number((box.height / image.height).toFixed(4))
        }
      })),
      metadata: {
        totalAnnotations: boundingBoxes.length,
        tagCounts,
        createdAt: new Date().toISOString(),
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
      a.download = `${projectName.replace(/\s+/g, '_')}_annotations.json`;
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
    <Card className={`p-4 ${className}`}>
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