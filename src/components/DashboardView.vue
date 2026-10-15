<template>
  <div class="dashboard">
    <div ref="stage" class="stage">
      <!-- Top bar -->
      <div class="topbar">
        <div class="title">CONTRACT DE152</div>
        <div class="subtitle">DART PROJECT COMMAND DASHBOARD</div>
      </div>
      <div class="tabs">
        <div class="tab" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">OVERVIEW</div>
        <div class="tab" :class="{ active: activeTab === 'safety' }" @click="activeTab = 'safety'">SAFETY FOCUS</div>
      </div>
      <div id="monthSel">REPORTING MONTH<br/><b>Apr 2025</b> <span style="font-size: 11px">▼</span></div>
      <div id="clock">
        <div class="t">{{ timeStr }}</div>
        <div class="d">{{ dateStr }}</div>
      </div>

      <!-- Centre map -->
      <div id="mapwrap" ref="mapwrap">
        <div id="sitemap">
          <div id="maptitle">AERIAL SITE VIEW · Xilin Ave / ECP / TMCR (demo image)</div>
          <div id="markers">
            <div
                v-for="z in zones"
                :key="'z-' + z.name"
                class="zone"
                :class="zoneCls[z.risk]"
                :style="{ left: z.x + '%', top: z.y + '%', display: markerDisplay('progress') }"
                @mousemove="showZoneTip($event, z)"
                @mouseleave="hideTip"
            >
              <span class="pin">◈</span>{{ z.name }}<span class="pct">{{ z.pct }}%</span>
            </div>
            <div
                v-for="p in safetyPoints"
                :key="'s-' + p.name"
                class="smarker"
                :style="{ left: p.x + '%', top: p.y + '%', display: markerDisplay('safety') }"
                @mousemove="showSafetyTip($event, p)"
                @mouseleave="hideTip"
            >
              <i></i>
            </div>
          </div>
          <div id="maplegend">
            <b style="background: #2eff9d"></b>On Track
            <b style="background: #ffd83d"></b>At Risk
            <b style="background: #ff5252"></b>High Risk
            <b style="background: #ff9d2e"></b>Safety Event
          </div>
        </div>
      </div>

      <!-- L1 Main Contract -->
      <div class="panel" id="pContract">
        <h3>MAIN CONTRACT<span class="en">§1</span></h3>
        <div style="display: flex; gap: 10px; margin-bottom: 4px">
          <div style="flex: 1.15">
            <div class="kv"><span class="k">Contract No.</span><span class="v hl">DE152</span></div>
            <div class="kv"><span class="k">Contractor</span><span class="v">SB Construction JV</span></div>
            <div class="kv"><span class="k">Contract Sum</span><span class="v hl">S$ 1.65 B</span></div>
            <div class="kv"><span class="k">Commencement</span><span class="v">01 Jun 2023</span></div>
            <div class="kv"><span class="k">Completion</span><span class="v">30 Nov 2029</span></div>
            <div class="kv"><span class="k">EOT Granted</span><span class="v" style="color: #ffd83d">+62 days</span>
            </div>
            <div class="kv"><span class="k">Project Status</span><span class="v"><span
                class="badge b-blue">CONSTRUCTION</span></span></div>
          </div>
          <div style="width: 118px; text-align: center">
            <div ref="gTime" class="chart" style="height: 126px"></div>
            <div style="font-size: 10.5px; color: #7fb9e2">Time Elapsed</div>
            <div style="margin-top: 6px; font-size: 11px; color: #7fb9e2">
              Performance Grading<br/>
              <span class="badge b-good" style="margin-top: 4px">GOOD</span>
            </div>
          </div>
        </div>
        <div class="kv"><span class="k">Project Team</span><span class="v">PL 1 · PO 2 · Members 12</span></div>
        <div class="kv"><span class="k">Near Miss Reported (cum.)</span><span class="v">18</span></div>
      </div>

      <!-- L3 Monthly Review -->
      <div class="panel" id="pMonth">
        <h3>MONTHLY REVIEW<span class="en">§8 ACHIEVEMENTS · §9 CONCERNS</span></h3>
        <div style="display: flex; gap: 6px; margin-bottom: 8px">
          <div class="mini-tab" :class="{ active: monthTab === 'achv' }" @click="monthTab = 'achv'">ACHIEVEMENTS (§8)
          </div>
          <div class="mini-tab" :class="{ active: monthTab === 'conc' }" @click="monthTab = 'conc'">CONCERNS (§9)</div>
        </div>
        <div v-show="monthTab === 'achv'">
          <div v-for="t in achievements" :key="t" class="li-item">
            <span style="color: #2eff9d; font-weight: 700">✔</span> {{ t }}
            <div class="sub">Apr 2025 · Verified</div>
          </div>
        </div>
        <div v-show="monthTab === 'conc'">
          <div v-for="c in concerns" :key="c.t" class="li-item">
            <span class="badge" :class="c.cls" style="font-size: 9.5px">{{ c.lv }}</span> {{ c.t }}
            <div class="sub">Mitigation: {{ c.m }}</div>
          </div>
        </div>
      </div>

      <!-- L3 Progress Risk -->
      <div class="panel" id="pRisk">
        <h3>PROGRESS RISK<span class="en">§12 RISK OF DELAY</span></h3>
        <div style="display: flex; gap: 8px; margin-bottom: 6px">
          <div class="stat" style="flex: 1; border-color: rgba(255, 82, 82, 0.4)">
            <div class="n bad">2</div>
            <div class="l">High Risk<br/>(≥ 20 days)</div>
          </div>
          <div class="stat" style="flex: 1; border-color: rgba(255, 216, 61, 0.4)">
            <div class="n warn">3</div>
            <div class="l">At Risk<br/>(5–19 days)</div>
          </div>
          <div class="stat" style="flex: 1; border-color: rgba(46, 255, 157, 0.35)">
            <div class="n good">12</div>
            <div class="l">On Track<br/>(＜ 5 days)</div>
          </div>
        </div>
        <table class="mini">
          <tr>
            <th style="width: 44%">TOP RISKS</th>
            <th>AREA</th>
            <th>DELAY</th>
            <th>TREND</th>
          </tr>
          <tr v-for="r in riskRows" :key="r.name">
            <td>{{ r.name }}</td>
            <td>{{ r.area }}</td>
            <td :style="{ color: r.delayColor }">{{ r.delay }}</td>
            <td :class="r.trendCls">{{ r.trend }}</td>
          </tr>
        </table>
      </div>

      <!-- R1 Safety -->
      <div class="panel" id="pSafety">
        <h3>SAFETY &amp; ENVIRONMENT<span class="en">§14.1–14.7</span></h3>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
          <div
              style="flex: 1; text-align: center; background: rgba(8, 50, 95, 0.45); border: 1px solid rgba(46, 255, 157, 0.35); border-radius: 4px; padding: 4px">
            <div
                style="font-size: 23px; font-weight: 800; color: #2eff9d; text-shadow: 0 0 12px rgba(46, 255, 157, 0.6)">
              128
            </div>
            <div style="font-size: 10px; color: #7fb9e2">Days since last<br/>MOM-reportable accident</div>
          </div>
          <div
              style="flex: 1; text-align: center; background: rgba(8, 50, 95, 0.45); border: 1px solid rgba(255, 157, 46, 0.35); border-radius: 4px; padding: 4px">
            <div style="font-size: 23px; font-weight: 800; color: #ff9d2e">S$ 2,000</div>
            <div style="font-size: 10px; color: #7fb9e2">Vector control fines (month)<br/><span class="down">▼ S$ 1,000 MoM</span>
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px">
          <div class="stat">
            <div class="n warn">1</div>
            <div class="l">Utility Damage</div>
            <div class="d flat">— MoM</div>
          </div>
          <div class="stat">
            <div class="n">1</div>
            <div class="l">Non-MOM Incident</div>
            <div class="d flat">— MoM</div>
          </div>
          <div class="stat">
            <div class="n bad">2</div>
            <div class="l">MOM ≥ 3d MC</div>
            <div class="d up">▲ 1 MoM</div>
          </div>
          <div class="stat">
            <div class="n">0</div>
            <div class="l">MOM ＜ 3d MC</div>
            <div class="d flat">— MoM</div>
          </div>
          <div class="stat">
            <div class="n">0</div>
            <div class="l">Env. Infringement</div>
            <div class="d down">▼ 1 MoM</div>
          </div>
          <div class="stat">
            <div class="n good">11</div>
            <div class="l">Near Miss (Cat A)</div>
            <div class="d up">▲ 2 MoM</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 7px">
          <div class="kbox"><span>MANDAYS LOST · MONTH (§14.3)</span><b>36</b></div>
          <div class="kbox"><span>MANDAYS LOST · CUM. (§14.4)</span><b style="color: #3fd2ff">214</b></div>
        </div>
      </div>

      <!-- R2 Cost & Claims -->
      <div class="panel" id="pCost">
        <h3>COST &amp; CLAIMS<span class="en">§13</span></h3>
        <div ref="chCost" class="chart" style="height: 130px"></div>
        <div id="srows">
          <div v-for="row in claimsRows" :key="row.name" class="srow">
            <span class="nm">{{ row.name }}</span><span class="tt">{{ row.total }}</span>
            <div class="sbar">
              <div v-for="(seg, i) in row.segs" :key="i" :class="'sg' + (i + 1)" :style="{ width: seg.w + '%' }">
                {{ seg.lab }}
              </div>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 3px 2px 0">
          <div style="font-size: 9.5px; color: #6fa8d0; white-space: nowrap">
            <span style="color: #2f7fd6">■</span>Submitted&nbsp;
            <span style="color: #e8b93c">■</span>Under Review&nbsp;
            <span style="color: #2ecc8f">■</span>Approved·Closed
          </div>
          <div style="display: flex; gap: 4px">
            <div class="mini-tab" :class="{ active: claimsMode === 'count' }"
                 style="flex: none; padding: 2px 10px; font-size: 9.5px" @click="claimsMode = 'count'">COUNT
            </div>
            <div class="mini-tab" :class="{ active: claimsMode === 'amt' }"
                 style="flex: none; padding: 2px 10px; font-size: 9.5px" @click="claimsMode = 'amt'">AMOUNT S$M
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 6px">
          <div class="kbox"><span>NCN THIS MONTH (§13.8)</span><b>5</b></div>
          <div class="kbox"><span>NCN CUMULATIVE</span><b style="color: #3fd2ff">14</b></div>
        </div>
      </div>

      <!-- R3 Supporting Contracts -->
      <div class="panel" id="pSupport">
        <h3>SUPPORTING CONTRACTS<span class="en">§2–6 · QSS TEAM</span></h3>
        <table class="mini nowrap">
          <tr>
            <th style="width: 17%">ROLE</th>
            <th style="width: 25%">CONTRACT</th>
            <th style="width: 15%">PIC</th>
            <th style="width: 21%">STATUS</th>
            <th>GRADING</th>
          </tr>
          <tr v-for="s in supportRows" :key="s.role">
            <td>{{ s.role }}</td>
            <td>{{ s.contract }}</td>
            <td>{{ s.pic }}</td>
            <td><span class="badge" :class="s.badgeCls" style="font-size: 10px">{{ s.status }}</span></td>
            <td :style="{ color: s.gradeColor }">{{ s.grading }}</td>
          </tr>
        </table>
        <div
            style="display: flex; align-items: center; gap: 10px; margin-top: 8px; border-top: 1px solid rgba(90, 170, 230, 0.18); padding-top: 8px">
          <div style="flex: 1">
            <div style="font-size: 9.5px; color: #5fb0dd; letter-spacing: 1.5px; margin-bottom: 5px">QSS POSTS (§2.1)
            </div>
            <div><span v-for="q in qssPosts" :key="q" class="qchip">{{ q }}</span></div>
          </div>
          <div
              style="text-align: center; background: rgba(8, 50, 95, 0.45); border: 1px solid rgba(0, 180, 255, 0.25); border-radius: 4px; padding: 5px 14px">
            <div style="font-size: 18px; font-weight: 800; color: #eaf7ff; line-height: 1.1">2</div>
            <div style="font-size: 9px; color: #7fb9e2; letter-spacing: 0.5px">NEAR MISS<br/>THIS MONTH</div>
          </div>
        </div>
      </div>

      <!-- Bottom progress -->
      <div class="panel" id="pProgress">
        <h3>OVERALL PROGRESS<span class="en">§16</span></h3>
        <div style="display: flex; height: 100%">
          <div
              style="width: 210px; display: flex; flex-direction: column; justify-content: center; gap: 6px; padding-right: 8px; border-right: 1px solid rgba(90, 170, 230, 0.18)">
            <div style="font-size: 11px; color: #7fb9e2; letter-spacing: 1px">ACTUAL / PLANNED</div>
            <div>
              <span
                  style="font-size: 34px; font-weight: 800; color: #3fd2ff; text-shadow: 0 0 14px rgba(63, 210, 255, 0.6)">42.6%</span>
              <span style="font-size: 15px; color: #8fc6ea; font-weight: 700"> / 48.7%</span>
            </div>
            <div style="font-size: 11.5px; color: #ff6b6b">▼ Variance −6.1% (≈ 4.2 wks behind)</div>
            <div style="font-size: 10.5px; color: #6fa8d0">Early −8.0% · Late −4.5% envelope</div>
          </div>
          <div style="flex: 1">
            <div ref="chProgress" class="chart" style="height: 166px"></div>
          </div>
        </div>
      </div>

      <!-- Tooltip -->
      <div class="tooltip" v-show="tooltip.show" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
        <div class="tt-t">{{ tooltip.warn ? '⚠ ' : '' }}{{ tooltip.title }}</div>
        <div v-for="(r, i) in tooltip.rows" :key="i">
          <template v-if="r.k">{{ r.k }}:</template>
          <b :style="r.hl ? { color: '#3fd2ff' } : null">{{ r.v }}</b>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'DashboardView',
  data() {
    return {
      activeTab: 'overview',
      monthTab: 'achv',
      claimsMode: 'count',
      timeStr: '--:--:--',
      dateStr: '--',
      zoneCls: {'On Track': 'z-green', 'At Risk': 'z-yellow', 'High Risk': 'z-red'},
      // §12 zones on aerial image
      zones: [
        {
          x: 36,
          y: 40,
          name: 'FB2',
          el: 'Tunnel box / pump room',
          pct: 38,
          risk: 'On Track',
          reason: 'No Issues',
          remark: ''
        },
        {
          x: 55,
          y: 30,
          name: 'Xilin Flyover',
          el: 'Pier & PSC beam',
          pct: 62,
          risk: 'High Risk',
          reason: 'Service Diversions',
          remark: 'PowerGrid diversion pending approval'
        },
        {
          x: 76,
          y: 18,
          name: 'Canal Bridge (CADC)',
          el: 'Widening sec. 3',
          pct: 45,
          risk: 'At Risk',
          reason: 'Stakeholders Requirements',
          remark: 'Rebar supply delay'
        },
        {
          x: 47,
          y: 66,
          name: 'Tunnel East',
          el: 'Excavation & struts',
          pct: 21,
          risk: 'At Risk',
          reason: 'Design Clearances',
          remark: ''
        },
        {
          x: 70,
          y: 62,
          name: 'FB3 Underpass',
          el: 'U-trough structure',
          pct: 33,
          risk: 'High Risk',
          reason: 'Site Constraints',
          remark: 'Dewatering impact, traffic staging conflict'
        }
      ],
      // §14.1 / §14.7 safety events
      safetyPoints: [
        {
          x: 58,
          y: 44,
          name: 'Utility Damage — 75mm gas pipe',
          cat: 'Utility Damage',
          date: '21 Mar 2025',
          stake: 'SPPG',
          cost: 'Repair S$ 5,000'
        },
        {
          x: 26,
          y: 70,
          name: 'Vector Control — mosquito breeding',
          cat: 'Vector Control',
          date: '10 Apr 2025',
          stake: 'NEA',
          cost: 'Fine S$ 2,000'
        }
      ],
      // §8 achievements + §9 concerns
      achievements: [
        'Tunnel T2 roof slab cast — 2 wks ahead of schedule',
        'Xilin Flyover Span 5 PSC beam launching completed',
        'CADC east bank cofferdam closed',
        'ECP night traffic staging Phase 3 completed',
        'B2 bridge piles completed (48 nos.)'
      ],
      concerns: [
        {
          lv: 'MAJOR',
          cls: 'b-bad',
          t: 'FB3 traffic staging conflicts with live ECP lanes',
          m: 'Phased staging with LTA TMC; added night work windows'
        },
        {
          lv: 'MODERATE',
          cls: 'b-warn',
          t: 'PowerGrid diversion approval lag affects Flyover pier',
          m: 'Escalated to SO; approval expected Jun'
        },
        {lv: 'MINOR', cls: 'b-good', t: 'Monsoon slows CADC spoil removal', m: 'Additional trucks; re-sequenced works'}
      ],
      riskRows: [
        {
          name: 'Utility diversion approval lag',
          area: 'Xilin',
          delay: '28 d',
          delayColor: '#ff6b6b',
          trend: '↑',
          trendCls: 'up'
        },
        {
          name: 'Dewatering impact on excavation',
          area: 'FB3',
          delay: '22 d',
          delayColor: '#ff6b6b',
          trend: '↑',
          trendCls: 'up'
        },
        {
          name: 'Rebar supply delay',
          area: 'Canal Br.',
          delay: '12 d',
          delayColor: '#ffd83d',
          trend: '→',
          trendCls: 'flat'
        },
        {
          name: 'Design change detailing',
          area: 'Tunnel E.',
          delay: '9 d',
          delayColor: '#ffd83d',
          trend: '→',
          trendCls: 'flat'
        },
        {name: 'Manpower shortage', area: 'FB2', delay: '6 d', delayColor: '#ffd83d', trend: '↓', trendCls: 'down'}
      ],
      supportRows: [
        {
          role: 'QP(S)',
          contract: 'DE152-QPS-01',
          pic: 'J. Tan',
          status: 'ON-SITE',
          badgeCls: 'b-good',
          grading: 'Excellent',
          gradeColor: '#2eff9d'
        },
        {
          role: 'QSS',
          contract: '5 posts',
          pic: 'W. Xu',
          status: 'ON-SITE',
          badgeCls: 'b-good',
          grading: 'Good',
          gradeColor: '#3fd2ff'
        },
        {
          role: 'AC',
          contract: 'DE152-AC-01',
          pic: 'K. Lim',
          status: 'ON-SITE',
          badgeCls: 'b-good',
          grading: 'Good',
          gradeColor: '#3fd2ff'
        },
        {
          role: 'RI',
          contract: 'DE152-RI-01',
          pic: 'S. Chen',
          status: 'ON-SITE',
          badgeCls: 'b-good',
          grading: 'Satisfactory',
          gradeColor: '#ffd83d'
        },
        {
          role: 'IR',
          contract: 'DE152-IR-01',
          pic: 'R. Zhou',
          status: 'ON-SITE',
          badgeCls: 'b-good',
          grading: 'Good',
          gradeColor: '#3fd2ff'
        },
        {
          role: 'INSTR.',
          contract: 'DE152-INS-01',
          pic: 'M. Zhao',
          status: 'PART-TIME',
          badgeCls: 'b-warn',
          grading: 'Satisfactory',
          gradeColor: '#ffd83d'
        }
      ],
      qssPosts: ['QPS-C', 'QPS-G', 'RE', 'RTO', 'QA/QC'],
      // §13 claims: [name, [submitted, under review, approved]]
      claimsData: {
        count: [['WSO', [6, 8, 4]], ['RFV / VO', [8, 11, 8]], ['Notified Claim', [2, 2, 1]], ['NCN', [5, 6, 3]]],
        amt: [['WSO', [2.1, 4.6, 3.8]], ['RFV / VO', [6.2, 9.8, 12.4]], ['Notified Claim', [3.5, 2.2, 1.1]], ['NCN', [0.4, 0.9, 0.6]]]
      },
      tooltip: {show: false, x: 0, y: 0, title: '', warn: false, rows: []},
      timer: null,
      charts: []
    }
  },
  computed: {
    claimsRows() {
      const isAmt = this.claimsMode === 'amt'
      return this.claimsData[this.claimsMode].map(([name, segs]) => {
        const total = segs.reduce((a, b) => a + b, 0)
        return {
          name,
          total: isAmt ? total.toFixed(1) : String(total),
          segs: segs.map(v => {
            const w = (v / total) * 100
            return {w, lab: w > 11 ? (isAmt ? v.toFixed(1) : String(v)) : ''}
          })
        }
      })
    }
  },
  mounted() {
    this.tick()
    this.timer = setInterval(this.tick, 1000)
    window.addEventListener('resize', this.fit)
    this.$nextTick(() => {
      this.initCharts()
      this.fit()
    })
  },
  beforeDestroy() {
    clearInterval(this.timer)
    window.removeEventListener('resize', this.fit)
    this.charts.forEach(c => c.dispose())
    this.charts = []
  },
  methods: {
    tick() {
      const n = new Date()
      const p = x => String(x).padStart(2, '0')
      this.timeStr = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`
      this.dateStr = n.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase()
    },
    fit() {
      const sx = window.innerWidth / 1920
      const sy = window.innerHeight / 1080
      if (this.$refs.stage) {
        this.$refs.stage.style.transform = `translate(-50%,-50%) scale(${sx},${sy})`
      }
    },
    markerDisplay(type) {
      return this.activeTab === 'safety' && type !== 'safety' ? 'none' : 'flex'
    },
    showTip(e, title, warn, rows) {
      const r = this.$refs.mapwrap.getBoundingClientRect()
      const sRect = this.$refs.stage.getBoundingClientRect()
      const sx = sRect.width / 1920
      const sy = sRect.height / 1080
      let x = (e.clientX - r.left) / sx + 16
      let y = (e.clientY - r.top) / sy + 10
      if (x > 730) x -= 310
      this.tooltip = {show: true, x, y, title, warn, rows}
    },
    showZoneTip(e, z) {
      const rows = [
        {k: 'Element', v: z.el},
        {k: 'Completion', v: z.pct + '%', hl: true},
        {k: 'Risk of Delay', v: z.risk},
        {k: 'Reason', v: z.reason}
      ]
      if (z.remark) rows.push({k: 'Remarks', v: z.remark})
      this.showTip(e, z.name, false, rows)
    },
    showSafetyTip(e, p) {
      this.showTip(e, p.name, true, [
        {k: 'Type', v: p.cat},
        {k: 'Date', v: p.date},
        {k: 'Stakeholder', v: p.stake},
        {k: '', v: p.cost}
      ])
    },
    hideTip() {
      this.tooltip.show = false
    },
    baseAxis() {
      return {
        axisLine: {lineStyle: {color: 'rgba(120,190,240,.4)'}},
        axisLabel: {color: '#8fc6ea', fontSize: 10},
        splitLine: {lineStyle: {color: 'rgba(90,170,230,.12)'}}
      }
    },
    initCharts() {
      // Time elapsed gauge
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
          data: [{value: 47}]
        }]
      })

      // §13.3 payment S-curve
      const chCost = echarts.init(this.$refs.chCost)
      chCost.setOption({
        grid: {left: 50, right: 8, top: 26, bottom: 18},
        legend: {textStyle: {color: '#8fc6ea', fontSize: 9.5}, top: 0, right: 0, itemWidth: 10, itemHeight: 7},
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(4,30,58,.95)',
          borderColor: '#00c8ff',
          textStyle: {color: '#cfe8ff', fontSize: 11}
        },
        xAxis: {type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr'], ...this.baseAxis()},
        yAxis: {type: 'value', name: 'S$ M', nameTextStyle: {color: '#8fc6ea', fontSize: 9}, ...this.baseAxis()},
        series: [
          {
            name: 'Monthly Claim',
            type: 'bar',
            data: [28, 35, 46, 52],
            itemStyle: {color: 'rgba(14,154,216,.85)', borderRadius: [2, 2, 0, 0]},
            barWidth: '36%'
          },
          {
            name: 'Cumulative',
            type: 'line',
            data: [540, 575, 621, 673],
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {color: '#3fd2ff', width: 2},
            itemStyle: {color: '#3fd2ff'},
            areaStyle: {color: 'rgba(63,210,255,.12)'}
          },
          {
            name: 'Contract Sum 1650',
            type: 'line',
            data: [1650, 1650, 1650, 1650],
            symbol: 'none',
            lineStyle: {color: '#ffd83d', type: 'dashed', width: 1.5},
            itemStyle: {color: '#ffd83d'}
          }
        ]
      })

      // §16 overall progress
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const chProgress = echarts.init(this.$refs.chProgress)
      chProgress.setOption({
        grid: {left: 40, right: 12, top: 28, bottom: 20},
        legend: {textStyle: {color: '#8fc6ea', fontSize: 10}, top: 0, itemWidth: 12, itemHeight: 8},
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(4,30,58,.95)',
          borderColor: '#00c8ff',
          textStyle: {color: '#cfe8ff', fontSize: 11}
        },
        xAxis: {type: 'category', data: months, boundaryGap: false, ...this.baseAxis()},
        yAxis: {
          type: 'value',
          max: 100,
          name: '%',
          nameTextStyle: {color: '#8fc6ea', fontSize: 10}, ...this.baseAxis()
        },
        series: [
          {
            name: 'Early',
            type: 'line',
            data: [4, 9, 16, 25, 34, 44, 54, 63, 71, 79, 87, 100],
            smooth: true,
            symbol: 'none',
            lineStyle: {color: 'rgba(46,255,157,.55)', width: 1.5, type: 'dashed'},
            itemStyle: {color: '#2eff9d'}
          },
          {
            name: 'Late',
            type: 'line',
            data: [2, 5, 10, 17, 25, 34, 44, 54, 64, 74, 86, 100],
            smooth: true,
            symbol: 'none',
            lineStyle: {color: 'rgba(255,216,61,.55)', width: 1.5, type: 'dashed'},
            itemStyle: {color: '#ffd83d'}
          },
          {
            name: 'Actual',
            type: 'line',
            data: [3, 7, 13, 21, null, null, null, null, null, null, null, null],
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
            data: [3, 7, 13, 21, 30, 39, 49, 59, 68, 77, 87, 100],
            smooth: true,
            symbol: 'none',
            lineStyle: {color: 'rgba(160,200,255,.8)', width: 1.5},
            itemStyle: {color: '#a0c8ff'}
          }
        ]
      })

      this.charts = [gTime, chCost, chProgress]
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #020d1a;
  text-align: left;
}

.stage {
  width: 1920px;
  height: 1080px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
  background: radial-gradient(ellipse at 50% 42%, rgba(0, 90, 160, 0.28), transparent 60%),
  linear-gradient(180deg, #031224 0%, #041a30 55%, #020d1a 100%);
  font-family: 'Segoe UI', Arial, 'Microsoft YaHei', sans-serif;
  color: #cfe8ff;
}

/* ---------- Top bar ---------- */
.topbar {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 78px;
  z-index: 30;
  background: linear-gradient(180deg, rgba(4, 40, 80, 0.95), rgba(3, 22, 44, 0.75) 70%, transparent);
  border-bottom: 1px solid rgba(0, 200, 255, 0.25);

  .title {
    position: absolute;
    left: 50%;
    top: 8px;
    transform: translateX(-50%);
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 6px;
    color: #eaf7ff;
    text-shadow: 0 0 18px rgba(0, 200, 255, 0.9), 0 0 40px rgba(0, 150, 255, 0.5);
    white-space: nowrap;
  }

  .subtitle {
    position: absolute;
    left: 50%;
    top: 46px;
    transform: translateX(-50%);
    font-size: 12px;
    letter-spacing: 4px;
    color: #5fb9e8;
  }
}

.tabs {
  position: absolute;
  left: 50%;
  top: 64px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 31;
}

.tab {
  padding: 4px 26px;
  font-size: 14px;
  letter-spacing: 2px;
  color: #8fc6ea;
  cursor: pointer;
  background: linear-gradient(180deg, rgba(10, 60, 110, 0.85), rgba(6, 34, 66, 0.85));
  border: 1px solid rgba(0, 190, 255, 0.35);
  border-radius: 3px;
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%);
  transition: 0.2s;

  &:hover {
    color: #fff;
    border-color: #00d5ff;
  }

  &.active {
    color: #02121f;
    font-weight: 700;
    background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
    box-shadow: 0 0 14px rgba(0, 200, 255, 0.7);
  }
}

.mini-tab {
  flex: 1;
  text-align: center;
  padding: 5px 0;
  font-size: 11.5px;
  letter-spacing: 1.5px;
  font-weight: 600;
  color: #8fc6ea;
  cursor: pointer;
  border: 1px solid rgba(0, 190, 255, 0.35);
  border-radius: 3px;
  background: rgba(8, 50, 95, 0.4);
  transition: 0.2s;

  &:hover {
    color: #fff;
    border-color: #00d5ff;
  }

  &.active {
    color: #02121f;
    background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
  }
}

#clock {
  position: absolute;
  right: 28px;
  top: 18px;
  text-align: right;
  z-index: 31;

  .t {
    font-size: 22px;
    font-weight: 700;
    color: #bfeaff;
    letter-spacing: 2px;
  }

  .d {
    font-size: 12px;
    color: #6fb7e2;
    letter-spacing: 1px;
    margin-top: 2px;
  }
}

#monthSel {
  position: absolute;
  left: 28px;
  top: 20px;
  z-index: 31;
  font-size: 12px;
  color: #8fc6ea;
  letter-spacing: 1px;

  b {
    color: #eaf7ff;
    font-size: 16px;
  }
}

/* ---------- Panels ---------- */
.panel {
  position: absolute;
  background: linear-gradient(160deg, rgba(6, 38, 72, 0.86), rgba(3, 20, 40, 0.9));
  border: 1px solid rgba(0, 180, 255, 0.28);
  border-radius: 4px;
  z-index: 20;
  box-shadow: inset 0 0 24px rgba(0, 120, 220, 0.12);
  padding: 34px 12px 10px;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 4px;
    pointer-events: none;
    background: linear-gradient(90deg, #00d5ff, transparent 18%) top left / 60px 2px no-repeat,
    linear-gradient(180deg, #00d5ff, transparent 18%) top left / 2px 60px no-repeat,
    linear-gradient(-90deg, #00d5ff, transparent 18%) bottom right / 60px 2px no-repeat,
    linear-gradient(0deg, #00d5ff, transparent 18%) bottom right / 2px 60px no-repeat;
    opacity: 0.8;
  }

  h3 {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 28px;
    line-height: 28px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 2px;
    color: #dff3ff;
    padding-left: 14px;
    background: linear-gradient(90deg, rgba(0, 140, 230, 0.35), transparent 70%);
    border-bottom: 1px solid rgba(0, 180, 255, 0.2);

    .en {
      font-size: 10px;
      color: #5fb0dd;
      letter-spacing: 1px;
      margin-left: 8px;
      font-weight: 400;
    }

    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 14px;
      background: #00d5ff;
      margin-right: 8px;
      vertical-align: -2px;
      box-shadow: 0 0 8px #00d5ff;
    }
  }
}

/* ---------- Layout slots ---------- */
#pContract {
  left: 18px;
  top: 96px;
  width: 400px;
  height: 300px;
}

#pSupport {
  left: 18px;
  top: 408px;
  width: 400px;
  height: 310px;
}

#pMonth {
  left: 18px;
  top: 730px;
  width: 400px;
  height: 328px;
}

#pSafety {
  right: 18px;
  top: 96px;
  width: 400px;
  height: 300px;
}

#pRisk {
  right: 18px;
  top: 408px;
  width: 400px;
  height: 310px;
}

#pCost {
  right: 18px;
  top: 730px;
  width: 400px;
  height: 328px;
}

#pProgress {
  left: 50%;
  transform: translateX(-50%);
  bottom: 16px;
  width: 1064px;
  height: 210px;
  z-index: 21;
}

/* ---------- Centre map ---------- */
#mapwrap {
  position: absolute;
  left: 434px;
  top: 96px;
  width: 1052px;
  height: 742px;
  z-index: 10;
}

#sitemap {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  background: url('~@/assets/images/aerial.png') center / cover no-repeat #0a2233;
  border: 1px solid rgba(0, 180, 255, 0.15);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(2, 13, 26, 0.35), transparent 25%, transparent 80%, rgba(2, 13, 26, 0.45));
  }
}

.zone {
  position: absolute;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: rgba(4, 32, 60, 0.85);
  border: 1px solid rgba(0, 200, 255, 0.6);
  border-radius: 14px;
  padding: 4px 12px 4px 6px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #dff3ff;
  box-shadow: 0 0 12px rgba(0, 160, 255, 0.35);
  white-space: nowrap;

  .pin {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    background: rgba(0, 140, 220, 0.5);
    border: 1.5px solid currentColor;
  }

  .pct {
    font-size: 11px;
    color: #7fd8ff;
    font-weight: 700;
  }
}

.z-green {
  border-color: rgba(46, 255, 157, 0.7);

  .pin {
    color: #2eff9d;
  }
}

.z-yellow {
  border-color: rgba(255, 216, 61, 0.75);

  .pin {
    color: #ffd83d;
  }
}

.z-red {
  border-color: rgba(255, 82, 82, 0.8);

  .pin {
    color: #ff5252;
  }
}

.smarker {
  position: absolute;
  z-index: 16;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  cursor: pointer;

  i {
    display: block;
    width: 14px;
    height: 14px;
    margin: 4px;
    border-radius: 50%;
    background: #ff9d2e;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 12px #ff9d2e, 0 0 24px rgba(255, 157, 46, 0.6);
  }

  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 2px solid #ff9d2e;
    animation: ripple 2s infinite;
  }
}

@keyframes ripple {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}

#maplegend {
  position: absolute;
  left: 12px;
  bottom: 10px;
  font-size: 11px;
  color: #a9d8f5;
  z-index: 17;
  background: rgba(3, 24, 46, 0.85);
  border: 1px solid rgba(0, 180, 255, 0.25);
  border-radius: 3px;
  padding: 6px 10px;

  b {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin: 0 4px 0 10px;
    vertical-align: -1px;
  }
}

#maptitle {
  position: absolute;
  right: 12px;
  top: 10px;
  z-index: 17;
  font-size: 12px;
  color: #bfe6ff;
  background: rgba(3, 24, 46, 0.85);
  border: 1px solid rgba(0, 180, 255, 0.25);
  border-radius: 3px;
  padding: 5px 12px;
  letter-spacing: 1px;
}

.tooltip {
  position: absolute;
  z-index: 50;
  width: 290px;
  padding: 10px 12px;
  background: rgba(4, 30, 58, 0.96);
  border: 1px solid #00c8ff;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 0 18px rgba(0, 200, 255, 0.4);
  pointer-events: none;
  line-height: 1.7;

  .tt-t {
    color: #7fe6ff;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
}

/* ---------- Widgets ---------- */
.kv {
  display: flex;
  justify-content: space-between;
  padding: 3.5px 6px;
  font-size: 13px;
  border-bottom: 1px dashed rgba(90, 170, 230, 0.18);

  .k {
    color: #7fb9e2;
  }

  .v {
    color: #eaf7ff;
    font-weight: 600;
  }

  .v.hl {
    color: #3fd2ff;
  }
}

.badge {
  display: inline-block;
  padding: 1px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.b-good {
  background: rgba(46, 255, 157, 0.15);
  color: #2eff9d;
  border: 1px solid rgba(46, 255, 157, 0.5);
}

.b-warn {
  background: rgba(255, 216, 61, 0.12);
  color: #ffd83d;
  border: 1px solid rgba(255, 216, 61, 0.5);
}

.b-bad {
  background: rgba(255, 82, 82, 0.12);
  color: #ff6b6b;
  border: 1px solid rgba(255, 82, 82, 0.5);
}

.b-blue {
  background: rgba(63, 210, 255, 0.12);
  color: #3fd2ff;
  border: 1px solid rgba(63, 210, 255, 0.5);
}

.li-item {
  padding: 5px 8px;
  font-size: 12.5px;
  line-height: 1.5;
  border-bottom: 1px solid rgba(90, 170, 230, 0.14);

  .sub {
    color: #6fa8d0;
    font-size: 11px;
  }
}

.stat {
  text-align: center;
  padding: 7px 2px 5px;
  background: rgba(8, 50, 95, 0.45);
  border: 1px solid rgba(0, 180, 255, 0.22);
  border-radius: 4px;

  .n {
    font-size: 22px;
    font-weight: 800;
    color: #eaf7ff;
    text-shadow: 0 0 10px rgba(0, 200, 255, 0.6);
  }

  .n.warn {
    color: #ffd83d;
  }

  .n.bad {
    color: #ff6b6b;
  }

  .n.good {
    color: #2eff9d;
  }

  .l {
    font-size: 10px;
    color: #7fb9e2;
    margin-top: 2px;
    letter-spacing: 0.4px;
    line-height: 1.3;
  }

  .d {
    font-size: 10px;
    margin-top: 1px;
  }
}

.up {
  color: #ff6b6b;
}

.down {
  color: #2eff9d;
}

.flat {
  color: #7fb9e2;
}

.chart {
  width: 100%;
}

table.mini {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  table-layout: fixed;

  th {
    color: #5fb0dd;
    font-weight: 600;
    text-align: left;
    padding: 4px 5px;
    font-size: 10.5px;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(0, 180, 255, 0.3);
  }

  td {
    padding: 4.5px 5px;
    border-bottom: 1px solid rgba(90, 170, 230, 0.12);
    color: #d5ecff;
  }

  &.nowrap td {
    white-space: nowrap;
    font-size: 10.5px;
    padding: 5px 3px;
  }
}

/* stacked status bars */
.srow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
  font-size: 11.5px;

  .nm {
    width: 96px;
    color: #bfe0f5;
    text-align: right;
  }

  .tt {
    width: 30px;
    color: #eaf7ff;
    font-weight: 700;
  }
}

.sbar {
  flex: 1;
  display: flex;
  height: 14px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(8, 50, 95, 0.5);

  div {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #04121f;
    font-weight: 700;
  }
}

.sg1 {
  background: #2f7fd6;
}

.sg2 {
  background: #e8b93c;
}

.sg3 {
  background: #2ecc8f;
}

.qchip {
  display: inline-block;
  padding: 2px 9px;
  margin: 0 5px 4px 0;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #9fe4ff;
  border: 1px solid rgba(0, 190, 255, 0.4);
  border-radius: 10px;
  background: rgba(0, 140, 220, 0.12);
}

#pSafety {
  .stat {
    padding: 5px 2px 4px;

    .n {
      font-size: 19px;
    }
  }
}

.kbox {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(8, 50, 95, 0.45);
  border: 1px solid rgba(0, 180, 255, 0.25);
  border-radius: 4px;
  padding: 4px 10px;

  span {
    font-size: 9.5px;
    color: #7fb9e2;
    letter-spacing: 1px;
  }

  b {
    color: #eaf7ff;
    font-size: 15px;
  }
}
</style>
