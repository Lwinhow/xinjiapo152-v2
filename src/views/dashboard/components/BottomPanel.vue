<template>
  <div>
    <!-- Bottom progress -->
    <div class="panel" id="pProgress">
      <h3 data-search-id="p:title:progress">OVERALL PROGRESS<span class="en">§16</span></h3>
      <div class="body">
        <div class="info" data-search-id="p:info">
          <div class="info-label">ACTUAL / PLANNED</div>
          <div>
            <span class="actual">{{ op.actualPct }}%</span>
            <span class="planned"> / {{ op.plannedPct }}%</span>
          </div>
          <div class="variance">{{ varianceText }}</div>
        </div>
        <div class="chart-wrap">
          <div ref="chProgress" class="chart progress-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import {db} from '@/data/store'

export default {
  name: 'DashboardBottomPanel',
  data() {
    return {
      db,
      charts: []
    }
  },
  computed: {
    op() { return this.db.overallProgress },
    progressChart() { return this.db.overallProgress.chart },
    varianceText() {
      const v = this.op.variancePct
      if (v === null || v === undefined || v === '') return '—'
      const num = Math.abs(v).toFixed(1)
      const sign = v > 0 ? '+' : '−'   // U+2212，与设计稿一致
      const note = this.op.varianceNote ? ` (${this.op.varianceNote})` : ''
      return `▼ Variance ${sign}${num}%${note}`
    }
  },
  watch: {
    progressChart() {
      if (this.progressChartInst) this.progressChartInst.setOption(this.progressOption())
    }
  },
  mounted() {
    const ch = echarts.init(this.$refs.chProgress)
    ch.setOption(this.progressOption())
    this.progressChartInst = ch
    this.charts = [ch]
  },
  beforeDestroy() {
    this.charts.forEach(c => c.dispose())
    this.charts = []
    this.progressChartInst = null
  },
  methods: {
    // §16 四条曲线全部来自 RCID 的 Overall Progress 表
    progressOption() {
      const c = this.progressChart
      return {
        grid: {left: 40, right: 12, top: 28, bottom: 20},
        legend: {textStyle: {color: '#8fc6ea', fontSize: 10}, top: 0, itemWidth: 12, itemHeight: 8},
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(4,30,58,.95)',
          borderColor: '#00c8ff',
          textStyle: {color: '#cfe8ff', fontSize: 11}
        },
        xAxis: {type: 'category', data: c.months || [], boundaryGap: false, ...this.baseAxis()},
        yAxis: {type: 'value', max: 100, name: '%', nameTextStyle: {color: '#8fc6ea', fontSize: 10}, ...this.baseAxis()},
        series: [
          {
            name: 'Early',
            type: 'line',
            data: c.early || [],
            smooth: true,
            symbol: 'none',
            lineStyle: {color: 'rgba(46,255,157,.55)', width: 1.5, type: 'dashed'},
            itemStyle: {color: '#2eff9d'}
          },
          {
            name: 'Late',
            type: 'line',
            data: c.late || [],
            smooth: true,
            symbol: 'none',
            lineStyle: {color: 'rgba(255,216,61,.55)', width: 1.5, type: 'dashed'},
            itemStyle: {color: '#ffd83d'}
          },
          {
            name: 'Actual',
            type: 'line',
            data: c.actual || [],
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {color: '#3fd2ff', width: 3},
            itemStyle: {color: '#3fd2ff'},
            areaStyle: {color: 'rgba(63,210,255,.15)'}
          },
          {
            name: 'Planned',
            type: 'line',
            data: c.planned || [],
            smooth: true,
            symbol: 'none',
            lineStyle: {color: 'rgba(160,200,255,.8)', width: 1.5},
            itemStyle: {color: '#a0c8ff'}
          }
        ]
      }
    },
    baseAxis() {
      return {
        axisLine: {lineStyle: {color: 'rgba(120,190,240,.4)'}},
        axisLabel: {color: '#8fc6ea', fontSize: 10},
        splitLine: {lineStyle: {color: 'rgba(90,170,230,.12)'}}
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/panel.scss';

#pProgress {
  left: 50%;
  transform: translateX(-50%);
  bottom: 16px;
  width: 1060px;
  height: 260px;
  z-index: 21;
}

.body {
  display: flex;
  height: 100%;
}

.info {
  width: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding-right: 8px;
  border-right: 1px solid rgba(90, 170, 230, 0.18);
  white-space: nowrap;
}

.info-label {
  font-size: 11px;
  color: #7fb9e2;
  letter-spacing: 1px;
}

.actual {
  font-size: 34px;
  font-weight: 800;
  color: #3fd2ff;
  text-shadow: 0 0 14px rgba(63, 210, 255, 0.6);
}

.planned {
  font-size: 15px;
  color: #8fc6ea;
  font-weight: 700;
}

.variance {
  font-size: 12px;
  color: #ff6b6b;
}

.envelope {
  font-size: 12px;
  color: #6fa8d0;
}

.chart-wrap {
  flex: 1;
}

.progress-chart {
  height: 220px;
}
</style>
