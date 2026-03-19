"""
核心配置
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    # 环境
    DEBUG: bool = True
    ENV: str = "development"

    # 上传目录
    UPLOAD_DIR: Path = Path(__file__).parent.parent.parent / "uploads"
    RESULT_DIR: Path = Path(__file__).parent.parent.parent / "results"

    # 模型路径
    MODEL_DIR: Path = Path(__file__).parent.parent.parent / "models"

    # 腾讯云 COS
    COS_SECRET_ID: str = os.getenv("COS_SECRET_ID", "")
    COS_SECRET_KEY: str = os.getenv("COS_SECRET_KEY", "")
    COS_BUCKET: str = os.getenv("COS_BUCKET", "")
    COS_REGION: str = os.getenv("COS_REGION", "ap-guangzhou")

    # GPU 配置
    USE_GPU: bool = True
    GPU_DEVICE: int = 0

    # 生成配置
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    DEFAULT_STYLE: str = "modern"
    GENERATION_STYLES: list = ["modern", "nordic", "chinese"]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# 确保目录存在
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.RESULT_DIR.mkdir(parents=True, exist_ok=True)
settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
