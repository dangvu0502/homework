import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModels } from '@/api/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useAnnotationStore } from '@/stores/use-annotation-store';

interface ModelSelectorProps {
  disabled?: boolean;
}

export const ModelSelector = ({ disabled = false }: ModelSelectorProps) => {
  const { selectedModel, setSelectedModel } = useAnnotationStore();
  const { data, isLoading, isError, error } = useModels();
  const models = data?.models || [];

  // Set default model when models are loaded
  useEffect(() => {
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel, setSelectedModel]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading models...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load models'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Model
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select 
          value={selectedModel} 
          onValueChange={setSelectedModel}
          disabled={disabled || models.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.length === 0 ? (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                No models available
              </div>
            ) : (
              models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};