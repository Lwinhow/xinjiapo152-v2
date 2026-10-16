<template>
  <div id="content" @click="closeTooltip">
    <!-- 视频流 -->
    <div id="player"></div>
    <!-- 大屏面板：上（标题栏）/ 左 / 右 / 下，透明叠加在视频流上方 -->
    <top-bar ref="topBar" :show-import="showImport" @import="importVisible = true"/>
    <left-panels/>
    <right-panels/>
    <bottom-panel/>
    <excel-import-dialog :visible="importVisible" @close="importVisible = false"
                         @uploaded="onUploaded"/>
    <monitor-video-dialog :visible="monitorDialog.show" :monitor="monitorDialog.info"
                          @close="monitorDialog.show = false"/>
    <desc-detail-dialog :visible="descDialog.show" :title="descDialog.title" :desc="descDialog.desc"
                        @close="descDialog.show = false"/>
    <!-- 标记点点击弹窗 -->
    <div class="tooltip" v-show="tooltip.show" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tt-t">{{ tooltip.title }}</div>
      <div v-if="tooltip.desc" class="tt-desc" @click.stop="openDescDialog">{{ tooltip.desc }}</div>
      <div v-for="(r, i) in tooltip.rows" :key="i" class="tt-row">
        <b v-if="r.k" class="tt-k">{{ r.k }}:</b>
        <span class="tt-v" :style="r.hl ? { color: '#3fd2ff' } : null">{{ r.v }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import config from "@/utils/config.js";
import TopBar from "./dashboard/components/TopBar.vue";
import LeftPanels from "./dashboard/components/LeftPanels.vue";
import RightPanels from "./dashboard/components/RightPanels.vue";
import BottomPanel from "./dashboard/components/BottomPanel.vue";
import MonitorVideoDialog from "./dashboard/components/MonitorVideoDialog.vue";
import {requestMarkers, notifyEngineReady, notifyDataReady, setScaleCo} from "@/utils/marker";
import DescDetailDialog from "@/views/dashboard/components/DescDetailDialog.vue";
import {db, loadVersion} from "@/data/store";

export default {
  name: "index",
  components: {
    DescDetailDialog,
    TopBar,
    LeftPanels,
    RightPanels,
    BottomPanel,
    MonitorVideoDialog,
    // 懒加载：上传弹窗会连带引入 SheetJS（约 700KB），而它只有运维会用到
    // （需带 ?import=1 访问），不该进大屏的主包
    ExcelImportDialog: () => import("@/views/dashboard/components/ExcelImportDialog.vue")
  },
  data() {
    return {
      db,
      importVisible: false,
      instanceId: config[process.env.NODE_ENV].playerExampleId,
      tooltip: {show: false, x: 0, y: 0, title: '', desc: '', rows: []},
      descDialog: {show: false, title: '', desc: ''},
      monitorDialog: {show: false, info: {}},
      flashNode: null,
      flashTimer: null
    };
  },
  async created() {
    try {
      await loadVersion();
    } catch (e) {
      console.error('[dashboard] 数据加载失败:', e);
    }
    notifyDataReady();
  },
  watch: {
    // 切换版本后重画当前 tab 的标记点；各面板走 computed 会自动更新
    'db.version'() {
      requestMarkers(this.currentTab());
    }
  },
  mounted() {
    // 缩放
    this.screenTransform();
    window.addEventListener('resize', () => {
      this.screenTransform();
    });
    this.initPlayer();
    // 用包装函数注册，避免多阶段编辑/HMR 期间注册到 undefined
    this._searchNavHandler = (item) => this.onSearchNavigate(item);
    this.$root.$on('search:navigate', this._searchNavHandler);
  },
  computed: {
    // 上传入口默认隐藏，需带 ?import=1 访问 —— 运维用途，业主大屏不露出
    showImport() {
      return /(?:^|[?&])import=1(?:&|$)/.test(window.location.search);
    }
  },
  methods: {
    currentTab() {
      return (this.$refs.topBar && this.$refs.topBar.activeTab) || 'overview';
    },
    // 上传成功后直接切到刚存的版本。db.versions 还是旧的，loadVersion 内部
    // 找不到该 id 时会自己重拉 index.json，所以这里不用先刷新清单。
    async onUploaded(version) {
      this.importVisible = false;
      try {
        await loadVersion(version);
      } catch (e) {
        console.error('[dashboard] 切换到新版本失败:', e);
      }
    },
    screenTransform() { // 拉伸缩放的方式
      let width = window.innerWidth;
      let height = window.innerHeight;
      let _obj = document.getElementById('content');
      let scale = `scale(${width / 1920},${height / 1080})`;
      document.documentElement.style.setProperty('--primary-scale', scale);
      _obj.style.transform = scale;
    },
    // 全局检索跳转（index.vue 作为协调者：切 tab / 开 monitor 弹窗 / 闪烁面板）
    onSearchNavigate(item) {
      const a = item.action || {};
      if (a.tab && this.$refs.topBar && a.tab !== this.$refs.topBar.activeTab) {
        this.$refs.topBar.switchTab(a.tab);
      }
      if (a.dialog === 'monitor' && a.payload) {
        this.monitorDialog = {show: true, info: a.payload};
        this.$nextTick(() => this.flash('.monitor-dialog'));
      }
      if (a.el || a.panel) {
        // 弹窗动画需等待 DOM 更新后再闪烁
        this.$nextTick(() => this.flash(a.el || `#${a.panel}`));
      }
    },
    // 目标元素高亮 5s（tr 无 box-shadow 兼容问题 → 闪其所有 td）
    flash(selector) {
      this.clearFlash()
      clearTimeout(this.flashTimer);
      const node = document.querySelector(selector);
      if (!node) return;
      const targets = node.tagName === 'TR' ? node.querySelectorAll('td') : [node];
      targets.forEach(t => t.classList.add('search-highlight'));
      this.flashNode = node;
      this.flashTimer = setTimeout(() => {
        targets.forEach(t => t.classList.remove('search-highlight'));
        if (this.flashNode === node) this.flashNode = null;
      }, 5000);
    },
    clearFlash() {
      if (!this.flashNode) return;
      const targets = this.flashNode.tagName === 'TR'
          ? this.flashNode.querySelectorAll('td')
          : [this.flashNode];
      targets.forEach(t => t.classList.remove('search-highlight'));
      this.flashNode = null;
    },
    showMarkerTooltip(objectId, res, gId) {
      const x = res.screenPosition[0]
      const y = res.screenPosition[1]
      switch (gId) {
        case 'zones':
          const zone = this.db.progressRisk.riskZones.find(d => d.name === objectId)
          if (zone) {
            const rows = [
              {k: 'Element', v: zone.el},
              {k: 'Completion', v: zone.pct + '%', hl: true},
              {k: 'Risk of Delay', v: zone.risk},
              {k: 'Reason', v: zone.reason}
            ]
            if (zone.remark) rows.push({k: 'Remarks', v: zone.remark})
            this.tooltip = {show: true, x, y, title: zone.name, rows}
            return
          }
          break;
        case 'safetyPoints':
          const sp = this.db.safety.safetyPoints.find(d => d.cat === objectId)
          if (sp) {
            const rows = []
            switch (sp.cat) {
              case 'Utility Damage':
                rows.push({k: 'Occurrence Date', v: sp['Occurrence Date']})
                rows.push({k: 'Time Taken for Repair (hrs)', v: sp['Time Taken for Repair (hrs)']})
                rows.push({k: 'Affected Stakeholder', v: sp['Affected Stakeholder']})
                rows.push({k: 'Repair Cost', v: sp['Repair Cost']})
                break
              case 'Non-MOM Incident':
                rows.push({k: 'Occurrence Date', v: sp['Occurrence Date']})
                rows.push({k: 'Category of Incident', v: sp['Category of Incident']})
                break
              case 'MOM ≥ 3d MC':
              case 'MOM < 3d MC':
                rows.push({k: 'Occurrence Date', v: sp['Occurrence Date']})
                rows.push({k: 'Mandays Lost', v: sp['Mandays Lost'] + ' days'})
                break
              case 'Env. Infringement':
                rows.push({k: 'Occurrence Date', v: sp['Occurrence Date']})
                rows.push({k: 'Affected Stakeholder', v: sp['Affected Stakeholder']})
                rows.push({k: 'Repair Cost', v: sp['Repair Cost']})
                break
              case 'Near Miss (Cat A)':
                rows.push({k: 'Location', v: sp['Location']})
                rows.push({k: 'Work Activity', v: sp['Work Activity']})
                rows.push({k: 'Type of Hazard', v: sp['Type of Hazard']})
                rows.push({k: 'Direct/Root Causes', v: sp['Direct/Root Causes']})
                rows.push({k: 'Corrective Action Taken', v: sp['Corrective Action Taken']})
                break
              case 'Vector Control':
                rows.push({k: 'Inspection Date', v: sp['Inspection Date']})
                rows.push({k: 'Any Findings?', v: sp['Any Findings?']})
                rows.push({k: 'Actions Taken', v: sp['Actions Taken']})
                rows.push({k: 'Fines Issued', v: sp['Fines Issued']})
                rows.push({k: 'Affected Stakeholder', v: sp['Affected Stakeholder']})
                break
            }
            this.tooltip = {show: true, x, y, title: sp.cat, desc: sp.desc, rows}
          }
          break;
        case 'Monitor':
          const mon = this.db.monitors.find(d => d.id === objectId)
          if (mon) {
            const rows = [
              {k: 'Area', v: mon.area},
              {k: 'Device Status', v: mon.deviceStatus},
              {k: 'Anomaly Today', v: mon.anomalyDetected ? 'Yes' : 'No'}
            ]
            this.tooltip = {show: true, x, y, title: mon.name, rows}
          }
          break;
        default:
          break;
      }
    },
    closeTooltip() {
      this.tooltip.show = false
    },
    openDescDialog() {
      this.descDialog = {show: true, title: this.tooltip.title, desc: this.tooltip.desc}
      this.tooltip.show = false
    },
    // 初始化视频
    initPlayer() {
      let host = config[process.env.NODE_ENV].playerPath;
      //api初始化完成的全局标识
      let _onReady = async () => {
        // __g.camera.set([-1307395.649785, 151807.119844, 410.65457, -44.207039, -83.231102, -0.000002], 2)
        let mask = MousePickMask.MouseClick | MousePickMask.MouseHover;
        fdapi.settings.setMousePickMask(mask);
        fdapi.settings.setMouseHoverTime(0.2);
        fdapi.settings.setEnableCameraMovingEvent(true);
        // 引擎就绪。若数据尚未到达，requestMarkers 只暂存，等 notifyDataReady 补齐
        notifyEngineReady()
        requestMarkers(this.currentTab())
        __g.camera.set([-1307502.429766,151466.012734,923.030703,-46.500324,-94.496506,-0.000002],3)
      };

      let _onEvent = async (event) => {
        // console.log(event)
        let eventType = event.eventtype; //事件类型 参考交互事件类型枚举对象
        let id = event.Id;
        let objectId = event.ObjectID;
        let groupId = event.GroupID;
        let type = event.Type;
        let userData = event.UserData;
        let objectLocation = event.MouseClickPoint; //当前点击位置
        // console.log(id)
        switch (eventType) {
          case "LeftMouseButtonClick":
            console.log(objectLocation)
            switch (type) {
              case 'CustomObj':
              case 'marker3d':
              case 'marker':
                if (groupId === 'Monitor') {
                  const mon = this.db.monitors.find(d => d.id === id)
                  if (mon) {
                    this.tooltip.show = false
                    this.monitorDialog = {show: true, info: mon}
                  }
                }
                break
              default:
                break
            }
            break;
          case "MouseHovered":
            switch (type) {
              case 'CustomObj':
              case 'marker3d':
              case 'marker':
                let res = await __g.coord.world2Screen(objectLocation[0], objectLocation[1], objectLocation[2])
                this.showMarkerTooltip(id, res, groupId)
                break
              default:
                break
            }
            break;
          case "CameraStopMove":
            //缩放线路
            __g.camera.get().then(async (res) => {
              setScaleCo(res.z)
            })
            //缩放标签，待确认
            break;
          default:
            break;
        }
      };
      let options = {
        //必选参数，网页显示视频流的dom节点id
        domId: "player",
        //必选参数，二次开发时必须指定，否则无法进行二次开发
        iid: this.instanceId,
        apiOptions: {
          //必选回调函数，视频流加载完成回调函数
          onReady: _onReady,
          //可选回调函数，视频流事件交互回调函数
          onEvent: _onEvent,
        },
        ui: {
          startupInfo: false, //默认值为true，初始化过程中是否显示左上角详细信息（如果不需要，直接去掉此属性即可）
          statusIndicator: false, //默认值为true，左上角闪烁的状态指示灯，可以从不同的颜色看出当前的状态
          statusButton: false, //默认值为false，是否在左下角显示信息按钮（如果不需要，直接去掉此属性即可）
          fullscreenButton: false, //默认值为false，是否在右下角显示全屏按钮（如果不需要，直接去掉此属性即可）
          homeButton: false, //默认值为false，是否在左下角显示“回到初始位置”按钮（如果不需要，直接去掉此属性即可）
          taskListBar: 1, //默认值为1，是否在下方显示“任务队列（API调用队列）”信息（0: 永不显示；1: 执行比较耗时的操作时显示；2: 一直显示）
          debugEventsPanel: false, //是否显示事件详细信息（仅用于调试）
          mainUI: false, //是否显示Cloud的UI工具栏，如果设置为true就显示，如果设置为false就隐藏，如果没有设置，就保持原状。
          campass: false, //是否显示指北针，如果设置为true就显示，如果设置为false就隐藏，如果没有设置，就保持原状。
        },
      };
      __g = new DigitalTwinPlayer(host, options).getAPI();
    },
  },
  beforeDestroy() {
    this.$root.$off('search:navigate', this._searchNavHandler);
    clearTimeout(this.flashTimer);
    this.clearFlash();
    __g.destroy();
  },
  destroyed() {
    __g.destroy();
  },
};
</script>

<style lang="scss" scoped>
#content {
  width: 1920px;
  height: 1080px;
  transform-origin: 0 0;
  position: relative; // 作为大屏面板绝对定位的基准
}

