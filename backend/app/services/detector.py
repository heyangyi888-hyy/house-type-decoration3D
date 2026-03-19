"""
户型图识别服务
使用 YOLOv8 + OpenCV 识别户型结构
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, List
from ultralytics import YOLO
import torch

from app.core.config import settings


class FloorPlanDetector:
    """
    户型图识别服务
    - YOLOv8: 检测门窗、房间类型
    - OpenCV: 墙线检测（霍夫变换）
    """

    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model = None
        self.model_path = model_path
        self.device = "cuda" if settings.USE_GPU and torch.cuda.is_available() else "cpu"
        self._load_model()

    def _load_model(self):
        """加载 YOLOv8 模型"""
        try:
            # 尝试加载本地模型
            if Path(self.model_path).exists():
                self.model = YOLO(self.model_path)
            else:
                # 使用 YOLOv8n（最小最快）进行目标检测
                # 可替换为专门的户型图检测模型
                self.model = YOLO("yolov8n.pt")
            self.model.to(self.device)
            print(f"[Detector] Model loaded on {self.device}")
        except Exception as e:
            print(f"[Detector] Failed to load model: {e}")
            self.model = None

    async def detect(self, image_path: str) -> Dict[str, Any]:
        """
        识别户型结构

        Args:
            image_path: 图片路径

        Returns:
            识别结果，包含 walls, doors, windows, rooms
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"无法读取图片: {image_path}")

        # 统一尺寸（最大边限制为 1024）
        img = self._resize_image(img, max_size=1024)

        # 墙线检测
        walls = self._detect_walls(img)

        # 门窗检测（YOLOv8）
        doors, windows = self._detect_doors_windows_yolo(img)

        # 估算房间分区
        rooms = self._estimate_rooms(walls, img.shape)

        return {
            "walls": walls,
            "doors": doors,
            "windows": windows,
            "rooms": rooms,
            "total_area": sum(r.get("area", 0) for r in rooms)
        }

    def _resize_image(self, img: np.ndarray, max_size: int = 1024) -> np.ndarray:
        """等比缩放图片"""
        h, w = img.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        return img

    def _detect_walls(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """
        检测墙体（基于边缘检测 + 霍夫变换）
        """
        # 转换为灰度图
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 高斯模糊降噪
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Canny 边缘检测
        edges = cv2.Canny(blurred, 30, 100)

        # 霍夫变换检测直线
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=50,
            minLineLength=30,
            maxLineGap=5
        )

        walls = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                # 计算线段长度
                length = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                if length > 20:  # 过滤短线条
                    walls.append({
                        "x1": int(x1),
                        "y1": int(y1),
                        "x2": int(x2),
                        "y2": int(y2),
                        "thickness": 8,
                        "length": float(length)
                    })

        return walls

    def _detect_doors_windows_yolo(self, img: np.ndarray) -> tuple:
        """
        使用 YOLOv8 检测门窗
        如果没有专门模型，返回空列表
        """
        doors = []
        windows = []

        if self.model is None:
            return doors, windows

        try:
            # YOLOv8 目标检测
            results = self.model(img, verbose=False)

            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # 获取类别
                        cls_id = int(box.cls[0])
                        cls_name = self.model.names[cls_id]

                        # 获取边界框
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        w = float(x2 - x1)
                        h = float(y2 - y1)
                        cx = float(x1 + w / 2)
                        cy = float(y1 + h / 2)

                        obj = {
                            "x": float(cx),
                            "y": float(cy),
                            "width": w,
                            "height": h,
                            "class": cls_name
                        }

                        # 根据类别分类（需要根据实际模型调整）
                        if "door" in cls_name.lower():
                            doors.append(obj)
                        elif "window" in cls_name.lower():
                            windows.append(obj)
        except Exception as e:
            print(f"[Detector] YOLO detection error: {e}")

        return doors, windows

    def _detect_doors_windows_cv(self, gray: np.ndarray) -> tuple:
        """
        使用 OpenCV 传统方法检测门窗（备选）
        """
        doors = []
        windows = []

        # 阈值分割
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

        # 轮廓检测
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 100 or area > 10000:
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = w / float(h) if h > 0 else 0

            # 根据形状判断是门还是窗
            if 0.2 < aspect_ratio < 0.5 and w < 100:
                doors.append({"x": x + w / 2, "y": y + h / 2, "width": w, "height": h})
            elif 0.5 < aspect_ratio < 2 and w < 150:
                windows.append({"x": x + w / 2, "y": y + h / 2, "width": w, "height": h})

        return doors, windows

    def _estimate_rooms(self, walls: List[Dict], shape: tuple) -> List[Dict[str, Any]]:
        """
        根据墙体估算房间分区
        使用简单的网格划分法
        """
        h, w = shape[:2]

        # 简单实现：假设户型图是矩形分区
        # 实际应用中需要更复杂的算法（如平面图分割）
        rooms = []

        # 估算总面积
        total_area = (w * h) / 100  # 假设每像素 = 1cm，转换为平方米

        # 简单分区：客厅、卧室、厨房、卫生间
        room_types = [
            {"type": "living", "name": "客厅", "ratio": 0.35},
            {"type": "bedroom", "name": "主卧", "ratio": 0.25},
            {"type": "bedroom", "name": "次卧", "ratio": 0.2},
            {"type": "kitchen", "name": "厨房", "ratio": 0.1},
            {"type": "bathroom", "name": "卫生间", "ratio": 0.1},
        ]

        x_offset = 0
        for i, room_info in enumerate(room_types):
            room_w = int(w * room_info["ratio"])
            room_area = total_area * room_info["ratio"]

            rooms.append({
                "id": i + 1,
                "type": room_info["type"],
                "name": room_info["name"],
                "area": round(room_area, 2),
                "bounds": {
                    "x": x_offset,
                    "y": 0,
                    "width": room_w,
                    "height": h
                }
            })
            x_offset += room_w

        return rooms


# 导出
__all__ = ["FloorPlanDetector"]
