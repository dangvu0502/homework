import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAnnotationStore } from "@/stores/use-annotation-store";
import { useImageStore } from "@/stores/use-image-store";
import type { AnnotationExport } from "@/types/annotation";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { Download, FileText, Package } from "lucide-react";
import { toast } from "sonner";

export const ExportControls = () => {
  const { boundingBoxes, imageDimensions, annotationsPerImage } =
    useAnnotationStore();
  const { imageFiles, getCurrentImageFile } = useImageStore();

  const currentImageFile = getCurrentImageFile();
  const imageName = currentImageFile?.name || "";

  const annotationStats = {
    user: boundingBoxes.filter((box) => box.source === "user").length,
    prediction: boundingBoxes.filter((box) => box.source === "prediction")
      .length,
  };

  // Calculate total annotations including current unsaved ones
  const allImagesAnnotationCount = (() => {
    const savedCount = Object.entries(annotationsPerImage)
      .filter(([name]) => name !== imageName) // Exclude current image from saved count
      .reduce((sum, [, annotations]) => sum + annotations.length, 0);

    // Add current image annotations (use the larger of saved or current working set)
    const currentImageCount = imageName
      ? Math.max(
          annotationsPerImage[imageName]?.length || 0,
          boundingBoxes.length
        )
      : 0;

    return savedCount + currentImageCount;
  })();

  const generateExportData = (): AnnotationExport => {
    return {
      imageName,
      annotations: boundingBoxes.map((box) => ({
        id: box.id,
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        tag: box.tag,
        source: box.source || "user",
      })),
      metadata: {
        totalAnnotations: boundingBoxes.length,
        exportedAt: new Date().toISOString(),
      },
    };
  };

  const exportAsJSON = () => {
    try {
      const data = generateExportData();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${imageName.replace(/\.[^/.]+$/, "")}_annotations.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Annotations exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export annotations");
    }
  };

  const copyToClipboard = async () => {
    try {
      const data = generateExportData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success("Annotations copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy annotations");
    }
  };

  const exportAllAsZip = async () => {
    try {
      const zipFileWriter = new BlobWriter();
      const zipWriter = new ZipWriter(zipFileWriter);

      let totalAnnotations = 0;

      // Create a copy of annotationsPerImage that includes current annotations
      const allAnnotations = { ...annotationsPerImage };
      if (imageName && boundingBoxes.length > 0) {
        allAnnotations[imageName] = boundingBoxes;
      }

      // Add all annotation files to zip
      for (const imageFile of imageFiles) {
        const annotations = allAnnotations[imageFile.name] || [];
        if (annotations.length === 0) continue;

        totalAnnotations += annotations.length;

        const exportData: AnnotationExport = {
          imageName: imageFile.name,
          annotations: annotations.map((box) => ({
            id: box.id,
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
            tag: box.tag,
            source: box.source || "user",
          })),
          metadata: {
            totalAnnotations: annotations.length,
            exportedAt: new Date().toISOString(),
          },
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const fileName = `${imageFile.name.replace(
          /\.[^/.]+$/,
          ""
        )}_annotations.json`;

        await zipWriter.add(fileName, new Blob([jsonString]).stream());
      }

      await zipWriter.close();

      const zipBlob = await zipFileWriter.getData();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all_annotations.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const imageCount = Object.keys(allAnnotations).filter(
        (name) => allAnnotations[name].length > 0
      ).length;
      toast.success(
        `Exported ${totalAnnotations} annotations from ${imageCount} images!`
      );
    } catch (error) {
      console.error("Batch export failed:", error);
      toast.error("Failed to export all annotations");
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Export</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">{annotationStats.user} user</Badge>
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-700"
            >
              {annotationStats.prediction} AI
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={exportAsJSON}
            disabled={boundingBoxes.length === 0}
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <Download className="h-4 w-4" />
            Export current as JSON
          </Button>

          <Button
            onClick={copyToClipboard}
            disabled={boundingBoxes.length === 0}
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <FileText className="h-4 w-4" />
            Copy current to Clipboard
          </Button>

          {imageFiles.length > 1 && (
            <Button
              onClick={exportAllAsZip}
              disabled={allImagesAnnotationCount === 0}
              size="sm"
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Package className="h-4 w-4" />
              Export All ({allImagesAnnotationCount} annotations)
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
