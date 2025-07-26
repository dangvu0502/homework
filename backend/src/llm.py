import base64
import json
import logging
import time
from pathlib import Path
from typing import Any

from openai import OpenAI, RateLimitError, APIError
from json_repair import repair_json

from src.schemas import (
    AnnotationSchema,
    DetectionResult,
)
from src.settings import config
from src.constants import UI_ELEMENT_TYPES

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a multimodal assistant that identifies user-interface elements in an image. "
    "Given an image of a web or mobile UI, detect all of the prominent items in the image. "
    f"Focus on these element types: {', '.join(UI_ELEMENT_TYPES)}. "
    "For every detected element, output a JSON object with the keys: box_2d, tag. "
    "The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000. "
    f"The tag is one of: {', '.join(UI_ELEMENT_TYPES)}. "
    "Return your response as a JSON object with 'annotations' array. "
    "Example: {\"annotations\": [{\"box_2d\": [100, 200, 150, 300], \"tag\": \"button\"}]}"
)

USER_PROMPT = (
    "Detect all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000."
)

def detect_ui_elements(
    *,
    image_data: bytes,
    image_type: str,
) -> DetectionResult:
    """Call a multimodal LLM via OpenRouter to detect UI elements."""

    # Use model from environment variable
    model: str = config.openrouter_model
    api_key: str = config.openrouter_api_key
    base_url: str = "https://openrouter.ai/api/v1"

    encoded_image = base64.b64encode(image_data).decode()
    data_uri = f"data:{image_type};base64,{encoded_image}"

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": USER_PROMPT},
                {"type": "image_url", "image_url": data_uri},
            ],
        },
    ]

    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
    )
    
    # Retry logic for rate limits
    max_retries = 3
    retry_delay = 1.0
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            break
        except RateLimitError as e:
            if attempt < max_retries - 1:
                logger.warning(f"Rate limit hit, retrying in {retry_delay}s: {e}")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Rate limit exceeded after {max_retries} attempts")
                raise
        except APIError as e:
            logger.error(f"API error: {e}")
            raise

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Model returned empty response")

    repaired_json = repair_json(content.strip())
    data = json.loads(repaired_json)

    annotations = data.get("annotations", [])
    if not isinstance(annotations, list):
        raise ValueError("Annotations must be a list")

    # Convert Gemini-style box_2d format to our x, y, width, height format
    annotations_list = []
    for ann in annotations:
        if "box_2d" in ann and isinstance(ann["box_2d"], list) and len(ann["box_2d"]) == 4:
            # box_2d is [ymin, xmin, ymax, xmax] normalized to 0-1000
            ymin, xmin, ymax, xmax = ann["box_2d"]
            
            # Keep coordinates in normalized form (0-1000)
            # The frontend will need to scale these based on actual image size
            x = xmin
            y = ymin
            width = xmax - xmin
            height = ymax - ymin
            
            annotation = AnnotationSchema(
                x=x,
                y=y,
                width=width,
                height=height,
                tag=ann.get("tag", "button")
            )
            annotations_list.append(annotation)
        else:
            # Fallback to old format if box_2d is not present
            annotations_list.append(AnnotationSchema(**ann))

    return DetectionResult(annotations=annotations_list)


if __name__ == "__main__":
    import mimetypes

    dir = Path(__file__).parent.parent / "dataset" / "test" / "images"
    image_paths = list(dir.glob("*.png"))

    if not image_paths:
        print(f"No PNG images found in {dir}")
        exit(1)

    image_path = image_paths[0]

    print(f"Processing image: {image_path}")

    try:
        # Read image file
        with open(image_path, "rb") as f:
            image_data = f.read()

        # Get mime type
        mime_type, _ = mimetypes.guess_type(str(image_path))
        if not mime_type:
            mime_type = "image/png"

        result = detect_ui_elements(
            image_data=image_data,
            image_type=mime_type,
        )

        print(f"Found {len(result.annotations)} UI elements:")

        for i, ann in enumerate(result.annotations, 1):
            print(f"{i}. {ann.tag} at ({ann.x}, {ann.y}) - {ann.width}x{ann.height}")

        print("\nRaw data:")
        for ann in result.annotations:
            print(ann.model_dump())

    except Exception as e:
        print(f"Error: {e}")
