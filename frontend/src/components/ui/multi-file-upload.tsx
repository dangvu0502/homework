import { apiClient } from "@/api/client";
import type { JobResultResponse, JobStatus } from "@/api/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/hooks/use-web-socket";
import { AlertCircle, FileImage, Upload, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface FileUploadStatus {
  file: File;
  jobId?: string;
  status: JobStatus | "idle";
  progress?: string;
  error?: string;
  result?: any;
}

interface MultiFileUploadProps {
  onComplete?: (results: any[]) => void;
  onFilesSelect?: (files: File[]) => void;
  modelName?: string;
  maxFiles?: number;
  className?: string;
  mode?: "process" | "select";
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  onComplete,
  onFilesSelect,
  modelName,
  maxFiles = 50,
  className,
  mode = "process",
}) => {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const pendingJobsRef = useRef<Set<string>>(new Set());
  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "failed").length;

  // WebSocket hook for real-time updates
  const { subscribeToJobs, unsubscribeFromJobs } = useWebSocket({
    onJobUpdate: useCallback(
      (jobId: string, data: any) => {
        console.log(`WebSocket update for job ${jobId}:`, data);

        // Update file status based on WebSocket data
        setFiles((prevFiles) => {
          const updatedFiles = prevFiles.map((file, index) => {
            if (file.jobId === jobId) {
              const updatedFile = { ...file };

              if (data.status === "processing") {
                updatedFile.status = "processing";
                updatedFile.progress = data.message;
              } else if (data.status === "completed") {
                updatedFile.status = "completed";
                updatedFile.result = data.results;
                pendingJobsRef.current.delete(jobId);
              } else if (data.status === "failed") {
                updatedFile.status = "failed";
                updatedFile.error = data.error;
                pendingJobsRef.current.delete(jobId);
              }

              return updatedFile;
            }
            return file;
          });

          // Update progress
          const completed = updatedFiles.filter(
            (f) => f.status === "completed" || f.status === "failed"
          ).length;
          setOverallProgress((completed / updatedFiles.length) * 100);

          // Check if all jobs are done
          if (pendingJobsRef.current.size === 0 && mode === "process") {
            setIsProcessing(false);

            // Collect successful results
            const successfulResults = updatedFiles
              .filter((f) => f.status === "completed" && f.result)
              .map((f) => f.result as JobResultResponse);

            if (onComplete && successfulResults.length > 0) {
              setTimeout(() => onComplete(successfulResults), 100);
            }
          }

          return updatedFiles;
        });
      },
      [mode, onComplete]
    ),
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).slice(0, maxFiles);
      const newFiles = selectedFiles.map((file) => ({
        file,
        status: "idle" as const,
      }));
      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));

      // In select mode, immediately call onFilesSelect
      if (mode === "select" && onFilesSelect) {
        const allFiles = [...files, ...newFiles]
          .slice(0, maxFiles)
          .map((f) => f.file);
        onFilesSelect(allFiles);
      }
    },
    [maxFiles, mode, onFilesSelect, files]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        // In select mode, update onFilesSelect
        if (mode === "select" && onFilesSelect) {
          onFilesSelect(updated.map((f) => f.file));
        }
        return updated;
      });
    },
    [mode, onFilesSelect]
  );

  const processFiles = async () => {
    setIsProcessing(true);
    setOverallProgress(0);

    // Upload all files
    const uploadPromises = files.map(async (fileStatus, index) => {
      try {
        const response = await apiClient.uploadImageForProcessing(
          fileStatus.file,
          modelName
        );

        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            jobId: response.task_id,
            status: "pending",
          };
          return updated;
        });

        return { success: true, index, jobId: response.task_id };
      } catch (error) {
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: "failed",
            error: error instanceof Error ? error.message : "Upload failed",
          };
          return updated;
        });
        return { success: false, index };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
    const successfulUploads = uploadResults.filter((r) => r.success);

    // Subscribe to WebSocket updates for successful uploads
    if (successfulUploads.length > 0) {
      const jobIds = successfulUploads
        .map((r) => r.jobId)
        .filter((id): id is string => !!id);
      console.log("Subscribing to WebSocket updates for jobs:", jobIds);

      // Track pending jobs
      jobIds.forEach((id) => pendingJobsRef.current.add(id));

      // Subscribe to WebSocket updates
      subscribeToJobs(jobIds);
    } else {
      setIsProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all jobs
      const jobIds = Array.from(pendingJobsRef.current);
      if (jobIds.length > 0) {
        unsubscribeFromJobs(jobIds);
      }
    };
  }, [unsubscribeFromJobs]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="multi-file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="multi-file-upload"
          className="cursor-pointer flex flex-col items-center space-y-2"
        >
          <Upload className="h-12 w-12 text-gray-400" />
          <span className="text-lg font-medium">
            Click to upload multiple images
          </span>
          <span className="text-sm text-gray-500">
            PNG, JPG, WEBP up to 50MB each (max {maxFiles} files)
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Selected Files ({files.length})
            </h3>
            {!isProcessing && mode === "process" && (
              <Button onClick={processFiles} disabled={files.length === 0}>
                Process All Images
              </Button>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={overallProgress} />
              <p className="text-sm text-gray-500">
                Completed: {completedCount}/{files.length}
                {failedCount > 0 && ` (${failedCount} failed)`}
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((fileStatus, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileImage className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">
                      {fileStatus.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {fileStatus.status !== "idle" && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        fileStatus.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : fileStatus.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : fileStatus.status === "processing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {fileStatus.status}
                    </span>
                  )}

                  {!isProcessing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {failedCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {failedCount} file(s) failed to process. Check your connection
                and try again.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};
