"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Upload,
  message,
  Card,
  Steps,
  Spin,
  Radio,
  Modal,
} from "antd";
import {
  UploadOutlined,
  HomeOutlined,
  ScanOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Dragger } = Upload;

type Step = 0 | 1 | 2 | 3; // 0:上传 1:识别中 2:确认结果 3:生成中

interface RecognizeResult {
  walls: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness: number;
  }>;
  doors: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  windows: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  rooms: Array<{
    id: number;
    type: string;
    name: string;
    area: number;
  }>;
}

export default function UploadPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [step, setStep] = useState<Step>(0);
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const [recognizeResult, setRecognizeResult] = useState<RecognizeResult | null>(null);
  const [style, setStyle] = useState<string>("modern");
  const [previewVisible, setPreviewVisible] = useState(false);

  // 上传props
  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: "image/jpeg,image/png",
    beforeUpload: async (file) => {
      // 检查文件大小
      if (file.size > 10 * 1024 * 1024) {
        message.error("图片尺寸过大，请压缩到 10MB 以下");
        return false;
      }

      setFile(file);
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();

        if (result.code === 0) {
          setImageId(result.data.image_id);
          // 创建本地预览URL
          const url = URL.createObjectURL(file);
          setImageUrl(url);
          setStep(1);
          message.success("上传成功！正在识别户型结构...");
          // 自动开始识别
          await handleRecognize(result.data.image_id);
        } else {
          message.error(result.message || "上传失败");
          setFile(null);
        }
      } catch {
        message.error("上传失败，请重试");
        setFile(null);
      } finally {
        setUploading(false);
      }

      return false;
    },
    onRemove: () => {
      setFile(null);
      setImageId("");
      setImageUrl("");
      setStep(0);
      setRecognizeResult(null);
    },
  };

  // 识别户型
  const handleRecognize = async (imgId: string) => {
    setRecognizing(true);
    try {
      const response = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imgId }),
      });
      const result = await response.json();

      if (result.code === 0) {
        setRecognizeResult(result.data);
        setStep(2);
        message.success("户型识别完成！");
      } else {
        message.error(result.message || "识别失败，请上传清晰的户型图");
      }
    } catch {
      message.error("识别失败，请重试");
    } finally {
      setRecognizing(false);
    }
  };

  // 绘制识别结果
  useEffect(() => {
    if (!canvasRef.current || !imageUrl || !recognizeResult) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 设置canvas尺寸与图片相同
      canvas.width = img.width;
      canvas.height = img.height;

      // 绘制原图
      ctx.drawImage(img, 0, 0);

      // 绘制墙体（红色线条）
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (const wall of recognizeResult.walls) {
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
      }

      // 绘制门（绿色矩形）
      ctx.fillStyle = "rgba(46, 204, 113, 0.6)";
      for (const door of recognizeResult.doors) {
        ctx.fillRect(
          door.x - door.width / 2,
          door.y - door.height / 2,
          door.width,
          door.height
        );
      }

      // 绘制窗（蓝色矩形）
      ctx.fillStyle = "rgba(52, 152, 219, 0.6)";
      for (const win of recognizeResult.windows) {
        ctx.fillRect(
          win.x - win.width / 2,
          win.y - win.height / 2,
          win.width,
          win.height
        );
      }
    };
    img.src = imageUrl;
  }, [imageUrl, recognizeResult]);

  // 生成效果图
  const handleGenerate = async () => {
    if (!imageId) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_id: imageId,
          style,
          room: "living",
          strength: 0.75,
        }),
      });
      const result = await response.json();

      if (result.code === 0) {
        setTaskId(result.data.task_id);
        setStep(3);
        message.success("开始生成效果图！");
        // 跳转到结果页
        router.push(`/result/${result.data.task_id}`);
      } else {
        message.error(result.message || "生成失败");
      }
    } catch {
      message.error("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const stepItems = [
    { title: "上传户型图", icon: <UploadOutlined /> },
    { title: "AI 识别中", icon: <ScanOutlined /> },
    { title: "确认户型", icon: <CheckCircleOutlined /> },
    { title: "生成效果", icon: <PictureOutlined /> },
  ];

  const styleOptions = [
    { value: "modern", label: "现代简约", desc: "干净利落、开放布局、中性色调" },
    { value: "nordic", label: "北欧风格", desc: "明亮通透、原木元素、温馨氛围" },
    { value: "chinese", label: "现代中式", desc: "中式元素、雅致豪华、 harmonious" },
  ];

  return (
    <main className="main">
      {/* 顶部导航 */}
      <div className="top-nav">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/")}
        >
          返回首页
        </Button>
      </div>

      {/* 步骤条 */}
      <section className="steps-section">
        <Steps
          current={step}
          size="small"
          items={stepItems.map((item, idx) => ({
            ...item,
            status: idx < step ? "finish" : idx === step ? "process" : "wait",
          }))}
        />
      </section>

      {/* 上传区域 */}
      {step === 0 && (
        <section className="upload-section">
          <Card className="upload-card">
            <Dragger {...uploadProps} className="upload-dragger" disabled={uploading}>
              <p className="ant-upload-drag-icon">
                {uploading ? <LoadingOutlined /> : <UploadOutlined />}
              </p>
              <p className="ant-upload-text">
                {uploading ? "上传中..." : "拖拽户型图到这里，或点击选择文件"}
              </p>
              <p className="ant-upload-hint">支持 JPG/PNG 格式，最大 10MB</p>
            </Dragger>

            {file && (
              <div className="file-info">
                <p>📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* 识别中状态 */}
      {step === 1 && (
        <section className="recognizing-section">
          <Card className="recognizing-card">
            <div className="recognizing-content">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
              <h3>AI 正在识别户型结构</h3>
              <p>预计需要 3-5 秒，请稍候...</p>
            </div>
          </Card>
        </section>
      )}

      {/* 识别结果确认 */}
      {step === 2 && recognizeResult && (
        <section className="result-section">
          <Card className="result-card">
            <h3>🏠 户型识别结果</h3>

            {/* 识别结果图 */}
            <div className="recognize-preview">
              <canvas
                ref={canvasRef}
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
              <div className="preview-legend">
                <span className="legend-item">
                  <span className="legend-color wall"></span> 墙体
                </span>
                <span className="legend-item">
                  <span className="legend-color door"></span> 门
                </span>
                <span className="legend-item">
                  <span className="legend-color window"></span> 窗
                </span>
              </div>
              <Button type="link" onClick={() => setPreviewVisible(true)}>
                点击查看大图
              </Button>
            </div>

            {/* 房间列表 */}
            <div className="rooms-info">
              <h4>识别到的房间：</h4>
              <div className="rooms-grid">
                {recognizeResult.rooms.map((room) => (
                  <div key={room.id} className="room-item">
                    <HomeOutlined /> {room.name} ({room.area}㎡)
                  </div>
                ))}
              </div>
            </div>

            {/* 风格选择 */}
            <div className="style-section">
              <h4>选择装修风格</h4>
              <Radio.Group
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="style-radio-group"
              >
                {styleOptions.map((opt) => (
                  <Card key={opt.value} className="style-card">
                    <Radio value={opt.value}>
                      <div className="style-card-content">
                        <strong>{opt.label}</strong>
                        <p>{opt.desc}</p>
                      </div>
                    </Radio>
                  </Card>
                ))}
              </Radio.Group>
            </div>

            {/* 操作按钮 */}
            <div className="action-buttons">
              <Button
                size="large"
                onClick={() => {
                  setStep(0);
                  setFile(null);
                  setImageId("");
                  setImageUrl("");
                  setRecognizeResult(null);
                }}
              >
                重新上传
              </Button>
              <Button
                type="primary"
                size="large"
                loading={generating}
                onClick={handleGenerate}
                className="generate-btn"
              >
                {generating ? "生成中..." : "开始生成效果图"}
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* 生成中状态 */}
      {step === 3 && (
        <section className="generating-section">
          <Card className="generating-card">
            <div className="generating-content">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
              <h3>正在生成效果图</h3>
              <p>预计需要 8-15 秒，请稍候...</p>
            </div>
          </Card>
        </section>
      )}

      {/* 大图预览弹窗 */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        centered
      >
        <img
          src={imageUrl}
          alt="户型图"
          style={{ width: "100%" }}
        />
      </Modal>

      <style jsx>{`
        .main {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .top-nav {
          margin-bottom: 16px;
        }

        .steps-section {
          margin-bottom: 32px;
        }

        .upload-section,
        .recognizing-section,
        .generating-section {
          margin-bottom: 24px;
        }

        .upload-card,
        .recognizing-card,
        .generating-card,
        .result-card {
          text-align: center;
        }

        .recognizing-content,
        .generating-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 48px 0;
        }

        .recognizing-content h3,
        .generating-content h3 {
          margin: 0;
        }

        .recognizing-content p,
        .generating-content p {
          color: #888;
          margin: 0;
        }

        .file-info {
          margin-top: 16px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .result-section h3 {
          margin-bottom: 24px;
        }

        .recognize-preview {
          margin-bottom: 24px;
        }

        .recognize-preview canvas {
          display: block;
          margin: 0 auto;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }

        .preview-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 12px;
          font-size: 14px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-color {
          display: inline-block;
          width: 16px;
          height: 4px;
          border-radius: 2px;
        }

        .legend-color.wall {
          background: #e74c3c;
        }

        .legend-color.door {
          background: #2ecc71;
        }

        .legend-color.window {
          background: #3498db;
        }

        .rooms-info {
          margin-bottom: 24px;
          text-align: left;
        }

        .rooms-info h4 {
          margin-bottom: 12px;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .room-item {
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 6px;
          font-size: 14px;
        }

        .style-section {
          margin-bottom: 24px;
          text-align: left;
        }

        .style-section h4 {
          margin-bottom: 12px;
        }

        .style-radio-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .style-card {
          text-align: left;
        }

        .style-card-content {
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
        }

        .style-card-content strong {
          display: block;
        }

        .style-card-content p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #888;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .generate-btn {
          min-width: 160px;
        }
      `}</style>
    </main>
  );
}
