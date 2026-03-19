# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **Content-Type**: `application/json`（除上传外）
- **认证方式**: 暂不涉及（MVP 阶段）

---

## 1. 上传户型图

**Endpoint**: `POST /api/upload`

**Content-Type**: `multipart/form-data`

**Request**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 支持 JPG/PNG，最大 10MB |

**Response**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "image_id": "img_a1b2c3d4e5",
    "filename": "floorplan.jpg",
    "url": "https://cos-xxx.cos.ap-guangzhou.myqcloud.com/floorplan.jpg",
    "width": 1920,
    "height": 1080
  }
}
```

---

## 2. 识别户型结构

**Endpoint**: `POST /api/recognize`

**Request**:
```json
{
  "image_id": "img_a1b2c3d4e5"
}
```

**Response**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "walls": [
      {"x1": 100, "y1": 200, "x2": 500, "y2": 200, "thickness": 10}
    ],
    "doors": [
      {"x": 300, "y": 200, "width": 80, "height": 10, "type": "door"}
    ],
    "windows": [
      {"x": 400, "y": 100, "width": 100, "height": 10, "type": "window"}
    ],
    "rooms": [
      {"id": 1, "type": "living", "area": 25.5, "points": [[0,0],[200,0],[200,150],[0,150]]},
      {"id": 2, "type": "bedroom", "area": 15.2, "points": [[200,0],[400,0],[400,150],[200,150]]}
    ],
    "total_area": 120.5
  }
}
```

---

## 3. 生成效果图

**Endpoint**: `POST /api/generate`

**Request**:
```json
{
  "image_id": "img_a1b2c3d4e5",
  "style": "modern",
  "room": "living",
  "strength": 0.75
}
```

**风格选项 (style)**:
| 值 | 说明 |
|----|------|
| modern | 现代简约 |
| nordic | 北欧风格 |
| chinese | 中式风格 |
| american | 美式风格 |
| minimalist | 极简主义 |

**房间选项 (room)**:
| 值 | 说明 |
|----|------|
| living | 客厅 |
| bedroom | 卧室 |
| kitchen | 厨房 |
| bathroom | 卫生间 |
| study | 书房 |

**Response**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "task_x789y456",
    "estimated_time": 8
  }
}
```

---

## 4. 查询生成结果

**Endpoint**: `GET /api/result/{task_id}`

**Response (进行中)**:
```json
{
  "code": 0,
  "message": "processing",
  "data": {
    "status": "pending",
    "progress": 35,
    "images": []
  }
}
```

**Response (完成)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "done",
    "progress": 100,
    "images": [
      "https://cos-xxx.cos.ap-guangzhou.myqcloud.com/result_1.jpg",
      "https://cos-xxx.cos.ap-guangzhou.myqcloud.com/result_2.jpg",
      "https://cos-xxx.cos.ap-guangzhou.myqcloud.com/result_3.jpg"
    ]
  }
}
```

**Response (失败)**:
```json
{
  "code": 1,
  "message": "generation failed",
  "data": {
    "status": "failed",
    "error": "CUDA out of memory"
  }
}
```

---

## 5. 错误码说明

| code | 说明 |
|------|------|
| 0 | 成功 |
| 1001 | 图片尺寸过大 |
| 1002 | 不支持的图片格式 |
| 2001 | 户型识别失败 |
| 2002 | 效果图生成失败 |
| 3001 | GPU 资源不足 |
| 3002 | 任务队列已满 |

---

## 6. WebSocket 实时推送（可选）

**Endpoint**: `WS /api/ws/{task_id}`

**消息格式**:
```json
{
  "type": "progress",
  "data": {
    "progress": 50,
    "stage": "denoising"
  }
}
```
