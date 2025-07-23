import json
import mimetypes
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any

from src.llm import detect_ui_elements


class BatchProcessor:
    """Lightweight batch processor for auto-predicting multiple images."""

    def __init__(self, model_name: str, max_concurrent: int = 5):
        self.model_name = model_name
        self.max_concurrent = max_concurrent
        self.results: list[dict[str, Any]] = []

    def process_single_image(self, image_path: Path) -> dict[str, Any]:
        """Process a single image."""
        start_time = time.time()
        result = {
            "image_path": str(image_path),
            "status": "pending",
            "error": None,
            "annotations": [],
            "processing_time": 0
        }

        try:
            # Read image
            with open(image_path, "rb") as f:
                image_data = f.read()

            # Get mime type
            mime_type, _ = mimetypes.guess_type(str(image_path))
            if not mime_type:
                mime_type = "image/png"

            # Detect UI elements
            detection_result = detect_ui_elements(
                image_data=image_data,
                image_type=mime_type,
                model_name=self.model_name
            )

            result["annotations"] = [ann.model_dump() for ann in detection_result.annotations]
            result["image_dimensions"] = detection_result.dimensions.model_dump() if detection_result.dimensions else None
            result["status"] = "completed"

        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)
            print(f"Error processing {image_path}: {e}")

        result["processing_time"] = time.time() - start_time
        return result

    def process_batch(self, image_paths: list[Path], progress_callback=None) -> list[dict[str, Any]]:
        """Process a batch of images concurrently using threads."""
        total = len(image_paths)
        completed = 0
        results = []

        with ThreadPoolExecutor(max_workers=self.max_concurrent) as executor:
            # Submit all tasks
            future_to_path = {executor.submit(self.process_single_image, path): path 
                            for path in image_paths}

            # Process with progress updates
            for future in as_completed(future_to_path):
                result = future.result()
                results.append(result)
                completed += 1

                if progress_callback:
                    progress_callback(completed, total)
                else:
                    print(f"Progress: {completed}/{total} ({completed/total*100:.1f}%)")

        return results

    def save_results(self, results: list[dict[str, Any]], output_dir: Path):
        """Save results as individual JSON files in the predictions format."""
        output_dir.mkdir(parents=True, exist_ok=True)

        saved_count = 0
        for result in results:
            if result["status"] != "completed":
                continue

            # Extract image name from path
            image_path = Path(result["image_path"])
            image_name = image_path.name

            # Create prediction data in the required format
            prediction_data = {
                "imageName": image_name,
                "imageDimensions": result.get("image_dimensions"),
                "annotations": [],
                "metadata": {
                    "totalAnnotations": len(result["annotations"]),
                    "exportedAt": datetime.now().isoformat() + "Z"
                }
            }

            # Convert annotations to the required format
            for ann_idx, annotation in enumerate(result["annotations"]):
                prediction_data["annotations"].append({
                    "id": f"pred-{ann_idx + 1}",
                    "x": int(annotation["x"]),
                    "y": int(annotation["y"]),
                    "width": int(annotation["width"]),
                    "height": int(annotation["height"]),
                    "tag": annotation["tag"],
                    "source": "prediction"
                })

            # Save to individual JSON file
            output_file = output_dir / f"{image_path.stem}_annotations.json"
            with open(output_file, "w") as f:
                json.dump(prediction_data, f, indent=2)

            saved_count += 1

        print(f"Saved {saved_count} prediction files to {output_dir}")

    @staticmethod
    def load_results(results_path: Path) -> dict[str, Any]:
        """Load results from JSON file."""
        with open(results_path) as f:
            return json.load(f)


def auto_predict_images(
    *,
    image_dir: Path,
    output_dir: Path = None,
    model_name: str = None,
    max_concurrent: int = 5,
    max_images: int = 1000
):
    """Auto-predict UI elements for up to 1000 images in a directory."""

    # Default output directory
    if output_dir is None:
        output_dir = Path(__file__).parent.parent.parent / "test_data" / "predictions"

    # Find all image files
    image_extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    image_files = []

    for ext in image_extensions:
        image_files.extend(image_dir.glob(f"**/*{ext}"))
        image_files.extend(image_dir.glob(f"**/*{ext.upper()}"))

    # Limit to max_images
    image_files = image_files[:max_images]

    if not image_files:
        print(f"No images found in {image_dir}")
        return

    print(f"Found {len(image_files)} images to process")

    # Create processor and run
    processor = BatchProcessor(model_name=model_name, max_concurrent=max_concurrent)
    start_time = time.time()

    results = processor.process_batch(image_files)

    total_time = time.time() - start_time
    print(f"\nCompleted in {total_time:.1f} seconds")
    print(f"Average time per image: {total_time/len(image_files):.1f} seconds")

    # Save results
    processor.save_results(results, output_dir)

    return results


if __name__ == "__main__":
    # Example usage
    import sys

    if len(sys.argv) < 3:
        print("Usage: python batch_processor.py <image_dir> <output_json>")
        sys.exit(1)

    image_dir = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    auto_predict_images(
        image_dir=image_dir,
        output_path=output_path,
        max_concurrent=5  # Process 5 images concurrently
    )
