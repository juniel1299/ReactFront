// grid: {
//   left: 300,          // 충분히 크게
//   containLabel: true,
// }
// yAxis: {
//   axisLabel: {
//     interval: 0
//   }
// }
import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const rawData = [
  { name: '엄청 긴 라벨 테스트 첫 번째 항목입니다 아주 길게 적어봅니다', value: 120 },
  { name: '엄청 긴 라벨 테스트 두 번째 항목입니다 한 줄로 끝까지 보이는지 확인', value: 200 },
  { name: '엄청 긴 라벨 테스트 세 번째 항목입니다 좌측 공간이 핵심입니다', value: 150 },
  { name: '엄청 긴 라벨 테스트 네 번째 항목입니다 ellipsis 없이 출력', value: 80 },
  { name: '엄청 긴 라벨 테스트 다섯 번째 항목입니다 잘리지 않아야 합니다', value: 70 },
  { name: '엄청 긴 라벨 테스트 여섯 번째 항목입니다 grid left 확인용', value: 110 },
];

export default function EchartTest() {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [leftSpace, setLeftSpace] = useState(250);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    const option = {
      title: {
        text: 'ECharts 라벨 한 줄 출력 테스트',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      grid: {
        top: 60,
        right: 40,
        bottom: 30,
        left: leftSpace,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'category',
        data: rawData.map((item) => item.name),
        axisLabel: {
          show: true,
          interval: 0,
          // width 주지 않음
          // overflow 주지 않음
          // ellipsis 없음
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data: rawData.map((item) => item.value),
          label: {
            show: true,
            position: 'right',
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [leftSpace]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>라벨 한 줄 출력 테스트</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setLeftSpace(120)}>left 120</button>
        <button onClick={() => setLeftSpace(180)}>left 180</button>
        <button onClick={() => setLeftSpace(250)}>left 250</button>
        <button onClick={() => setLeftSpace(320)}>left 320</button>
        <button onClick={() => setLeftSpace(400)}>left 400</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        현재 grid.left: <b>{leftSpace}</b>
      </div>

      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: 500,
          border: '1px solid #ddd',
          borderRadius: 8,
        }}
      />
    </div>
  );
}