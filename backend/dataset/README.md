# UI Element Annotations Dataset

This dataset contains annotations for UI elements across various websites and applications. Each annotation includes bounding box coordinates (x, y, width, height), element type (tag), and metadata.

## Annotation Format

Each annotation file is in JSON format and contains:

```json
{
  "imageName": "example.png",
  "imageDimensions": {
    "width": 1920,
    "height": 1080
  },
  "annotations": [
    {
      "id": "unique-id-1",
      "x": 100,
      "y": 200,
      "width": 150,
      "height": 30,
      "tag": "button",
      "source": "prediction"
    },
    {
      "id": "unique-id-2",
      "x": 300,
      "y": 400,
      "width": 200,
      "height": 40,
      "tag": "input",
      "source": "prediction"
    }
  ],
  "metadata": {
    "totalAnnotations": 2,
    "exportedAt": "2025-07-21T15:21:31.442Z"
  }
}
```

### Fields Explanation:
- **imageName**: Original screenshot filename
- **imageDimensions**: Dimensions of the screenshot
- **annotations**: Array of annotated UI elements
  - **id**: Unique identifier for the element
  - **x**, **y**: Top-left coordinates of the element
  - **width**, **height**: Dimensions of the element
  - **tag**: Type of UI element (button, input, dropdown, etc.)
  - **source**: Source of the annotation ("prediction" for ML-generated)
- **metadata**: 
  - **totalAnnotations**: Count of annotated elements
  - **exportedAt**: Timestamp of annotation export

