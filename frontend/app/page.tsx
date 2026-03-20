"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "antd";
import {
  UploadOutlined,
  HomeOutlined,
  ScanOutlined,
  PictureOutlined,
} from "@ant-design/icons";

export default function HomePage() {
  const router = useRouter();

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
        <Button
          type="primary"
          size="large"
          icon={<UploadOutlined />}
          onClick={() => router.push("/upload")}
          className="hero-btn"
        >
          开始制作
        </Button>
      </section>

      {/* 步骤说明 */}
      <section className="steps-section">
        <div className="steps-grid">
          <Card className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon"><UploadOutlined /></div>
            <h3>上传户型图</h3>
            <p>上传 JPG/PNG 格式的户型图，最大 10MB</p>
          </Card>
          <Card className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon"><ScanOutlined /></div>
            <h3>AI 识别结构</h3>
            <p>自动识别墙体、门窗、房间分区</p>
          </Card>
          <Card className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon"><PictureOutlined /></div>
            <h3>生成效果图</h3>
            <p>选择风格，快速生成 4 张装修效果图</p>
          </Card>
        </div>
      </section>

      {/* 功能介绍 */}
      <section className="features">
        <Card title="支持的装修风格" className="feature-card">
          <div className="style-list">
            <div className="style-item">
              <strong>现代简约</strong>
              <span>干净利落、开放布局、中性色调</span>
            </div>
            <div className="style-item">
              <strong>北欧风格</strong>
              <span>明亮通透、原木元素、温馨氛围</span>
            </div>
            <div className="style-item">
              <strong>现代中式</strong>
              <span>中式元素、雅致豪华、和谐色调</span>
            </div>
          </div>
        </Card>
      </section>

      <style jsx>{`
        .main {
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .hero {
          text-align: center;
          padding: 48px 0;
        }

        .hero-title {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .hero-subtitle {
          font-size: 20px;
          color: #666;
          margin-bottom: 8px;
        }

        .hero-desc {
          color: #999;
          margin-bottom: 32px;
        }

        .hero-btn {
          height: 48px;
          padding: 0 48px;
          font-size: 16px;
        }

        .steps-section {
          margin: 48px 0;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .step-card {
          text-align: center;
          position: relative;
        }

        .step-number {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 24px;
          background: #1890ff;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .step-icon {
          font-size: 36px;
          color: #1890ff;
          margin-bottom: 12px;
        }

        .step-card h3 {
          margin-bottom: 8px;
        }

        .step-card p {
          color: #888;
          font-size: 14px;
          margin: 0;
        }

        .feature-card {
          margin-top: 24px;
        }

        .style-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .style-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .style-item strong {
          color: #333;
        }

        .style-item span {
          color: #888;
        }

        @media (max-width: 768px) {
          .steps-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
