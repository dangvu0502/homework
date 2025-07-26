import { usePredictUIElements } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import type { BoundingBox } from '@/types/annotation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAnnotationStore } from '@/stores/use-annotation-store';
import { useImageStore } from '@/stores/use-image-store';

interface PredictButtonProps {
  disabled?: boolean;
}

export const PredictButton = ({ disabled = false }: PredictButtonProps) => {
  const { addPredictions, imageDimensions } = useAnnotationStore();
  const { getCurrentImageFile } = useImageStore();
  const { mutate: predict, isPending } = usePredictUIElements();
  
  const imageFile = getCurrentImageFile();

  const handlePredict = () => {
    if (!imageFile) {
      toast.error('Please upload an image first');
      return;
    }

    toast.info('Analyzing image with AI...');
    
    predict(
      { imageFile },
      {
        onSuccess: (data) => {
          // Convert API response to BoundingBox format
          // API returns normalized coordinates (0-1000), convert to pixel coordinates
          const predictions: BoundingBox[] = data.annotations.map((annotation, index) => {
            let x = annotation.x;
            let y = annotation.y;
            let width = annotation.width;
            let height = annotation.height;
            
            // Convert from normalized (0-1000) to pixel coordinates if we have dimensions
            if (imageDimensions) {
              x = (annotation.x / 1000) * imageDimensions.width;
              y = (annotation.y / 1000) * imageDimensions.height;
              width = (annotation.width / 1000) * imageDimensions.width;
              height = (annotation.height / 1000) * imageDimensions.height;
            }
            
            return {
              id: `prediction-${Date.now()}-${index}`,
              x,
              y,
              width,
              height,
              tag: annotation.tag,
              source: 'prediction' as const,
            };
          });

          addPredictions(predictions);
          
          toast.success(
            `Found ${predictions.length} UI elements in ${data.processing_time.toFixed(2)}s`
          );
        },
        onError: (error) => {
          console.error('Prediction failed:', error);
          toast.error(
            error instanceof Error 
              ? error.message 
              : 'Failed to predict UI elements. Please try again.'
          );
        }
      }
    );
  };

  return (
    <Button
      onClick={handlePredict}
      disabled={disabled || isPending || !imageFile}
      className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Predict UI Elements
        </>
      )}
    </Button>
  );
};