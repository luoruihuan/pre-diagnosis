import React, { useEffect } from 'react';
import { Cascader } from 'antd';
import { observer } from 'mobx-react-lite';
import enumStore from '../../stores/enumStore';
import type { Region } from '../../types/common';

interface RegionCascaderProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
}

const RegionCascader: React.FC<RegionCascaderProps> = observer(({ value, onChange, placeholder = '请选择地区' }) => {
  useEffect(() => {
    if (enumStore.regions.length === 0) {
      enumStore.initEnums();
    }
  }, []);

  // 转换地区数据为 Cascader 需要的格式
  const transformRegions = (regions: Region[]): any[] => {
    return regions.map((region) => ({
      value: region.code,
      label: region.name,
      children: region.children ? transformRegions(region.children) : undefined,
    }));
  };

  const options = transformRegions(enumStore.regions);

  return (
    <Cascader
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showSearch
      style={{ width: '100%' }}
    />
  );
});

export default RegionCascader;
