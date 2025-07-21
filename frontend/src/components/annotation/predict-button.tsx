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
  const { selectedModel, addPredictions } = useAnnotationStore();
  const { getCurrentImageFile } = useImageStore();
  const { mutate: predict, isPending } = usePredictUIElements();
  
  const imageFile = getCurrentImageFile();

  const handlePredict = () => {
    if (!imageFile) {
      toast.error('Please upload an image first');
      return;
    }

    if (!selectedModel) {
      toast.error('Please select a model first');
      return;
    }

    toast.info('Analyzing image with AI...');
    
    predict(
      { imageFile, modelName: selectedModel },
      {
        onSuccess: (data) => {
          // Convert API response to BoundingBox format
          const predictions: BoundingBox[] = data.annotations.map((annotation, index) => ({
            id: `prediction-${Date.now()}-${index}`,
            x: annotation.x,
            y: annotation.y,
            width: annotation.width,
            height: annotation.height,
            tag: annotation.tag,
            source: 'prediction' as const,
          }));

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
      disabled={disabled || isPending || !imageFile || !selectedModel}
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