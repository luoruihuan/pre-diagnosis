import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  Modal,
} from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import diagnosisStore from '../../stores/diagnosisStore';
import TaskStatusBadge from '../../components/TaskStatusBadge';
import type { DiagnosisTask } from '../../types/diagnosis';
import dayjs from 'dayjs';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, TASK_STATUS } from '../../utils/constants';

const { RangePicker } = DatePicker;

const DiagnosisList: React.FC = observer(() => {
  const navigate = useNavigate();
  const [searchStatus, setSearchStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // 使用 ref 存储定时器，避免内存泄漏
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTasks();
  }, [page, pageSize, searchStatus, dateRange]);

  // 自动刷新 PENDING 状态的任务（修复内存泄漏）
  useEffect(() => {
    const checkAndStartPolling = () => {
      const hasPendingTasks = diagnosisStore.tasks.some(
        (task) => task.status === 'PENDING' || task.status === 'RUNNING'
      );

      if (hasPendingTasks && !pollingTimerRef.current) {
        pollingTimerRef.current = setInterval(() => {
          loadTasks();
        }, 5000);
      } else if (!hasPendingTasks && pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    checkAndStartPolling();

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [diagnosisStore.tasks.length]);

  const loadTasks = () => {
    diagnosisStore.fetchTasks({
      page,
      pageSize,
      status: searchStatus,
      startDate: dateRange?.[0],
      endDate: dateRange?.[1],
    });
  };

  const handleSearch = () => {
    setPage(1);
    loadTasks();
  };

  const handleReset = () => {
    setSearchStatus(undefined);
    setDateRange(undefined);
    setPage(1);
  };

  const handleDelete = (record: DiagnosisTask) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${record.title ?? record.id}"吗？`,
      onOk: async () => {
        try {
          await diagnosisStore.deleteTask(record.id);
        } catch (error) {
          // 错误已在 store 中处理
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '视频ID',
      dataIndex: 'videoId',
      key: 'videoId',
      ellipsis: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '广告主ID',
      dataIndex: 'advertiserId',
      key: 'advertiserId',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof TASK_STATUS) => <TaskStatusBadge status={status} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: DiagnosisTask) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/diagnosis/detail/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const statusOptions = Object.entries(TASK_STATUS).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  return (
    <Card
      title="任务列表"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/diagnosis/create')}
        >
          创建任务
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 搜索栏 */}
        <Space wrap>
          <Select
            placeholder="任务状态"
            value={searchStatus}
            onChange={setSearchStatus}
            style={{ width: 150 }}
            allowClear
            options={statusOptions}
          />
          <RangePicker
            value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : undefined}
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
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
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
          scroll={{ x: 900 }}
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
});

export default DiagnosisList;

