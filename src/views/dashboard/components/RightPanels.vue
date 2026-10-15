<template>
  <div>
    <!-- R1 Safety -->
    <div class="panel" id="pSafety">
      <h3 data-search-id="p:title:safety">SAFETY &amp; ENVIRONMENT<span class="en">§14.1–14.7</span></h3>
      <div class="safety-top">
        <div class="safety-box safety-box-green">
          <div class="safety-big-num safety-big-num-green">{{ db.safety.daysSinceLastMomAccident }}</div>
          <div class="safety-label">Days since last<br/>MOM-reportable accident</div>
        </div>
        <div class="safety-box safety-box-orange stat-click" @click="openSafetyList('MOM ≥ 3d MC')">
          <div class="safety-big-num safety-big-num-orange bad">{{ momStat.n }}</div>
          <div class="safety-label">MOM ≥ 3d MC<br/><span class="up">{{ momStat.deltaText }}</span></div>
        </div>
      </div>
      <div class="safety-grid">
        <div v-for="s in gridStats" :key="s.cat" class="stat stat-click" @click="openSafetyList(s.cat)">
          <div class="n" :class="s.nCls">{{ s.n }}</div>
          <div class="l">{{ safetyLabel(s.cat) }}</div>
          <div class="d" :class="s.delta">{{ s.deltaText }}</div>
        </div>
      </div>
      <div class="safety-bottom">
        <div class="kbox" data-search-id="s:mandaysMonth"><span>MANDAYS LOST · MONTH (§14.3)</span><b>{{
            db.safety.mandaysLostMonth }}</b></div>
        <div class="kbox" data-search-id="s:mandaysCum"><span>MANDAYS LOST · CUM. (§14.4)</span><b
            class="cum-blue">{{ db.safety.mandaysLostCum }}</b>
        </div>
      </div>
    </div>

    <!-- R2 Progress Risk -->
    <div class="panel" id="pRisk">
      <h3 data-search-id="p:title:risk">PROGRESS RISK<span class="en">§12 RISK OF DELAY</span></h3>
      <div class="risk-stats">
        <div class="stat risk-high stat-click" @click="openSafetyList('High Risk')">
          <div class="n bad">{{ riskCounts['High Risk'] }}</div>
          <div class="l">High Risk<br/>(≥ 20 days)</div>
        </div>
        <div class="stat risk-warn stat-click" @click="openSafetyList('At Risk')">
          <div class="n warn">{{ riskCounts['At Risk'] }}</div>
          <div class="l">At Risk<br/>(5–19 days)</div>
        </div>
        <div class="stat risk-good stat-click" @click="openSafetyList('On Track')">
          <div class="n good">{{ riskCounts['On Track'] }}</div>
          <div class="l">On Track<br/>(＜ 5 days)</div>
        </div>
      </div>
      <table class="mini nowrap">
        <tr>
          <th>TOP RISKS</th>
          <th>AREA</th>
          <th>DELAY</th>
          <th>TREND</th>
        </tr>
        <tr v-for="(r, i) in riskRows" :key="r.name" :data-search-id="'risk:' + i">
          <td>{{ r.name }}</td>
          <td>{{ r.area }}</td>
          <td :style="{ color: r.delayColor }">{{ r.delay }}</td>
          <td :class="r.trendCls">{{ r.trend }}</td>
        </tr>
      </table>
    </div>

    <!-- R3 Cost & Claims -->
    <div class="panel" id="pCost">
      <h3 data-search-id="p:title:cost">COST &amp; CLAIMS<span class="en">§13</span></h3>
      <div ref="chCost" class="chart cost-chart"></div>
      <div class="srows">
        <div v-for="row in claimsRows" :key="row.name" class="srow" :data-search-id="'claim:' + row.name">
          <span class="nm">{{ row.name }}</span><span class="tt">{{ row.total }}</span>
          <div class="sbar">
            <div v-for="(seg, i) in row.segs" :key="i" :class="'sg' + (i + 1)" :style="{ width: seg.w + '%' }">
              {{ seg.lab }}
            </div>
          </div>
        </div>
      </div>
      <div class="cost-footer">
        <div class="cost-legend-text" data-search-id="c:legend">
          <span class="legend-dot legend-dot-blue">■</span>Submitted&nbsp;
          <span class="legend-dot legend-dot-yellow">■</span>Under Review&nbsp;
          <span class="legend-dot legend-dot-green">■</span>Approved·Closed
        </div>
        <div class="cost-tabs">
          <div class="mini-tab cost-tab" :class="{ active: claimsMode === 'count' }" @click="claimsMode = 'count'">
            COUNT
          </div>
          <div class="mini-tab cost-tab" :class="{ active: claimsMode === 'amt' }" @click="claimsMode = 'amt'">AMOUNT
            S$M
          </div>
        </div>
      </div>
      <div class="cost-bottom">
        <div class="kbox" data-search-id="c:wsoEot"><span>WSO EOT PACKAGES (§13.6)</span><b>{{
            db.cost.wsoEotPackages }}</b></div>
        <div class="kbox" data-search-id="c:maxEot"><span>MAX EOT · DAYS</span><b class="cum-blue"
                                                                                  style="color:#ffd83d">{{
            db.cost.maxEotDays }}</b></div>
      </div>
    </div>

    <!-- Safety List Dialog -->
    <div class="dialog-mask" v-show="safetyList.show" @click.stop>
      <div class="dialog-box">
        <div class="dialog-head">
          <span class="dialog-title">{{ safetyList.cat }} — LIST</span>
          <span class="dialog-close" @click="safetyList.show = false">✕</span>
        </div>
        <div class="dialog-body">
          <table class="mini dialog-table list-table">
            <tr>
              <th>NO.</th>
              <th>ITEM</th>
            </tr>
            <tr v-for="(it, i) in safetyList.items" :key="i" class="clickable-row" @click="openSafetyDetail(it)">
              <td>{{ i + 1 }}</td>
              <td>{{ it.title }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- Safety Detail Dialog -->
    <div class="dialog-mask" v-show="safetyDetail.show" @click.stop>
      <div class="dialog-box" id="safetyDetailBox">
        <div class="dialog-head">
          <span class="dialog-title">{{ safetyDetail.data.title }}</span>
          <span class="dialog-close" @click="safetyDetail.show = false">✕</span>
        </div>
        <div class="dialog-body">
          <table class="mini dialog-table detail-table">
            <tr v-for="f in safetyDetail.data.fields" :key="f.k">
              <th>{{ f.k }}</th>
              <td>{{ f.v }}</td>
            </tr>
          </table>
          <div v-if="safetyDetail.data.desc" class="detail-desc">
            <div class="detail-desc-label">DESCRIPTION</div>
            <div class="detail-desc-content">{{ safetyDetail.data.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import {buildSafetyRecords, buildRiskRecords} from '@/views/dashboard/data/panelData'
import {db} from '@/data/store'

export default {
  name: 'DashboardRightPanels',
  data() {
    return {
      db,
      claimsMode: 'count',
      safetyList: {show: false, cat: '', items: []},
      safetyDetail: {show: false, data: {}},
      charts: []
    }
  },
  computed: {
    safetyRecords() { return buildSafetyRecords(this.db.safety.safetyPoints, this.db.safety.titleMap) },
    riskRecords() { return buildRiskRecords(this.db.progressRisk.riskZones) },
    riskRows() { return this.db.progressRisk.topRisks },
    claimsData() { return this.db.cost.claims },
    safetyStats() { return this.db.safety.stats },
    // 顶部橙色大数字单独取，其余六项进网格
    momStat() {
      return this.safetyStats.find(s => s.cat === 'MOM ≥ 3d MC') || {n: 0, deltaText: ''}
    },
    gridStats() {
      return this.safetyStats.filter(s => s.cat !== 'MOM ≥ 3d MC')
    },
    // 风险分级计数，由 §12 的 Risk of Delay 标签聚合
    riskCounts() {
      const buckets = {'High Risk': 0, 'At Risk': 0, 'On Track': 0}
      ;(this.db.progressRisk.riskZones || []).forEach(z => {
        if (buckets[z.risk] !== undefined) buckets[z.risk]++
      })
      return buckets
    },
    costChart() { return this.db.cost.chart },
    claimsRows() {
      const isAmt = this.claimsMode === 'amt'
      return this.claimsData[this.claimsMode].map(([name, segs]) => {
        const total = segs.reduce((a, b) => a + b, 0)
        return {
          name,
          total: isAmt ? total.toFixed(1) : String(total),
          segs: segs.map(v => {
            const w = (total ? v / total : 0) * 100
            return {w, lab: w > 11 ? (isAmt ? v.toFixed(1) : String(v)) : ''}
          })
        }
      })
    }
  },
  mounted() {
    // 用包装函数注册，避免多阶段编辑/HMR 期间注册到 undefined
    this._searchNavHandler = (item) => this.onSearchNavigate(item)
    this.$root.$on('search:navigate', this._searchNavHandler)
    const chCost = echarts.init(this.$refs.chCost)
    chCost.setOption(this.costOption())
    this.costChartInst = chCost
    this.charts = [chCost]
  },
  watch: {
    costChart() {
      if (this.costChartInst) this.costChartInst.setOption(this.costOption())
    }
  },
  beforeDestroy() {
    this.$root.$off('search:navigate', this._searchNavHandler)
    this.charts.forEach(c => c.dispose())
    this.charts = []
    this.costChartInst = null
  },
  methods: {
    // 个别类目的界面文案与 RCID 表头措辞不同，在此覆盖
    // 注意 'MOM ＜ 3d MC' 用的是全角小于号（U+FF1C），与设计稿一致
    safetyLabel(cat) {
      const override = {
        'Vector Control': 'Vector control fines (month)',
        'MOM < 3d MC': 'MOM ＜ 3d MC'
      }
      return override[cat] || cat
    },
    // 造价图配置：数据全部来自 §13.3 的 Progress Claim
    costOption() {
      const c = this.costChart
      const sum = c.contractSum || 0
      const months = c.months || []
      return {
        grid: {left: 50, right: 8, top: 26, bottom: 18},
        legend: {textStyle: {color: '#8fc6ea', fontSize: 9.5}, top: 0, right: 0, itemWidth: 10, itemHeight: 7},
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(4,30,58,.95)',
          borderColor: '#00c8ff',
          textStyle: {color: '#cfe8ff', fontSize: 11}
        },
        xAxis: {type: 'category', data: months, ...this.baseAxis()},
        yAxis: {type: 'value', name: 'S$ M', nameTextStyle: {color: '#8fc6ea', fontSize: 9}, ...this.baseAxis()},
        series: [
          {
            name: 'Monthly Claim',
            type: 'bar',
            data: c.monthly || [],
            itemStyle: {color: 'rgba(14,154,216,.85)', borderRadius: [2, 2, 0, 0]},
            barWidth: '36%'
          },
          {
            name: 'Cumulative',
            type: 'line',
            data: c.cumulative || [],
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {color: '#3fd2ff', width: 2},
            itemStyle: {color: '#3fd2ff'},
            areaStyle: {color: 'rgba(63,210,255,.12)'}
          },
          {
            name: `Contract Sum ${sum}`,
            type: 'line',
            data: months.map(() => sum),
            symbol: 'none',
            lineStyle: {color: '#ffd83d', type: 'dashed', width: 1.5},
            itemStyle: {color: '#ffd83d'}
          }
        ]
      }
    },
    openSafetyList(cat) {
      const items = this.safetyRecords[cat] || this.riskRecords[cat] || []
      this.safetyList = {show: true, cat, items}
    },
    openSafetyDetail(item) {
      this.safetyDetail = {show: true, data: item}
    },
    // 全局检索 → 打开安全/风险详情弹窗并高亮 5s
    onSearchNavigate(item) {
      const a = item.action || {}
      if (a.dialog === 'safetyDetail' && a.payload) {
        this.openSafetyDetail(a.payload)
        this.$nextTick(() => this.flashBox('#safetyDetailBox'))
      }
    },
    flashBox(selector) {
      const node = document.querySelector(selector)
      if (!node) return
      node.classList.add('search-highlight')
      setTimeout(() => node.classList.remove('search-highlight'), 5000)
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

#pSafety {
  right: 10px;
  top: 96px;
  width: 410px;
  height: 300px;

  .stat {
    padding: 5px 2px 4px;

    .n {
      font-size: 19px;
    }
  }
}

#pRisk {
  right: 10px;
  top: 410px;
  width: 410px;
  height: 310px;

  table.mini {
    th:nth-child(3),
    th:nth-child(4),
    td:nth-child(3),
    td:nth-child(4) {
      text-align: center;
    }

    th:nth-child(1) {
      width: 52%;
    }

    th:nth-child(2) {
      width: 20%;
    }

    th:nth-child(3) {
      width: 14%;
    }

    th:nth-child(4) {
      width: 14%;
    }
  }
}

#pCost {
  right: 10px;
  top: 734px;
  width: 410px;
  height: 330px;
}

.safety-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.safety-box {
  flex: 1;
  text-align: center;
  background: rgba(8, 50, 95, 0.45);
  border-radius: 4px;
  padding: 4px;
}

.safety-box-green {
  border: 1px solid rgba(46, 255, 157, 0.35);
}

.safety-box-orange {
  border: 1px solid rgba(255, 157, 46, 0.35);
}

.safety-big-num {
  font-size: 23px;
  font-weight: 800;
}

.safety-big-num-green {
  color: #2eff9d;
  text-shadow: 0 0 12px rgba(46, 255, 157, 0.6);
}

.safety-big-num-orange {
  color: #ff9d2e;
}

.safety-label {
  font-size: 10px;
  color: #7fb9e2;
}

.safety-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.safety-bottom {
  display: flex;
  gap: 8px;
  margin-top: 7px;
}

.cum-blue {
  color: #3fd2ff;
}

.risk-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.risk-high {
  flex: 1;
  border-color: rgba(255, 82, 82, 0.4);
}

.risk-warn {
  flex: 1;
  border-color: rgba(255, 216, 61, 0.4);
}

.risk-good {
  flex: 1;
  border-color: rgba(46, 255, 157, 0.35);
}

.cost-chart {
  height: 130px;
}

.cost-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
}

.cost-legend-text {
  font-size: 9.5px;
  color: #6fa8d0;
  white-space: nowrap;
}

.legend-dot {
  font-size: 10px;
}

.legend-dot-blue {
  color: #2f7fd6;
}

.legend-dot-yellow {
  color: #e8b93c;
}

.legend-dot-green {
  color: #2ecc8f;
}

.cost-tabs {
  display: flex;
  gap: 4px;
}

.cost-tab {
  flex: none;
  padding: 2px 5px;
  font-size: 10px;
}

.cost-bottom {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.stat-click {
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    border-color: #00d5ff;
    background: rgba(0, 140, 220, 0.25);
  }
}

.dialog-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 8, 20, 0.55);
}

