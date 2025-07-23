import { apiClient } from "@/api/client";
import type { JobResultResponse, JobStatus } from "@/api/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  onComplete?: (results: any[], failedFiles?: FileUploadStatus[]) => void;
  onFilesSelect?: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
  mode?: "process" | "select";
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  onComplete,
  onFilesSelect,
  maxFiles = 100,
  className,
  mode = "process",
}) => {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const pendingJobsRef = useRef<Set<string>>(new Set());
  const processedJobsRef = useRef<Set<string>>(new Set());
  const hasCalledCompleteRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Use refs to access current state in polling callback
  const filesRef = useRef<FileUploadStatus[]>([]);
  const isProcessingRef = useRef(false);
  
  // Update refs when state changes
  useEffect(() => {
    filesRef.current = files;
    console.log("Files state updated:", files.map(f => ({ name: f.file.name, status: f.status, jobId: f.jobId })));
  }, [files]);
  
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);
  
  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "failed").length;

   // Check if all jobs are complete and trigger callback
   const checkAllJobsComplete = useCallback(() => {
     const currentFiles = filesRef.current;
     const jobFiles = currentFiles.filter(f => f.jobId); // Only files with jobs
     
     if (jobFiles.length === 0) return;
     
     const allDone = jobFiles.every(
       (f) => f.status === "completed" || f.status === "failed"
     );

     console.log(`Checking completion: ${jobFiles.filter(f => f.status === "completed" || f.status === "failed").length}/${jobFiles.length} done`);

     if (allDone && !hasCalledCompleteRef.current) {
       const successfulResults = currentFiles
         .filter((f) => f.status === "completed" && f.result)
         .map((f) => f.result as JobResultResponse);

       const failedFiles = currentFiles.filter(
         (f) => f.status === "failed"
       );

       console.log(`All jobs complete! Success: ${successfulResults.length}, Failed: ${failedFiles.length}`);

       if (onComplete && (successfulResults.length > 0 || failedFiles.length > 0)) {
         hasCalledCompleteRef.current = true;
         setIsProcessing(false);
         stopPolling();
         console.log("Calling onComplete callback");
         onComplete(successfulResults, failedFiles);
       }
     }
   }, [onComplete]);
   
  // Update progress whenever files change
  useEffect(() => {
    const completed = files.filter(
      (f) => f.status === "completed" || f.status === "failed"
    ).length;
    const total = files.filter(f => f.status !== "idle").length; // Only count files that have been uploaded
    const progress = total > 0 ? (completed / total) * 100 : 0;
    setOverallProgress(progress);
    console.log(`Progress updated: ${completed}/${total} = ${progress}%`);
    
    // Check if all jobs are complete
    if (isProcessing) {
      checkAllJobsComplete();
    }
  }, [files, isProcessing, checkAllJobsComplete]);

   // Function to check status of pending jobs
   const checkPendingJobsStatus = async () => {
    const pendingJobs = Array.from(pendingJobsRef.current);
    if (pendingJobs.length === 0) {
      console.log("No pending jobs to check");
      return;
    }

    console.log(
      "Checking status for pending jobs:",
      pendingJobs
    );

    for (const jobId of pendingJobs) {
      // Skip if already processed
      if (processedJobsRef.current.has(jobId)) {
        pendingJobsRef.current.delete(jobId);
        continue;
      }

      try {
        const status = await apiClient.checkJobStatus(jobId);
        console.log(`Status for job ${jobId}:`, status);
        
        // Always update the UI with the current status first
        setFiles((prev) =>
          prev.map((file) => {
            if (file.jobId === jobId) {
              if (status.status === "processing" && file.status !== "processing") {
                return {
                  ...file,
                  status: "processing" as const,
                  progress: status.progress || "Processing...",
                };
              }
            }
            return file;
          })
        );

        if (status.status === "completed" || status.status === "failed") {
          // Mark as processed immediately to prevent duplicate updates
          processedJobsRef.current.add(jobId);
          pendingJobsRef.current.delete(jobId);

          if (status.status === "completed") {
            // Fetch full results
            const results = await apiClient.getJobResults(jobId);

            // Update files state
            setFiles((prev) => {
              const newFiles = prev.map((file) => {
                if (file.jobId === jobId && file.status !== "completed") {
                  return {
                    ...file,
                    status: "completed" as const,
                    result: results,
                  };
                }
                return file;
              });
              return newFiles;
            });
          } else {
            setFiles((prev) =>
              prev.map((file) => {
                if (file.jobId === jobId && file.status !== "failed") {
                  return {
                    ...file,
                    status: "failed" as const,
                    error: status.error || "Processing failed",
                  };
                }
                return file;
              })
            );
          }
        }
      } catch (error) {
        console.error(`Error checking job ${jobId}:`, error);
        // Mark as failed if we can't check status after multiple attempts
        if (error instanceof Error && error.message.includes('timeout')) {
          setFiles((prev) =>
            prev.map((file) => {
              if (file.jobId === jobId) {
                return {
                  ...file,
                  status: "failed" as const,
                  error: "Timeout checking job status",
                };
              }
              return file;
            })
          );
          pendingJobsRef.current.delete(jobId);
          processedJobsRef.current.add(jobId);
        }
      }
    }

    // Progress is now updated via useEffect when files state changes

    // No need to manually schedule next check - polling interval will handle it
  };

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
    hasCalledCompleteRef.current = false;
    processedJobsRef.current.clear();
    pendingJobsRef.current.clear();

    // Upload all files
    const uploadPromises = files.map(async (fileStatus, index) => {
      try {
        console.log(`Uploading file ${index}: ${fileStatus.file.name}`);
        const response = await apiClient.uploadImageForProcessing(
          fileStatus.file
        );
        console.log(
          `Upload successful for file ${index}, got task_id: ${response.task_id}`
        );
        return { success: true, index, jobId: response.task_id };
      } catch (error) {
        console.error(`Upload failed for file ${index}:`, error);
        return {
          success: false,
          index,
          error: error instanceof Error ? error.message : "Upload failed",
        };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Update all files with their results at once
    setFiles((prev) => {
      const updated = [...prev];
      uploadResults.forEach((result) => {
        if (result.success) {
          updated[result.index] = {
            ...updated[result.index],
            jobId: result.jobId,
            status: "pending",
          };
        } else {
          updated[result.index] = {
            ...updated[result.index],
            status: "failed",
            error: result.error,
          };
        }
      });
      console.log("Updated all files with upload results:", updated);
      return updated;
    });

    const successfulUploads = uploadResults.filter((r) => r.success);

    // Subscribe to WebSocket updates for successful uploads
    if (successfulUploads.length > 0) {
      const jobIds = successfulUploads
        .map((r) => r.jobId)
        .filter((id): id is string => !!id);
      console.log("Starting to poll for job updates:", jobIds);

      // Track pending jobs
      jobIds.forEach((id) => pendingJobsRef.current.add(id));
      
      // Set processing state to true to enable polling
      setIsProcessing(true);

      // Start polling for status updates with a small delay to ensure state is updated
      setTimeout(() => {
        console.log("Starting status polling for jobs:", jobIds);
        startPolling();
      }, 100);
    } else {
      setIsProcessing(false);
      stopPolling();
    }
  };


  // Start polling mechanism
  const startPolling = () => {
    console.log("Starting polling mechanism");
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Set up new polling interval
    pollingIntervalRef.current = setInterval(async () => {
      // Use refs to get current state values
      const currentIsProcessing = isProcessingRef.current;
      const currentPendingJobs = pendingJobsRef.current.size;
      
      console.log(`Polling check - isProcessing: ${currentIsProcessing}, pending jobs: ${currentPendingJobs}`);
      
      if (currentPendingJobs > 0 && currentIsProcessing) {
        console.log("Executing job status check...");
        await checkPendingJobsStatus();
      } else if (currentPendingJobs === 0) {
        console.log("No pending jobs, stopping polling");
        stopPolling();
      }
    }, 2000); // Poll every 2 seconds
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop polling
      stopPolling();
    };
  }, []);

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
            PNG, JPG, WEBP up to 10MB each (max {maxFiles} files)
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Completed: {completedCount}/{files.length}
                  {failedCount > 0 && ` (${failedCount} failed)`}
                </p>
              </div>
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
