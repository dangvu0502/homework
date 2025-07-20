import base64
import json
import logging
from pathlib import Path
from typing import Any

import litellm
from json_repair import repair_json

from src.schemas import AnnotationSchema
from src.settings import config

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a multimodal assistant that identifies user-interface elements in an image. "
    "Given an image of a web or mobile UI, detect up to 20 elements of the following types: "
    "button, input, radio, dropdown. For every detected element, output a JSON object with the "
    "keys: x, y, width, height, tag. The (x, y) represent the top-left corner in pixels, "
    "width and height are in pixels, tag is one of: button, input, radio, dropdown. "
    "Return your response as a JSON object with a single key 'annotations' containing an array of detected elements. "
    "Example: {\"annotations\": [{\"x\": 100, \"y\": 200, \"width\": 100, \"height\": 50, \"tag\": \"button\"}]}"
)

USER_PROMPT = (
    "Here is the image"
)

async def detect_ui_elements(
    *,
    image_data: bytes,
    image_type: str,
    model_name: str,
) -> list[AnnotationSchema]:
    """Call a multimodal LLM via LiteLLM to detect UI elements."""
    
    model_config: dict[str, Any] = config.models.get(model_name, {})
    model: str = model_config.get("model_code", model_name)
    api_key: str | None = model_config.get("api_key")
    base_url: str | None = model_config.get("base_url")

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

    response = await litellm.acompletion(
        model=model,
        messages=messages,
        response_format={"type": "json_object"},
        base_url=base_url,
        api_key=api_key,
        temperature=0.1,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Model returned empty response")
    
    repaired_json = repair_json(content.strip())
    data = json.loads(repaired_json)
    
    annotations = data.get("annotations", [])
    if not isinstance(annotations, list):
        raise ValueError("Annotations must be a list")
    
    return [AnnotationSchema(**ann) for ann in annotations]


if __name__ == "__main__":
    import asyncio
    from pathlib import Path
    import mimetypes
    
    image_path = Path(__file__).parent.parent / "img" / "1.png"
    
    try:
        # Read image file
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        # Get mime type
        mime_type, _ = mimetypes.guess_type(str(image_path))
        if not mime_type:
            mime_type = "image/png"
        
        annotations = asyncio.run(
            detect_ui_elements(
                image_data=image_data,
                image_type=mime_type,
                model_name="gemini-2.5-pro"
            )
        )
        
        print(f"Found {len(annotations)} UI elements:")
        for i, ann in enumerate(annotations, 1):
            print(f"{i}. {ann.tag} at ({ann.x}, {ann.y}) - {ann.width}x{ann.height}")
        
        print("\nRaw data:")
        for ann in annotations:
            print(ann.model_dump())
            
    except Exception as e:
        print(f"Error: {e}")