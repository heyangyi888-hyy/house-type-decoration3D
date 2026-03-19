# 户型图 → 3D 装修效果图 网站技术方案

## 📌 项目概述

**项目名称**：AI 装修效果图生成平台
**核心功能**：用户上传户型图 → AI 识别结构 → 生成多种装修风格 3D 效果图
**目标用户**：业主（看装修效果）、设计师（快速出图）、中介（房源展示）

---

## 🗓️ 开发计划（6 周）

| 周数 | 目标 | 关键任务 |
|------|------|----------|
| 第 1 周 | 户型图识别 | 模型选型、图像预处理、墙体/门窗检测 API |
| 第 2 周 | 风格生成 | SD + ControlNet 集成、风格模板配置 |
| 第 3 周 | 后端架构 | FastAPI 服务、任务队列、API 接口设计 |
| 第 4 周 | 前端开发 | React/Next.js 上传界面、风格选择、结果展示 |
| 第 5 周 | 3D 交互（可选） | Three.js 集成、简单交互功能 |
| 第 6 周 | 部署上线 | GPU 服务器部署、CDN、COS 配置、压力测试 |

---

## 🧠 技术架构图

```
用户上传户型图
      ↓
  Next.js 前端
      ↓
  FastAPI 后端
      ↓
┌─────┴─────┐
↓           ↓
[户型识别模型]  [SD生成模型]
(YOLO)      (ControlNet)
      ↓           ↓
  结构化数据     效果图
      ↓           ↓
  Three.js 3D  ←  AI 生成图
      ↓
  返回给用户
```

---

## 🏗️ 项目结构

```
decoration-ai/
├── frontend/                    # Next.js 前端
│   ├── app/
│   │   ├── page.tsx           # 首页
│   │   ├── upload/            # 上传页面
│   │   ├── result/            # 结果展示页
│   │   └── api/               # 前端 API 代理
│   ├── components/
│   │   ├── UploadZone.tsx     # 上传组件
│   │   ├── StyleSelector.tsx  # 风格选择器
│   │   ├── ResultGallery.tsx  # 效果图展示
│   │   └── FloorPlan3D.tsx    # 3D 户型图
│   ├── public/
│   └── package.json
│
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── main.py           # FastAPI 入口
│   │   ├── api/
│   │   │   ├── upload.py     # 上传接口
│   │   │   ├── recognize.py  # 户型识别接口
│   │   │   └── generate.py   # 效果图生成接口
│   │   ├── models/           # 数据模型
│   │   ├── services/
│   │   │   ├── detector.py   # 户型检测服务
│   │   │   └── generator.py # 效果图生成服务
│   │   └── core/
│   │       ├── config.py     # 配置文件
│   │       └── cos.py        # 腾讯云 COS
│   ├── models/               # 预训练模型权重
│   ├── requirements.txt
│   └── Dockerfile
│
├── shared/                    # 共享类型定义
│   └── types.ts
│
└── docs/
    ├── API.md                # API 文档
    └── MODEL.md              # 模型说明
```

---

## 🔌 API 接口设计

### 1. 上传户型图
```
POST /api/upload
Request: multipart/form-data { file: Image }
Response: { "image_id": "xxx", "url": "cos://xxx" }
```

### 2. 识别户型结构
```
POST /api/recognize
Request: { "image_id": "xxx" }
Response: {
  "walls": [[x1,y1,x2,y2], ...],
  "doors": [[x,y,w,h], ...],
  "windows": [[x,y,w,h], ...],
  "rooms": [{ "type": "living", "area": 25 }, ...]
}
```

### 3. 生成效果图
```
POST /api/generate
Request: {
  "image_id": "xxx",
  "style": "modern" | "北欧" | "中式" | "简约",
  "room": "living" | "bedroom" | "kitchen"
}
Response: { "task_id": "xxx" }
```

### 4. 查询生成结果
```
GET /api/result/{task_id}
Response: {
  "status": "pending" | "done" | "failed",
  "images": ["cos://xxx.jpg", ...]
}
```

---

## 🤖 模型选型

### 户型识别
| 模型 | 用途 | 来源 |
|------|------|------|
| YOLOv8 | 门窗、房间检测 | Ultralytics |
| HoughLine Transform | 墙线检测 | OpenCV |
| SAM (Segment Anything) | 精确分割 | Meta |

### 效果图生成
| 模型 | 用途 | 来源 |
|------|------|------|
| Stable Diffusion XL | 基础生成模型 | Stability AI |
| ControlNet Canny | 保持户型轮廓 | lllyasviel |
| ControlNet Depth | 深度图控制 | lllyasviel |

---

## ☁️ 云服务配置

### 腾讯云
| 服务 | 用途 | 备注 |
|------|------|------|
| COS | 存储原图和生成图 | 需要配置 bucket |
| Lighthouse | GPU 云服务器 | 部署后端服务 |
| CDN | 加速图片访问 | 按量计费 |

### 模型部署
- **方案 A**：腾讯云 GPU Lighthouse（推荐，性价比高）
- **方案 B**：Replicate / Modal.com（按调用计费，省运维）

---

## 🚀 快速启动脚本

### 后端
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

---

## ⚠️ 风险点 & 注意事项

1. **SD 模型版权**：商业使用需注意 license，SDXL 相对宽松
2. **GPU 成本**：生成一张图约 5-10 秒，GPU 成本约 ¥0.1-0.3/张
3. **图片分辨率**：建议限制最大 2048x2048，避免爆显存
4. **并发控制**：加任务队列（Redis），避免 GPU 过载

---

## 📦 依赖清单

### backend/requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
httpx==0.26.0
tencentcloud-sdk-python==3.0.1009
torch==2.1.2
torchvision==0.16.2
diffusers==0.25.0
transformers==4.37.0
controlnet-aux==0.0.7
opencv-python==4.9.0.80
pillow==10.2.0
redis==5.0.1
pydantic==2.5.3
python-dotenv==1.0.0
```

### frontend/package.json
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "antd": "5.14.0",
    "@ant-design/icons": "5.2.6",
    "three": "0.161.0",
    "@react-three/fiber": "8.15.0",
    "axios": "1.6.7",
    "zustand": "4.5.0"
  }
}
```

---

## 🔮 后续扩展功能

1. **视频漫游**：用 AI 生成 3D 空间视频
2. **多角度渲染**：自动生成多视角效果图
3. **材质更换**：点击切换地板、墙面材质
4. **家具布置**：AI 自动推荐家具摆放
5. **施工图导出**：生成 CAD 施工图

---

*文档生成时间：2026-03-19*
