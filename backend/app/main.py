"""
户型图 → 3D 装修效果图后端服务
"""
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.detector import FloorPlanDetector
from app.services.generator import ImageGenerator

# 初始化 FastAPI 应用
app = FastAPI(
    title="户型图装修效果图生成API",
    description="AI赋能装修设计，一键生成装修效果图",
    version="1.0.0",
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化服务（懒加载）
_detector: Optional[FloorPlanDetector] = None
_generator: Optional[ImageGenerator] = None


def get_detector() -> FloorPlanDetector:
    global _detector
    if _detector is None:
        _detector = FloorPlanDetector()
    return _detector


def get_generator() -> ImageGenerator:
    global _generator
    if _generator is None:
        _generator = ImageGenerator()
    return _generator


# ==================== 数据模型 ====================

class RecognizeRequest(BaseModel):
    image_id: str


class GenerateRequest(BaseModel):
    image_id: str
    style: str  # modern | nordic | chinese
    room: str = "living"  # living | bedroom | kitchen | bathroom | study
    strength: float = 0.75


class TaskResponse(BaseModel):
    task_id: str
    status: str
    progress: int = 0
    images: list[str] = []


# ==================== API 路由 ====================

@app.get("/")
async def root():
    return {"message": "户型图装修效果图生成API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """上传户型图"""
    # 校验文件类型
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail={
                "code": 1002,
                "message": "不支持的图片格式，请上传 JPG 或 PNG"
            }
        )

    # 校验文件大小（10MB）
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail={
                "code": 1001,
                "message": "图片尺寸过大，请压缩到 10MB 以下"
            }
        )

    # 生成图片 ID
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    save_path = Path(settings.UPLOAD_DIR) / f"{image_id}.jpg"

    # 保存文件
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(contents)

    return {
        "code": 0,
        "message": "success",
        "data": {
            "image_id": image_id,
            "filename": file.filename,
            "url": str(save_path),
            "size": len(contents)
        }
    }


@app.post("/api/recognize")
async def recognize_floorplan(request: RecognizeRequest):
    """识别户型结构"""
    image_path = Path(settings.UPLOAD_DIR) / f"{request.image_id}.jpg"

    if not image_path.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "code": 2001,
                "message": "图片不存在，请先上传户型图"
            }
        )

    try:
        detector = get_detector()
        result = await detector.detect(str(image_path))

        return {
            "code": 0,
            "message": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": 2001,
                "message": f"户型识别失败: {str(e)}"
            }
        )


@app.post("/api/generate")
async def generate_image(request: GenerateRequest):
    """生成效果图"""
    image_path = Path(settings.UPLOAD_DIR) / f"{request.image_id}.jpg"

    if not image_path.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "code": 2002,
                "message": "图片不存在"
            }
        )

    # 校验风格
    valid_styles = ["modern", "nordic", "chinese"]
    if request.style not in valid_styles:
        raise HTTPException(
            status_code=400,
            detail={
                "code": 2002,
                "message": f"不支持的风格，可选: {valid_styles}"
            }
        )

    # 生成任务 ID
    task_id = f"task_{uuid.uuid4().hex[:12]}"

    try:
        generator = get_generator()
        await generator.generate(
            task_id=task_id,
            image_path=str(image_path),
            style=request.style,
            room=request.room,
            strength=request.strength
        )

        return {
            "code": 0,
            "message": "success",
            "data": {
                "task_id": task_id,
                "estimated_time": 10
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "code": 2002,
                "message": f"效果图生成失败: {str(e)}"
            }
        )


@app.get("/api/result/{task_id}")
async def get_result(task_id: str):
    """查询生成结果"""
    generator = get_generator()
    result = generator.get_result(task_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": 3002,
                "message": "任务不存在或已过期"
            }
        )

    return {
        "code": 0,
        "message": "success",
        "data": result
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
