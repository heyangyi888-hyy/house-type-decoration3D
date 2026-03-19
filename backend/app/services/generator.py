"""
效果图生成服务
使用 Stable Diffusion XL + ControlNet 生成装修效果图
"""
import asyncio
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
import torch
from PIL import Image

from app.core.config import settings


class GenerationTask:
    """生成任务状态"""

    def __init__(self, task_id: str, status: str = "pending", progress: int = 0):
        self.task_id = task_id
        self.status = status
        self.progress = progress
        self.images: List[str] = []
        self.error: Optional[str] = None


class ImageGenerator:
    """
    效果图生成服务
    使用 Stable Diffusion XL + ControlNet 生成装修效果图

    支持的模型组合:
    - SDXL + ControlNet Canny (轮廓控制)
    - SDXL + ControlNet Depth (深度图控制)
    """

    def __init__(self):
        # 任务存储（生产环境用 Redis）
        self._tasks: Dict[str, GenerationTask] = {}
        self._sd_pipeline = None
        self._controlnet_canny = None
        self._controlnet_depth = None
        self._device = "cuda" if settings.USE_GPU and torch.cuda.is_available() else "cpu"

    def _load_models(self):
        """加载 SD + ControlNet 模型"""
        if self._sd_pipeline is not None:
            return

        try:
            from diffusers import (
                StableDiffusionXLControlNetPipeline,
                ControlNetModel,
                AutoencoderKL,
                DEISMultistepScheduler
            )
            from huggingface_hub import hf_hub_download

            print(f"[Generator] Loading models on {self._device}...")

            # 1. 加载 ControlNet (Canny)
            print("[Generator] Loading ControlNet Canny...")
            self._controlnet_canny = ControlNetModel.from_pretrained(
                "diffusers/controlnet-canny-sdxl-1.0",
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
                use_safetensors=True,
            )

            # 2. 加载 VAE
            print("[Generator] Loading VAE...")
            vae = AutoencoderKL.from_pretrained(
                "madebyollin/sdxl-vae-fp16-fix",
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
            )

            # 3. 加载 SDXL
            print("[Generator] Loading Stable Diffusion XL...")
            self._sd_pipeline = StableDiffusionXLControlNetPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                controlnet=self._controlnet_canny,
                vae=vae,
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
                variant="fp16" if self._device == "cuda" else None,
            )

            # 使用更快的调度器
            self._sd_pipeline.scheduler = DEISMultistepScheduler.from_config(
                self._sd_pipeline.scheduler.config
            )

            # 移动到 GPU（如果有）
            if self._device == "cuda":
                self._sd_pipeline.to("cuda")
                # 启用内存优化
                self._sd_pipeline.enable_attention_slicing()

            print("[Generator] All models loaded successfully!")

        except Exception as e:
            print(f"[Generator] Failed to load models: {e}")
            print("[Generator] Falling back to CPU mode...")
            self._device = "cpu"
            self._load_models_cpu()

    def _load_models_cpu(self):
        """CPU 模式降级加载"""
        try:
            from diffusers import StableDiffusionPipeline

            print("[Generator] Loading SD (CPU mode, lightweight)...")
            self._sd_pipeline = StableDiffusionPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5",
                torch_dtype=torch.float32,
            )
            self._sd_pipeline.to("cpu")
            self._sd_pipeline.enable_attention_slicing()
            print("[Generator] CPU model loaded!")

        except Exception as e:
            print(f"[Generator] CPU model load failed: {e}")
            self._sd_pipeline = None

    async def generate(
        self,
        task_id: str,
        image_path: str,
        style: str,
        room: str = "living",
        strength: float = 0.75
    ) -> GenerationTask:
        """
        生成效果图

        Args:
            task_id: 任务ID
            image_path: 原始户型图路径
            style: 装修风格 (modern/nordic/chinese)
            room: 房间类型 (living/bedroom/kitchen/bathroom/study)
            strength: 生成强度 (0-1)
        """
        task = GenerationTask(task_id, status="processing", progress=0)
        self._tasks[task_id] = task

        # 启动异步生成
        asyncio.create_task(self._generate_task(
            task, image_path, style, room, strength
        ))

        return task

    async def _generate_task(
        self,
        task: GenerationTask,
        image_path: str,
        style: str,
        room: str,
        strength: float
    ):
        """异步执行生成任务"""
        try:
            task.progress = 10

            # 懒加载模型
            if self._sd_pipeline is None:
                self._load_models()

            task.progress = 30

            # 读取原图
            input_image = Image.open(image_path).convert("RGB")
            # 缩放到合适尺寸
            input_image = input_image.resize((512, 512), Image.Resampling.LANCZOS)

            task.progress = 50

            # 构建 prompt
            prompt, negative_prompt = self._build_prompts(style, room)

            # 生成参数
            generator = torch.Generator(
                device=self._device
            ).manual_seed(42)

            # 生成多张效果图
            num_images = 4
            result_dir = Path(settings.RESULT_DIR) / task.task_id
            result_dir.mkdir(parents=True, exist_ok=True)

            task.progress = 60

            # 生成图片
            if self._controlnet_canny is not None and hasattr(self._sd_pipeline, 'controlnet'):
                # 使用 ControlNet 生成
                outputs = self._sd_pipeline(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    image=input_image,
                    num_inference_steps=30,
                    guidance_scale=7.5,
                    controlnet_conditioning_scale=strength,
                    generator=generator,
                    num_images_per_prompt=num_images,
                )
            else:
                # 降级：无 ControlNet 生成
                outputs = self._sd_pipeline(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    num_inference_steps=25,
                    guidance_scale=7.0,
                    generator=generator,
                    num_images_per_prompt=num_images,
                )

            task.progress = 80

            # 保存结果
            for i, output in enumerate(outputs.images):
                output_path = result_dir / f"result_{i}.jpg"
                output.save(output_path, "JPEG", quality=95)
                task.images.append(str(output_path))

            task.progress = 100
            task.status = "done"

        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            import traceback
            traceback.print_exc()

    def _build_prompts(self, style: str, room: str) -> tuple:
        """
        构建生图 prompt

        Returns:
            (positive_prompt, negative_prompt)
        """
        # 风格描述
        style_prompts = {
            "modern": (
                "modern minimalist interior design, clean lines, open floor plan, "
                "neutral color palette, large windows, natural light, "
                "contemporary furniture, professional photography, 8k, realistic"
            ),
            "nordic": (
                "Nordic style interior, Scandinavian design, bright and airy, "
                "natural wood elements, white walls, cozy atmosphere, "
                "minimalist furniture, professional photography, 8k, realistic"
            ),
            "chinese": (
                "modern Chinese interior design, Chinese traditional elements, "
                "elegant and luxurious, dark wood furniture, Chinese paintings, "
                "harmonious color scheme, professional photography, 8k, realistic"
            ),
        }

        # 房间描述
        room_prompts = {
            "living": "spacious living room with comfortable sofa",
            "bedroom": "cozy master bedroom with elegant bed",
            "kitchen": "modern fully equipped kitchen with island",
            "bathroom": "luxury bathroom with bathtub and marble",
            "study": "elegant home study with bookshelf",
        }

        # 默认负向 prompt
        negative_prompt = (
            "ugly, blurry, low quality, distorted, deformed, "
            "bad architecture, unrealistic, amateur, watermark, text"
        )

        style_desc = style_prompts.get(style, style_prompts["modern"])
        room_desc = room_prompts.get(room, room_prompts["living"])

        positive_prompt = f"{room_desc}, {style_desc}"

        return positive_prompt, negative_prompt

    def get_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务结果"""
        task = self._tasks.get(task_id)
        if task is None:
            return None

        return {
            "task_id": task.task_id,
            "status": task.status,
            "progress": task.progress,
            "images": task.images,
            "error": task.error
        }


# 导出
__all__ = ["ImageGenerator"]
