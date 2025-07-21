import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, FileImage } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface MultiFileUploadProps {
  onFilesSelect: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  className?: string;
}

export const MultiFileUpload = ({
  onFilesSelect,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB per file
  maxFiles = 100,
  className
}: MultiFileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (files: File[]) => {
    // Filter valid image files and check size
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        console.warn(`Skipping non-image file: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        console.warn(`Skipping large file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        return false;
      }
      return true;
    });

    // Limit number of files
    const filesToAdd = validFiles.slice(0, maxFiles - selectedFiles.length);
    
    if (filesToAdd.length > 0) {
      const newFiles = [...selectedFiles, ...filesToAdd];
      setSelectedFiles(newFiles);
      onFilesSelect(newFiles);
    }

    if (validFiles.length > filesToAdd.length) {
      alert(`Maximum ${maxFiles} files allowed. Some files were not added.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFilesSelect(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFilesSelect(files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    onFilesSelect([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={cn("relative", className)}>
      {selectedFiles.length > 0 ? (
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{selectedFiles.length} Images Selected</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                  />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Badge variant="secondary" className="absolute bottom-1 left-1 text-xs max-w-[90%] truncate">
                  {file.name}
                </Badge>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2"
            disabled={selectedFiles.length >= maxFiles}
          >
            <Upload className="h-4 w-4" />
            Add More Images
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            "hover:border-primary hover:bg-accent/50",
            isDragOver && "border-primary bg-accent/50"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Upload Images</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop UI screenshots or design files here
              </p>
              <p className="text-xs text-muted-foreground">
                Upload 1 to {maxFiles} images, {maxSize / (1024 * 1024)}MB each
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Choose Image(s)
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
    </Card>
  );
};