# 户型图 → 3D 装修效果图

> AI 赋能装修设计，一键生成装修效果图

## 🎯 功能预览

- 📤 上传户型图（ JPG/PNG，最大 10MB）
- 🧠 AI 自动识别户型结构（墙、门、窗、房间分区）
- 🎨 支持 3 种装修风格：现代简约、北欧风格、现代中式
- 🖼️ 生成装修效果图，支持下载

## 🛠️ 技术栈

### 前端
- **Next.js 14** — React 全栈框架
- **Ant Design 5** — UI 组件库
- **Zustand** — 状态管理
- **Axios** — HTTP 请求

### 后端
- **FastAPI** — Python Web 框架
- **PyTorch** — 深度学习框架
- **Stable Diffusion XL** — 效果图生成
- **ControlNet** — 轮廓/深度控制
- **YOLOv8** — 户型结构识别

### 基础设施
- **腾讯云 Lighthouse** — GPU 云服务器
- **腾讯云 COS** — 对象存储

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- CUDA 11.8+ (GPU)

### 1. 克隆项目

```bash
git clone https://github.com/heyangyi888-hyy/house-type-decoration3D.git
cd house-type-decoration3D
```

### 2. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 4. 启动开发服务

**后端：**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**前端：**
```bash
cd frontend
npm run dev
```

访问 http://localhost:3000

## 📁 项目结构

```
house-type-decoration3D/
├── frontend/                 # Next.js 前端
│   ├── app/                 # App Router
│   ├── components/           # React 组件
│   ├── styles/              # 全局样式
│   └── package.json
│
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── api/             # API 路由
│   │   ├── services/        # 业务逻辑
│   │   └── core/            # 核心配置
│   ├── models/              # 模型权重
│   └── requirements.txt
│
└── docs/                    # 项目文档
    ├── MVP_SPEC.md
    ├── API.md
    └── PROJECT_PLAN.md
```

## 🌐 API 文档

启动后端服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📄 接口列表

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/upload` | 上传户型图 |
| POST | `/api/recognize` | 识别户型结构 |
| POST | `/api/generate` | 生成效果图 |
| GET | `/api/result/{task_id}` | 查询生成结果 |

详见 [docs/API.md](docs/API.md)

## 🎨 风格预设

| 风格 | 英文标识 | 描述 |
|------|----------|------|
| 现代简约 | modern | 简洁线条，中性色调 |
| 北欧风格 | nordic | 明亮清新，木质元素 |
| 现代中式 | chinese | 传统元素，现代演绎 |

## ⚠️ 注意事项

1. **GPU 显存**：建议 8GB 以上，否则可能出现 OOM
2. **模型下载**：首次启动会自动下载预训练模型（约 6GB）
3. **图片限制**：最大 10MB，建议 2048x2048 以内

## 📅 开发计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| M1 | 项目骨架 + 户型识别 Demo | ✅ |
| M2 | SD 生成流程跑通 | 🔨 |
| M3 | 前端页面完成 | 📋 |
| M4 | 联调 + 部署 | 📋 |
| M5 | 测试 + Bug 修复 | 📋 |

## 📝 许可证

MIT License

## 👤 作者

- GitHub: [@heyangyi888-hyy](https://github.com/heyangyi888-hyy)
