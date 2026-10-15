<template>
  <div>
    <!-- L1 Main Contract（tab：主合同 / 支撑合同） -->
    <div class="panel" id="pContract">
      <h3 data-search-id="p:title:contract">
        <div class="contract-tabs">
          <div class="mini-tab" :class="{ active: contractTab === 'main' }" @click="contractTab = 'main'"
               data-search-id="p:title:contract-tab">MAIN
          </div>
          <div class="mini-tab" :class="{ active: contractTab === 'support' }" @click="contractTab = 'support'"
               data-search-id="p:title:support">SUPPORTING
          </div>
        </div>
        <span class="h3-suffix">CONTRACT</span>
      </h3>
      <div v-show="contractTab === 'main'">
        <div class="contract-row">
          <div class="contract-detail">
            <div class="kv" data-search-id="mc:contractNo"><span class="k">Contract No.</span><span
                class="v hl">{{ mc.contractNo }}</span></div>
            <div class="kv" data-search-id="mc:contractor"><span class="k">Contractor</span><span
                class="v">{{ mc.contractor }}</span></div>
            <div class="kv" data-search-id="mc:contractSum"><span class="k">Contract Sum</span><span
                class="v hl">{{ mc.contractSum }}</span></div>
            <div class="kv" data-search-id="mc:commencement"><span class="k">Commencement</span><span
                class="v">{{ mc.commencement }}</span></div>
            <div class="kv" data-search-id="mc:completion"><span class="k">Completion</span><span
                class="v">{{ mc.completion }}</span></div>
            <div class="kv" data-search-id="mc:eot"><span class="k">EOT Granted</span><span
                class="v eot-val">{{ mc.eotGranted }}</span></div>
            <div class="kv" data-search-id="mc:status"><span class="k">Project Status</span><span class="v"><span
                class="badge b-blue">{{ mc.projectStatus }}</span></span></div>
          </div>
          <div class="gauge-col" data-search-id="mc:gauge">
            <div ref="gTime" class="chart gauge-chart"></div>
            <div class="gauge-info">Time Elapsed</div>
            <div class="grading-info">
              Performance Grading<br/>
              <span class="badge grading-badge" :class="gradingCls">{{ mc.grading }}</span>
            </div>
          </div>
        </div>
        <div class="kv" data-search-id="mc:team"><span class="k">Project Team</span><span class="v">{{ mc.projectTeam
          }}</span></div>
        <div class="kv" data-search-id="mc:nearMiss"><span class="k">Near Miss Reported (cum.)</span><span
            class="v">{{ mc.nearMissCum }}</span></div>
      </div>
      <div v-show="contractTab === 'support'">
        <table class="mini nowrap">
          <tr>
            <th>ROLE</th>
            <th>CONTRACT</th>
            <th>PIC</th>
            <th>STATUS</th>
            <th>GRADING</th>
          </tr>
          <tr v-for="s in supportRows" :key="s.role" class="clickable-row" @click="openRowDetail(s)">
            <td>{{ s.role }}</td>
            <td>{{ s.contract }}</td>
            <td>{{ s.pic }}</td>
            <td><span class="badge badge-sm" :class="s.badgeCls">{{ s.status }}</span></td>
            <td :style="{ color: s.gradeColor }">{{ s.grading }}</td>
          </tr>
        </table>
        <div class="support-footer">
          <div class="qss-label">QSS POSTS (§2.1)</div>
          <div class="qss-chips">
            <span v-for="q in qssPosts" :key="q.post" class="qchip qchip-click" @click="openQssDetail(q)">{{
                q.post
              }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- L2 AIP Tracking -->
    <div class="panel" id="pAip">
      <h3>AIP TRACKING<span class="en">APPROVAL IN PRINCIPLE · {{ aipList.length }} NOS</span></h3>
      <div class="aip-stats">
        <div v-for="s in aipStats" :key="s.label" class="stat" :class="s.borderCls">
          <div class="n" :class="s.cls">{{ s.n }}</div>
          <div class="l">{{ s.label }}</div>
        </div>
      </div>
      <div class="aip-revs">
        <template v-for="r in aipRevs">
          <span :key="'n' + r.name" class="rev-name">{{ r.name }}</span>
          <div :key="'b' + r.name" class="rev-bar" :class="r.barCls" :style="{flex: r.flex}"></div>
          <b :key="'v' + r.name" class="rev-num">{{ r.n }}</b>
        </template>
      </div>
      <div class="aip-table-wrap">
        <table class="mini nowrap">
          <tr>
            <th>AIP</th>
            <th>BES</th>
            <th>GTT</th>
            <th>NEXT MILESTONE</th>
          </tr>
          <tr v-for="row in aipRows" :key="row.name" class="clickable-row" @click="openAipDetail(row)">
            <td>{{ row.name }}</td>
            <td>
              <span v-if="row.bes" class="badge badge-sm" :class="row.besCls">{{ row.bes }}</span>
              <template v-else>—</template>
            </td>
            <td>
              <span v-if="row.gtt" class="badge badge-sm" :class="row.gttCls">{{ row.gtt }}</span>
              <template v-else>—</template>
            </td>
            <td>{{ row.milestone }}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- L3 Monthly Review -->
    <div class="panel" id="pMonth">
      <h3 data-search-id="p:title:month">MONTHLY REVIEW<span class="en">§8 ACHIEVEMENTS · §9 CONCERNS</span></h3>
      <div class="month-tabs">
        <div class="mini-tab" :class="{ active: monthTab === 'achv' }" @click="monthTab = 'achv'">ACHIEVEMENTS (§8)
        </div>
        <div class="mini-tab" :class="{ active: monthTab === 'conc' }" @click="monthTab = 'conc'">CONCERNS (§9)</div>
      </div>
      <div v-show="monthTab === 'achv'">
        <div v-for="(t, i) in achievements" :key="t" class="li-item" :data-search-id="'achv:' + i">
          <span class="achv-icon">✔</span> {{ t }}
          <div class="sub">{{ reportMonth }} · Verified</div>
        </div>
      </div>
      <div v-show="monthTab === 'conc'">
        <div v-for="(c, i) in concerns" :key="c.t" class="li-item" :data-search-id="'concern:' + i">
          <span class="badge badge-xs" :class="c.cls">{{ c.lv }}</span> {{ c.t }}
          <div class="sub">Mitigation: {{ c.m }}</div>
        </div>
      </div>
    </div>

    <!-- Row Detail Dialog -->
    <div class="dialog-mask" v-show="rowDetail.show" @click.stop>
      <div class="dialog-box" id="rowDetailBox">
        <div class="dialog-head">
          <span class="dialog-title">{{ rowDetail.data.role }} — DETAIL</span>
          <span class="dialog-close" @click="rowDetail.show = false">✕</span>
        </div>
        <div class="dialog-body">
          <table class="mini dialog-table detail-table">
            <tr v-for="f in rowDetail.data.fields" :key="f.k">
              <th>{{ f.k }}</th>
              <td>
                <template v-if="f.badge">
                  <span class="badge badge-sm" :class="rowDetail.data.badgeCls">{{ rowDetail.data[f.v] }}</span>
                </template>
                <template v-else-if="f.color">
                  <span :style="{ color: rowDetail.data[f.colorField || 'gradeColor'] }">{{
                      rowDetail.data[f.v]
                    }}</span>
                </template>
                <template v-else>
                  {{ rowDetail.data[f.v] }}
                </template>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- QSS Post Detail Dialog -->
    <div class="dialog-mask" v-show="qssDetail.show" @click.stop>
      <div class="dialog-box dialog-box-qss" id="qssDetailBox">
        <div class="dialog-head">
          <span class="dialog-title">{{ qssDetail.data.post }} — DETAIL</span>
          <span class="dialog-close" @click="qssDetail.show = false">✕</span>
        </div>
        <div class="dialog-body">
          <table class="mini dialog-table detail-table">
            <tr>
              <th>Name</th>
              <td>{{ qssDetail.data.name }}</td>
            </tr>
            <tr>
              <th>Designation</th>
              <td>{{ qssDetail.data.designation }}</td>
            </tr>
            <tr>
              <th>Reg No.</th>
              <td>{{ qssDetail.data.regNo }}</td>
            </tr>
            <tr>
              <th>Performance Rating</th>
              <td><span :style="{ color: qssDetail.data.ratingColor }">{{ qssDetail.data.rating }}</span></td>
            </tr>
            <tr>
              <th>Remarks</th>
              <td class="remarks-cell">{{ qssDetail.data.remarks }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- AIP Detail Dialog -->
    <div class="dialog-mask" v-show="aipDetail.show" @click.stop>
      <div class="dialog-box dialog-box-aip" id="aipDetailBox">
        <div class="dialog-head">
          <span class="dialog-title">{{ aipDetail.title }} — DETAIL</span>
          <span class="dialog-close" @click="aipDetail.show = false">✕</span>
        </div>
        <div class="dialog-body">
          <div class="aip-left">
            <div class="aip-kv">
              <div class="k">No.</div>
              <div class="v">{{ aipDetail.data.no }}</div>
            </div>
            <div class="aip-kv">
              <div class="k">AIP Name</div>
              <div class="v">{{ fmtCell(aipDetail.data.name) }}</div>
            </div>
            <div class="aip-kv">
              <div class="k">Prepared by</div>
              <div class="v">{{ fmtCell(aipDetail.data.preparedBy) }}</div>
            </div>
            <div class="aip-kv">
              <div class="k">Submission Reference</div>
              <div class="v">{{ fmtCell(aipDetail.data.submissionRef) }}</div>
            </div>
          </div>
          <div class="aip-right">
            <div v-for="rev in aipRevOrder" :key="rev" class="rev-block">
              <div class="rev-block-title">{{ rev }}</div>
              <table class="mini detail-table">
                <tr v-for="f in aipRevFields" :key="f.k">
                  <th>{{ f.k }}</th>
                  <td>{{ fmtCell(aipDetail.data.revs[rev][f.v]) }}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import {buildAipStats, buildAipRows, buildAipRevs} from '@/utils/aipData'
import {db} from '@/data/store'

export default {
  name: 'DashboardLeftPanels',
  data() {
    return {
      db,
      contractTab: 'main',
      monthTab: 'achv',
      qssDetail: {show: false, data: {}},
      aipDetail: {show: false, data: {revs: {'Rev-': {}, 'Rev A': {}, 'Rev B': {}}}, title: ''},
      aipRevOrder: ['Rev-', 'Rev A', 'Rev B'],
      aipRevFields: [
        {k: 'Contractor Expected', v: 'contractorExpected'},
        {k: 'Contractor Actual', v: 'contractorActual'},
        {k: 'LTA Expected', v: 'ltaExpected'},
        {k: 'LTA Actual', v: 'ltaActual'},
        {k: 'Status (LTA)', v: 'status'},
        {k: 'AC Expected', v: 'acExpected'},
        {k: 'AC Actual', v: 'acActual'},
        {k: 'Status (AC)', v: 'acStatus'}
      ],
      charts: [],
      rowDetail: {show: false, data: {}}
    }
  },
  computed: {
    mc() { return this.db.mainContract },
    reportMonth() { return this.db.achievements.month || this.db.meta.label || '' },
    // 等级 → 徽章配色，取值来自 For Dropdown 的 Grading 列
    gradingCls() {
      switch (String(this.db.mainContract.grading || '').toUpperCase()) {
        case 'EXCELLENT':
        case 'GOOD':
          return 'b-good'
        case 'SATISFACTORY':
          return 'b-warn'
        case 'UNSATISFACTORY':
        case 'POOR':
          return 'b-bad'
        default:
          return 'b-blue'
      }
    },
    supportRows() { return this.db.supportContracts },
    qssPosts() { return this.db.qssPosts },
    achievements() { return this.db.achievements.items },
    concerns() { return this.db.concerns },
    aipList() { return this.db.aip.list },
    aipStats() { return buildAipStats(this.aipList) },
    aipRows() { return buildAipRows(this.aipList, this.db.aip.shortNames) },
    // 各轮次有数据的 AIP 条数；条形宽度按条数分配，样式沿用原写死的三种
    aipRevs() {
      const style = [
        {name: 'REV 0', barCls: 'bar-blue'},
        {name: 'REV A', barCls: 'bar-yellow'},
        {name: 'REV B', barCls: 'bar-dim'}
      ]
      return buildAipRevs(this.aipList, this.db.aip.revOrder).map((r, i) => ({
        name: style[i] ? style[i].name : r.name,
        barCls: style[i] ? style[i].barCls : '',
        flex: Math.max(1, r.n),
        n: r.n
      }))
    },
    timeElapsed() { return this.db.mainContract.timeElapsedPct || 0 }
  },
  watch: {
    timeElapsed(v) {
      if (this.gaugeChart) this.gaugeChart.setOption({series: [{data: [{value: v}]}]})
    }
  },
  mounted() {
    // 用包装函数注册，避免多阶段编辑/HMR 期间注册到 undefined
    this._searchNavHandler = (item) => this.onSearchNavigate(item)
    this.$root.$on('search:navigate', this._searchNavHandler)
    const gTime = echarts.init(this.$refs.gTime)
    gTime.setOption({
      series: [{
        type: 'gauge',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: '95%',
        center: ['50%', '58%'],
        progress: {
          show: true,
          width: 8,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [{offset: 0, color: '#0e9ad8'}, {offset: 1, color: '#3fd2ff'}]
            }
          }
        },
        axisLine: {lineStyle: {width: 8, color: [[1, 'rgba(90,170,230,.15)']]}},
        axisTick: {show: false},
        splitLine: {show: false},
        axisLabel: {show: false},
        pointer: {show: false},
        anchor: {show: false},
        detail: {valueAnimation: true, fontSize: 20, color: '#eaf7ff', offsetCenter: [0, '0'], formatter: '{value}%'},
        data: [{value: this.timeElapsed}]
      }]
    })
    this.gaugeChart = gTime
    this.charts = [gTime]
  },
  beforeDestroy() {
    this.$root.$off('search:navigate', this._searchNavHandler)
    this.charts.forEach(c => c.dispose())
    this.charts = []
    this.gaugeChart = null
  },
  methods: {
    openRowDetail(row) {
      this.rowDetail = {show: true, data: row}
    },
    openQssDetail(q) {
      this.qssDetail = {show: true, data: q}
    },
    // AIP 行点击 → 弹窗展示原始数据全部字段（左：基础信息，右：三轮次竖排）
    openAipDetail(row) {
      const raw = this.aipList.find(a => a.no === row.no) ||
          {revs: {'Rev-': {}, 'Rev A': {}, 'Rev B': {}}}
      this.aipDetail = {show: true, data: raw, title: (row.no ? row.no + ' · ' : '') + (row.name || '')}
      this.$nextTick(() => this.flashBox('#aipDetailBox'))
    },
    // 单元格展示：数组多行 → 换行拼接；空 → '—'
    fmtCell(v) {
      if (Array.isArray(v)) {
        const lines = v.map(x => String(x).trim()).filter(Boolean)
        return lines.length ? lines.join('\n') : '—'
      }
      const s = String(v || '').trim()
      return s || '—'
    },
    // 全局检索 → 打开本组件弹窗并高亮 5s
    onSearchNavigate(item) {
      const a = item.action || {}
      if (a.dialog === 'rowDetail' && a.payload) {
        this.openRowDetail(a.payload)
        this.$nextTick(() => this.flashBox('#rowDetailBox'))
      }
      if (a.dialog === 'qssDetail' && a.payload) {
        this.openQssDetail(a.payload)
        this.$nextTick(() => this.flashBox('#qssDetailBox'))
      }
      if (a.contractTab) this.contractTab = a.contractTab
      if (a.monthTab) this.monthTab = a.monthTab
    },
    flashBox(selector) {
      const node = document.querySelector(selector)
      if (!node) return
      node.classList.add('search-highlight')
      setTimeout(() => node.classList.remove('search-highlight'), 5000)
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/panel.scss';

#pContract {
  left: 10px;
  top: 96px;
  width: 410px;
  height: 300px;

  h3 {
    display: flex;
    align-items: center;
    padding-right: 14px;

    .contract-tabs {
      flex: 1;
      align-self: stretch;
      display: flex;
      gap: 6px;
      margin-left: 6px;
      margin-right: 6px;

      .mini-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        border-radius: 0;
        background: none;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 2px;
        color: #8fc6ea90;
        transition: color 0.2s;

        &:hover {
          color: #cfe8ff;
        }

        &.active {
          color: #eaf7ff;
          background: none;
          box-shadow: inset 0 -2px 0 #00d5ff, 0 0 8px rgba(0, 213, 255, 0.35);
        }
      }
    }

    .h3-suffix {
      margin-left: 12px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #dff3ff;
    }
  }

  table.mini {
    th:nth-child(1) {
      width: 17%;
    }

    th:nth-child(2) {
      width: 25%;
    }

    th:nth-child(3) {
      width: 15%;
    }

    th:nth-child(4) {
      width: 21%;
    }

    th {
      padding: 6px 5px;
      font-size: 10.5px;
    }

    td {
      padding: 7px 3px;
      font-size: 12px;
    }

    .clickable-row {
      cursor: pointer;

      &:hover td {
        background: rgba(0, 200, 255, 0.12);
        color: #fff;
      }
    }
  }
}

#pAip {
  left: 10px;
  top: 410px;
  width: 410px;
  height: 310px;

  .aip-stats {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;

    .stat {
      flex: 1;
      padding: 5px 2px 4px;

      .n {
        font-size: 19px;
      }
    }
  }

  .aip-b-green {
    border-color: rgba(46, 255, 157, 0.35);
  }

  .aip-b-warn {
    border-color: rgba(255, 216, 61, 0.35);
  }

  .aip-b-bad {
    border-color: rgba(255, 82, 82, 0.4);
  }

  .aip-revs {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 9px;
    font-size: 10px;
    color: #7fb9e2;

    .rev-name {
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .rev-bar {
      height: 8px;
      border-radius: 2px;
    }

    .rev-num {
      color: #eaf7ff;
    }

    .bar-blue {
      background: linear-gradient(90deg, #2f7fd6, #3fd2ff);
    }

    .bar-yellow {
      background: linear-gradient(90deg, #e8b93c, #ffd83d);
    }

    .bar-dim {
      background: rgba(120, 170, 220, 0.25);
    }
  }

  table.mini {
    /* collapse 模式下 th 的 sticky 不生效，改用 separate */
    border-collapse: separate;
    border-spacing: 0;

    th:nth-child(1) {
      width: 42%;
    }

    th:nth-child(2) {
      width: 13%;
    }

    th:nth-child(3) {
      width: 13%;
    }

    th,
    td {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* 表头固定，不随表体滚动 */
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #072647;
    }

    .clickable-row {
      cursor: pointer;

      &:hover td {
        background: rgba(0, 200, 255, 0.12);
        color: #fff;
      }
    }
  }

  .aip-table-wrap {
    max-height: 190px;
    overflow-y: auto;
  }

  .aip-table-wrap::-webkit-scrollbar {
    width: 6px;
  }

  .aip-table-wrap::-webkit-scrollbar-thumb {
    background: rgba(0, 200, 255, 0.35);
    border-radius: 3px;
  }

  .aip-table-wrap::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.4);
  }
}

#pMonth {
  left: 10px;
  top: 734px;
  width: 410px;
  height: 330px;
}