#player {
  width: 100%;
  height: 100%;
}

.tooltip {
  position: absolute;
  z-index: 50;
  max-width: 400px;
  padding: 10px 12px;
  background: rgba(4, 30, 58, 0.96);
  border: 1px solid #00c8ff;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 0 18px rgba(0, 200, 255, 0.4);
  pointer-events: none;
  line-height: 1.7;
  color: #cfe8ff;
  white-space: nowrap;

  .tt-t {
    color: #7fe6ff;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .tt-desc {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #8fbcd8;
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 4px;
    cursor: pointer;
    pointer-events: auto;

    &:hover {
      color: #3fd2ff;
      text-decoration: underline;
    }
  }

  .tt-row {
    display: flex;
    align-items: baseline;
  }

  .tt-k {
    font-weight: 700;
    color: #cfe8ff;
    margin-right: 8px;
  }

  .tt-v {
    color: #eaf7ff;
  }
}
</style>
<style lang="scss">
/* 全局检索高亮（绿色，5s，由 index.vue flash() 动态添加）
   注意：@keyframes 内不能写 !important（会被浏览器忽略） */
.search-highlight {
  animation: search-flash 2s ease-out forwards !important;
}

@keyframes search-flash {
  0% {
    box-shadow: 0 0 0 3px rgba(46, 255, 157, 0.95), 0 0 28px rgba(46, 255, 157, 0.7);
  }
  70% {
    box-shadow: 0 0 0 3px rgba(46, 255, 157, 0.5), 0 0 20px rgba(46, 255, 157, 0.35);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(46, 255, 157, 0), 0 0 0 0 rgba(46, 255, 157, 0);
  }
}

/* tr 行高亮：border-collapse 表格的 tr 不渲染 box-shadow，改用 td 背景 */
td.search-highlight {
  animation: search-cell-flash 2s ease-out forwards !important;
}

@keyframes search-cell-flash {
  0% {
    background-color: rgba(46, 255, 157, 0.45);
  }
  70% {
    background-color: rgba(46, 255, 157, 0.22);
  }
  100% {
    background-color: rgba(46, 255, 157, 0);
  }
}
</style>
