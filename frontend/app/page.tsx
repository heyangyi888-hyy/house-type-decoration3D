"use client";

import { useState } from "react";
import { Button, Upload, message, Card, Steps, Result } from "antd";
import { UploadOutlined, HomeOutlined, ScanOutlined, PictureOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Dragger } = Upload;

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [taskId, setTaskId] = useState<string>("");

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: "image/jpeg,image/png",
    maxSize: 10 * 1024 * 1024, // 10MB
    beforeUpload: async (file) => {
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
          setStep(1);
          message.success("上传成功！");
        } else {
          message.error(result.message || "上传失败");
        }
      } catch (error) {
        message.error("上传失败，请重试");
      } finally {
        setUploading(false);
      }

      return false; // 阻止默认上传
    },
    onRemove: () => {
      setFile(null);
      setImageId("");
      setStep(0);
    },
  };

  const handleGenerate = async () => {
    if (!imageId) return;

    setGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_id: imageId,
          style: "modern",
          room: "living",
          strength: 0.75,
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        setTaskId(result.data.task_id);
        setStep(2);
        message.success("开始生成效果图！");
        // 跳转到结果页
        window.location.href = `/result/${result.data.task_id}`;
      } else {
        message.error(result.message || "生成失败");
      }
    } catch (error) {
      message.error("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="main">
      {/* Hero 区域 */}
      <section className="hero">
        <h1 className="hero-title">
          <HomeOutlined /> AI 装修效果图生成
        </h1>
        <p className="hero-subtitle">
          上传户型图，AI 10秒生成装修效果图
        </p>
        <p className="hero-desc">
          支持现代简约、北欧、现代中式等多种装修风格
        </p>
      </section>

      {/* 步骤说明 */}
      <section className="steps-section">
        <Steps
          current={step}
          items={[
            { title: "上传户型图", icon: <UploadOutlined /> },
            { title: "AI 识别结构", icon: <ScanOutlined /> },
            { title: "生成效果图", icon: <PictureOutlined /> },
          ]}
        />
      </section>

      {/* 上传区域 */}
      <section className="upload-section">
        <Card className="upload-card">
          <Dragger {...uploadProps} className="upload-dragger">
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">拖拽户型图到这里，或点击选择文件</p>
            <p className="ant-upload-hint">
              支持 JPG/PNG 格式，最大 10MB
            </p>
          </Dragger>

          {file && (
            <div className="file-info">
              <p>📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
            </div>
          )}

          <div className="style-section">
            <h3>选择装修风格</h3>
            <div className="style-options">
              <label className="style-option selected">
                <input type="radio" name="style" value="modern" defaultChecked />
                <span>现代简约</span>
              </label>
              <label className="style-option">
                <input type="radio" name="style" value="nordic" />
                <span>北欧风格</span>
              </label>
              <label className="style-option">
                <input type="radio" name="style" value="chinese" />
                <span>现代中式</span>
              </label>
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            block
            disabled={!file || uploading}
            loading={generating}
            onClick={handleGenerate}
            className="generate-btn"
          >
            {generating ? "生成中..." : "开始生成"}
          </Button>
        </Card>
      </section>

      {/* 功能介绍 */}
      <section className="features">
        <Card title="如何使用" className="feature-card">
          <ol>
            <li>上传清晰的户型图（JPG/PNG 格式）</li>
            <li>AI 自动识别墙体、门窗、房间分区</li>
            <li>选择喜欢的装修风格</li>
            <li>等待 8-15 秒，获取 4 张效果图</li>
            <li>下载你喜欢的结果</li>
          </ol>
        </Card>
      </section>
    </main>
  );
}
