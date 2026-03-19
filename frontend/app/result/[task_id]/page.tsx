"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Spin, Progress, Image, Row, Col, message } from "antd";
import { DownloadOutlined, HomeOutlined, ReloadOutlined } from "@ant-design/icons";

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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!taskId) return;

    const pollResult = async () => {
      try {
        const response = await fetch(`/api/result/${taskId}`);
        const data = await response.json();

        if (data.code === 0) {
          setResult(data.data);
          setLoading(false);

          if (data.data.status === "done" || data.data.status === "failed") {
            return; // 停止轮询
          }
        }
      } catch (error) {
        console.error("获取结果失败:", error);
      }

      // 继续轮询
      if (result?.status !== "done" && result?.status !== "failed") {
        setTimeout(pollResult, 2000);
      }
    };

    pollResult();
  }, [taskId]);

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `decoration_${index + 1}.jpg`;
    link.click();
  };

  const handleDownloadAll = () => {
    if (!result?.images) return;

    result.images.forEach((url, index) => {
      setTimeout(() => {
        handleDownload(url, index);
      }, index * 500); // 间隔下载，避免浏览器拦截
    });
  };

  if (loading) {
    return (
      <div className="result-loading">
        <Spin size="large" />
        <p>加载中...</p>
      </div>
    );
  }

  if (result?.status === "failed") {
    return (
      <div className="result-error">
        <Card>
          <p>生成失败: {result.error}</p>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => router.push("/")}
          >
            重新生成
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <main className="result-main">
      <header className="result-header">
        <Button
          type="text"
          icon={<HomeOutlined />}
          onClick={() => router.push("/")}
        >
          返回首页
        </Button>
        <h1>效果图生成结果</h1>
      </header>

      {result?.status === "processing" && (
        <Card className="progress-card">
          <p>正在生成效果图...</p>
          <Progress percent={result.progress} status="active" />
          <p className="progress-hint">预计剩余 {Math.ceil((100 - result.progress) * 0.2)} 秒</p>
        </Card>
      )}

      {result?.status === "done" && (
        <>
          <section className="gallery-section">
            <Row gutter={[16, 16]}>
              {result.images.map((imageUrl, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <Card
                    hoverable
                    className="image-card"
                    cover={
                      <Image
                        src={imageUrl}
                        alt={`效果图 ${index + 1}`}
                        placeholder={<Spin />}
                        fallback="/placeholder.jpg"
                      />
                    }
                    actions={[
                      <Button
                        key="download"
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(imageUrl, index)}
                      >
                        下载
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      title={`效果图 ${index + 1}`}
                      description="点击图片可放大预览"
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
            >
              下载全部
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => router.push("/")}
            >
              生成新图
            </Button>
          </section>
        </>
      )}
    </main>
  );
}
