import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Checkbox } from 'antd';
import { observer } from 'mobx-react-lite';
import enumStore from '../../stores/enumStore';
import RegionCascader from '../RegionCascader';
import { GENDER_OPTIONS, AGE_GROUP_OPTIONS, DIAGNOSIS_DIMENSIONS } from '../../utils/constants';

interface DiagnosisConfigFormProps {
  form: any;
}

const DiagnosisConfigForm: React.FC<DiagnosisConfigFormProps> = observer(({ form: _form }) => {
  useEffect(() => {
    if (enumStore.diagnosisDimensions.length === 0) {
      enumStore.initEnums();
    }
  }, []);

  return (
    <>
      <Form.Item
        label="任务名称"
        name="taskName"
        rules={[{ required: true, message: '请输入任务名称' }]}
      >
        <Input placeholder="请输入任务名称" maxLength={100} />
      </Form.Item>

      <Form.Item
        label="目标地区"
        name="regionCode"
        rules={[{ required: true, message: '请选择目标地区' }]}
      >
        <RegionCascader />
      </Form.Item>

      <Form.Item
        label="年龄段"
        name="ageGroup"
        rules={[{ required: true, message: '请选择年龄段' }]}
      >
        <Select placeholder="请选择年龄段" options={AGE_GROUP_OPTIONS} />
      </Form.Item>

      <Form.Item
        label="性别"
        name="gender"
        rules={[{ required: true, message: '请选择性别' }]}
      >
        <Select placeholder="请选择性别" options={GENDER_OPTIONS} />
      </Form.Item>

      <Form.Item
        label="样本量"
        name="sampleSize"
        rules={[
          { required: true, message: '请输入样本量' },
          { type: 'number', min: 100, max: 10000, message: '样本量范围：100-10000' },
        ]}
      >
        <InputNumber
          placeholder="请输入样本量"
          style={{ width: '100%' }}
          min={100}
          max={10000}
        />
      </Form.Item>

      <Form.Item
        label="诊断维度"
        name="dimensions"
        rules={[{ required: true, message: '请至少选择一个诊断维度' }]}
      >
        <Checkbox.Group options={DIAGNOSIS_DIMENSIONS} />
      </Form.Item>
    </>
  );
});

export default DiagnosisConfigForm;