.dialog-box {
  width: 600px;
  height: 400px;
  background: rgba(4, 30, 58, 0.96);
  border: 1px solid #00c8ff;
  border-radius: 6px;
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .dialog-head {
    height: 44px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(0, 200, 255, 0.35);

    .dialog-title {
      color: #7fe6ff;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dialog-close {
      color: #cfe8ff;
      font-size: 18px;
      cursor: pointer;
      margin-left: 12px;

      &:hover {
        color: #fff;
      }
    }
  }

  .dialog-body {
    flex: 1;
    overflow: auto;
    padding: 14px 16px;

    .dialog-table {
      white-space: nowrap;

      th {
        color: #5fb0dd;
        font-size: 11px;
      }

      td {
        font-size: 11.5px;
      }
    }

    .clickable-row {
      cursor: pointer;

      &:hover td {
        background: rgba(0, 200, 255, 0.12);
        color: #fff;
      }
    }

    .list-table {
      th:nth-child(1), td:nth-child(1) {
        width: 100px;
      }
    }

    .detail-table {
      table-layout: fixed;
      width: 100%;

      th {
        width: 220px;
        text-align: left;
        padding-right: 12px;
      }

      td {
        color: #eaf7ff;
      }
    }

    .detail-desc {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid rgba(90, 170, 230, 0.18);

      .detail-desc-label {
        font-size: 10px;
        color: #5fb0dd;
        letter-spacing: 1.5px;
        margin-bottom: 6px;
      }

      .detail-desc-content {
        color: #cfe8ff;
        font-size: 12px;
        line-height: 1.8;
        word-break: break-word;
      }
    }
  }

  .dialog-body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .dialog-body::-webkit-scrollbar-thumb {
    background: rgba(0, 200, 255, 0.35);
    border-radius: 3px;
  }

  .dialog-body::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.4);
  }
}
</style>
