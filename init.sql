-- 视频前测诊断系统数据库初始化脚本
-- 根据 TypeORM Entity 定义生成（与代码完全匹配）

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建枚举类型
CREATE TYPE material_status AS ENUM ('ACTIVE', 'DELETED');

-- 1. 素材表 (materials)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id VARCHAR(50) NOT NULL,
    video_id VARCHAR(50) NOT NULL UNIQUE,
    video_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    duration INTEGER,
    metadata JSONB,
    status material_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 素材表索引
CREATE INDEX IF NOT EXISTS idx_materials_advertiser_id ON materials(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_materials_video_id ON materials(video_id);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);

-- 2. 诊断配置表 (diagnosis_configs)
CREATE TABLE IF NOT EXISTS diagnosis_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 诊断任务表 (diagnosis_tasks)
CREATE TABLE IF NOT EXISTS diagnosis_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id VARCHAR(50) NOT NULL,
    video_id VARCHAR(50) NOT NULL,
    config_id UUID,
    ocean_task_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    result JSONB,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_diagnosis_tasks_config FOREIGN KEY (config_id) REFERENCES diagnosis_configs(id) ON DELETE SET NULL
);

-- 诊断任务表索引
CREATE INDEX IF NOT EXISTS idx_diagnosis_tasks_advertiser_id ON diagnosis_tasks(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_tasks_video_id ON diagnosis_tasks(video_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_tasks_ocean_task_id ON diagnosis_tasks(ocean_task_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_tasks_status ON diagnosis_tasks(status);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diagnosis_configs_updated_at ON diagnosis_configs;
CREATE TRIGGER update_diagnosis_configs_updated_at
    BEFORE UPDATE ON diagnosis_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diagnosis_tasks_updated_at ON diagnosis_tasks;
CREATE TRIGGER update_diagnosis_tasks_updated_at
    BEFORE UPDATE ON diagnosis_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认诊断配置
INSERT INTO diagnosis_configs (name, description, config, is_active)
VALUES
    ('默认配置', '系统默认诊断配置', '{"dimensions": ["content", "creativity", "targeting"]}', true)
ON CONFLICT DO NOTHING;

-- 完成
COMMENT ON TABLE materials IS '视频素材表';
COMMENT ON TABLE diagnosis_configs IS '诊断配置模板表';
COMMENT ON TABLE diagnosis_tasks IS '诊断任务表';

-- 4. 用户表 (users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS '用户表';

-- 5. 广告主账号表 (advertiser_accounts)
CREATE TABLE IF NOT EXISTS advertiser_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id BIGINT NOT NULL,
  advertiser_id BIGINT NOT NULL,
  name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, advertiser_id)
);

DROP TRIGGER IF EXISTS update_advertiser_accounts_updated_at ON advertiser_accounts;
CREATE TRIGGER update_advertiser_accounts_updated_at
    BEFORE UPDATE ON advertiser_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE advertiser_accounts IS '广告主账号表';