.contract-row {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
}

.contract-detail {
  flex: 1.15;
}

.eot-val {
  color: #ffd83d;
}

.gauge-col {
  width: 124px;
  text-align: center;
}

.gauge-chart {
  height: 126px;
}

.gauge-info {
  font-size: 10.5px;
  color: #7fb9e2;
}

.grading-info {
  margin-top: 6px;
  font-size: 11px;
  color: #7fb9e2;
}

.grading-badge {
  margin-top: 4px;
}

.badge-sm {
  font-size: 10px;
}

.badge-xs {
  font-size: 9.5px;
}

.support-footer {
  margin-top: 10px;
  border-top: 1px solid rgba(90, 170, 230, 0.18);
  padding-top: 8px;
}

.qss-label {
  font-size: 11px;
  color: #5fb0dd;
  letter-spacing: 1.5px;
  margin-bottom: 15px;
}

.qss-chips {
  display: flex;
  justify-content: space-between;
}

.month-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.achv-icon {
  color: #2eff9d;
  font-weight: 700;
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
  height: 500px;
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
    }

    .dialog-close {
      color: #cfe8ff;
      font-size: 18px;
      cursor: pointer;

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

    .detail-table {
      table-layout: fixed;
      width: 100%;

      th {
        width: 300px;
        text-align: left;
        padding-right: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      td {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #eaf7ff;
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

.dialog-box-qss {
  width: 600px;
  height: 400px;
}

.dialog-box-aip {
  width: 1000px;
  height: 620px;

  .dialog-body {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    padding: 0;
  }

  .aip-left {
    width: 300px;
    flex: none;
    overflow-y: auto;
    padding: 14px 12px 14px 16px;
    border-right: 1px solid rgba(90, 170, 230, 0.18);
  }

  .aip-right {
    flex: 1;
    overflow-y: auto;
    padding: 14px 16px;
  }

  .aip-kv {
    padding: 6px 0;
    border-bottom: 1px dashed rgba(90, 170, 230, 0.18);

    .k {
      font-size: 10px;
      color: #5fb0dd;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }

    .v {
      font-size: 12px;
      color: #eaf7ff;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.6;
    }
  }

  .rev-block {
    margin-bottom: 14px;

    &:last-child {
      margin-bottom: 0;
    }

    .rev-block-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #7fe6ff;
      padding: 4px 8px;
      background: linear-gradient(90deg, rgba(0, 140, 230, 0.3), transparent 70%);
      border-left: 3px solid #00d5ff;
      margin-bottom: 6px;
    }

    .detail-table {
      th {
        width: 150px;
      }

      td {
        white-space: pre-wrap;
        word-break: break-word;
        color: #eaf7ff;
      }
    }
  }

  .aip-left::-webkit-scrollbar,
  .aip-right::-webkit-scrollbar {
    width: 6px;
  }

  .aip-left::-webkit-scrollbar-thumb,
  .aip-right::-webkit-scrollbar-thumb {
    background: rgba(0, 200, 255, 0.35);
    border-radius: 3px;
  }

  .aip-left::-webkit-scrollbar-track,
  .aip-right::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.4);
  }
}

.qchip-click {
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    color: #fff;
    border-color: #00d5ff;
    background: rgba(0, 140, 220, 0.3);
  }
}

.remarks-cell {
  white-space: normal !important;
}
</style>
