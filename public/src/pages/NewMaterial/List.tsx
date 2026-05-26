import React, { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  InputNumber,
  Popover,
  Select,
  Space,
  Table,
  Tooltip,
} from 'antd';
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import diagnosisStore from '../../stores/diagnosisStore';
import ResultTag from '../../components/ResultTag';
import type { DiagnosisTask } from '../../types/diagnosis';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../utils/constants';

const { RangePicker } = DatePicker;

// 任务状态 Badge 配置
const STATUS_CONFIG: Record<
  string,
  { status: 'processing' | 'success' | 'error' | 'default'; label: string }
> = {
  PENDING: { status: 'processing', label: '检测中' },
  RUNNING: { status: 'processing', label: '检测中' },
  SUCCESS: { status: 'success', label: '已完成' },
  COMPLETED: { status: 'success', label: '已完成' },
  FAILED: { status: 'error', label: '失败' },
  TIMEOUT: { status: 'default', label: '超时' },
};

interface NewMaterialListProps {
  /** 传入 'ARK' 时复用为已有素材检测列表 */
  source?: 'NEW' | 'ARK';
}

const NewMaterialList: React.FC<NewMaterialListProps> = observer(
  ({ source = 'NEW' }) => {
    const navigate = useNavigate();
    const [searchStatus, setSearchStatus] = useState<string | undefined>();
    const [searchAdvertiserId, setSearchAdvertiserId] = useState<
      number | undefined
    >();
    const [dateRange, setDateRange] = useState<[string, string] | undefined>();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadTasks = () => {
      diagnosisStore.fetchTasks({
        page,
        pageSize,
        source,
        status: searchStatus,
        advertiserId: searchAdvertiserId,
        startDate: dateRange?.[0],
        endDate: dateRange?.[1],
      });
    };

    useEffect(() => {
      loadTasks();
    }, [page, pageSize, searchStatus, searchAdvertiserId, dateRange, source]);

    // 轮询 PENDING/RUNNING 任务
    useEffect(() => {
      const hasPending = (diagnosisStore.tasks ?? []).some(
        (t) => t.status === 'PENDING' || t.status === 'RUNNING',
      );

      if (hasPending && !pollingTimerRef.current) {
        pollingTimerRef.current = setInterval(loadTasks, 5000);
      } else if (!hasPending && pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }

      return () => {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
      };
    }, [diagnosisStore.tasks.length]);

    const handleReset = () => {
      setSearchStatus(undefined);
      setSearchAdvertiserId(undefined);
      setDateRange(undefined);
      setPage(1);
    };

    const detailPath =
      source === 'NEW' ? '/new-material/tasks' : '/ark-material/tasks';

    const columns = [
      {
        title: '视频ID',
        dataIndex: 'videoStrId',
        key: 'videoStrId',
        ellipsis: true,
        render: (v: string, record: DiagnosisTask) =>
          v || String(record.videoId),
      },
      {
        title: '广告主ID',
        dataIndex: 'advertiserId',
        key: 'advertiserId',
        width: 120,
      },
      {
        title: '任务状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (status: string) => {
          const cfg = STATUS_CONFIG[status] ?? {
            status: 'default' as const,
            label: status,
          };
          return <Badge status={cfg.status} text={cfg.label} />;
        },
      },
      {
        title: 'AD优质',
        key: 'adQuality',
        width: 110,
        render: (_: unknown, record: DiagnosisTask) => (
          <ResultTag
            type="ad"
            value={record.result?.isAdHighQuality ?? 'UNKNOWN'}
          />
        ),
      },
      {
        title: '千川优质',
        key: 'ecpQuality',
        width: 110,
        render: (_: unknown, record: DiagnosisTask) => (
          <ResultTag
            type="ecp"
            value={record.result?.isEcpHighQuality ?? 'UNKNOWN'}
          />
        ),
      },
      {
        title: '首发',
        key: 'firstPublish',
        width: 90,
        render: (_: unknown, record: DiagnosisTask) => (
          <ResultTag
            type="first"
            value={record.result?.isFirstPublish ?? 'UNKNOWN'}
          />
        ),
      },
      {
        title: '非优原因',
        key: 'nonQualityReasons',
        width: 100,
        render: (_: unknown, record: DiagnosisTask) => {
          const reasons = [
            ...(record.result?.notAdHighQualityReason ?? []),
            ...(record.result?.notEcpHighQualityReason ?? []),
          ];
          if (reasons.length === 0) return '-';
          const content = (
            <ul style={{ margin: 0, paddingLeft: 16, maxWidth: 260 }}>
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          );
          return (
            <Popover content={content} title="非优原因">
              <Tooltip title="点击查看详情">
                <Button type="link" size="small" style={{ padding: 0 }}>
                  {reasons.length}条原因
                </Button>
              </Tooltip>
            </Popover>
          );
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        title: '完成时间',
        dataIndex: 'completedAt',
        key: 'completedAt',
        width: 180,
        render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right' as const,
        render: (_: unknown, record: DiagnosisTask) => (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`${detailPath}/${record.id}`)}
          >
            详情
          </Button>
        ),
      },
    ];

    const statusOptions = [
      { value: 'PENDING', label: '检测中' },
      { value: 'SUCCESS', label: '已完成' },
      { value: 'FAILED', label: '失败' },
      { value: 'TIMEOUT', label: '超时' },
    ];

    return (
      <Card
        title={source === 'NEW' ? '新素材检测 - 任务列表' : '已有素材检测 - 任务列表'}
        extra={
          source === 'NEW' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/new-material')}
            >
              发起前测
            </Button>
          )
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 筛选栏 */}
          <Space wrap>
            <Select
              placeholder="任务状态"
              value={searchStatus}
              onChange={setSearchStatus}
              style={{ width: 140 }}
              allowClear
              options={statusOptions}
            />
            <InputNumber
              placeholder="广告主ID"
              value={searchAdvertiserId}
              onChange={(v) => setSearchAdvertiserId(v ?? undefined)}
              style={{ width: 140 }}
              min={1}
              precision={0}
            />
            <RangePicker
              value={
                dateRange
                  ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
                  : undefined
              }
              onChange={(dates) => {
                if (dates) {
                  setDateRange([
                    dates[0]!.format('YYYY-MM-DD'),
                    dates[1]!.format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(undefined);
                }
              }}
            />
            <Button type="primary" onClick={() => { setPage(1); loadTasks(); }}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<ReloadOutlined />} onClick={loadTasks}>
              刷新
            </Button>
          </Space>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={diagnosisStore.tasks}
            rowKey="id"
            loading={diagnosisStore.loading}
            scroll={{ x: 1400 }}
            pagination={{
              current: page,
              pageSize,
              total: diagnosisStore.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
          />
        </Space>
      </Card>
    );
  },
);

export default NewMaterialList;
