"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  Spin,
  Progress,
  Row,
  Col,
  Modal,
  message,
} from "antd";
import {
  DownloadOutlined,
  HomeOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

interface TaskResult {
  task_id: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  images: string[];
  error?: string;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.task_id as string;

  const [result, setResult] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const fetchResult = useCallback(async () => {
    try {
      const response = await fetch(`/api/result/${taskId}`);
      const data = await response.json();

      if (data.code === 0) {
        setResult(data.data);
        setLoading(false);

        // 如果完成了或失败了，停止轮询
        if (data.data.status === "done" || data.data.status === "failed") {
          return false;
        }
        return true; // 继续轮询
      } else {
        message.error(data.message || "获取结果失败");
        return false;
      }
    } catch {
      return true; // 网络错误，继续尝试
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    let polling = true;

    const poll = async () => {
      while (polling) {
        const shouldContinue = await fetchResult();
        if (!shouldContinue) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };

    poll();

    return () => {
      polling = false;
    };
  }, [taskId, fetchResult]);

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("下载失败");
    }
  };

  const handleDownloadAll = async () => {
    if (!result?.images?.length) return;

    for (let i = 0; i < result.images.length; i++) {
      await handleDownload(result.images[i], `decoration_${i + 1}.jpg`);
      if (i < result.images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>正在加载...</p>
      </div>
    );
  }

  return (
    <main className="result-main">
      {/* 顶部导航 */}
      <div className="top-nav">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push("/upload")}>
          返回上传
        </Button>
        <Button type="text" icon={<HomeOutlined />} onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>

      {/* 生成中状态 */}
      {result?.status === "processing" && (
        <Card className="progress-card">
          <div className="progress-content">
            <Spin />
            <div className="progress-text">
              <h3>正在生成效果图...</h3>
              <Progress percent={result.progress} status="active" />
              <p className="progress-hint">
                预计剩余 {Math.max(1, Math.ceil((100 - result.progress) * 0.2))} 秒
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 生成失败 */}
      {result?.status === "failed" && (
        <Card className="error-card">
          <div className="error-content">
            <h3>❌ 生成失败</h3>
            <p>{result.error || "请稍后重试"}</p>
            <div className="error-actions">
              <Button type="primary" onClick={() => router.push("/upload")}>
                重新生成
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 生成完成 */}
      {result?.status === "done" && (
        <>
          <header className="result-header">
            <h1>✨ 效果图已生成</h1>
            <p>点击图片可查看大图</p>
          </header>

          <section className="gallery-section">
            <Row gutter={[16, 16]}>
              {result.images.map((imageUrl, index) => (
                <Col xs={24} sm={12} md={12} lg={6} key={index}>
                  <Card
                    hoverable
                    className="image-card"
                    cover={
                      <div
                        className="image-wrapper"
                        onClick={() => setPreviewIndex(index)}
                      >
                        <img
                          src={imageUrl}
                          alt={`效果图 ${index + 1}`}
                          loading="lazy"
                        />
                        <div className="image-overlay">点击查看大图</div>
                      </div>
                    }
                    actions={[
                      <Button
                        key="download"
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(imageUrl, `decoration_${index + 1}.jpg`)}
                      >
                        下载
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      title={`效果图 ${index + 1}`}
                      description="高清原图"
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          <section className="download-section">
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleDownloadAll}
              className="download-all-btn"
            >
              下载全部（{result.images.length} 张）
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => router.push("/upload")}
            >
              生成新图
            </Button>
          </section>
        </>
      )}

      {/* 大图预览弹窗 */}
      <Modal
        open={previewIndex !== null}
        footer={null}
        onCancel={() => setPreviewIndex(null)}
        width="90%"
        centered
        title={`效果图 ${(previewIndex ?? 0) + 1}`}
        afterOpenChange={(visible) => {
          if (!visible) setPreviewIndex(null);
        }}
      >
        {previewIndex !== null && result?.images[previewIndex] && (
          <img
            src={result.images[previewIndex]}
            alt={`效果图 ${previewIndex + 1}`}
            style={{ width: "100%" }}
          />
        )}
      </Modal>

      <style jsx>{`
        .result-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          min-height: 100vh;
        }

        .top-nav {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
        }

        .progress-card {
          max-width: 500px;
          margin: 48px auto;
        }

        .progress-content {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 24px 0;
        }

        .progress-text {
          flex: 1;
        }

        .progress-text h3 {
          margin: 0 0 16px;
        }

        .progress-hint {
          color: #888;
          font-size: 12px;
          margin: 8px 0 0;
        }

        .error-card {
          max-width: 500px;
          margin: 48px auto;
        }

        .error-content {
          text-align: center;
          padding: 24px 0;
        }

        .error-content h3 {
          margin-bottom: 16px;
        }

        .error-content p {
          color: #888;
          margin-bottom: 24px;
        }

        .error-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .result-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .result-header h1 {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .result-header p {
          color: #888;
          margin: 0;
        }

        .gallery-section {
          margin-bottom: 32px;
        }

        .image-card {
          overflow: hidden;
        }

        .image-wrapper {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          cursor: pointer;
        }

        .image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .image-wrapper:hover img {
          transform: scale(1.05);
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-wrapper:hover .image-overlay {
          opacity: 1;
        }

        .download-section {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 32px;
        }

        .download-all-btn {
          min-width: 180px;
        }

        @media (max-width: 768px) {
          .download-section {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
