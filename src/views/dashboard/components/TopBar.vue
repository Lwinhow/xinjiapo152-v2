<template>
  <div>
    <!-- Top bar -->
    <div class="topbar">
      <div class="title">CONTRACT DE152</div>
      <div class="subtitle">DART PROJECT COMMAND DASHBOARD</div>
    </div>
    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'overview' }" @click="switchTab('overview')">PROGRESS</div>
      <div class="tab" :class="{ active: activeTab === 'safety' }" @click="switchTab('safety')">SAFETY FOCUS</div>
      <div class="tab" :class="{ active: activeTab === 'monitor' }" @click="switchTab('monitor')">MONITOR</div>
    </div>
    <div id="monthSel" :class="{ 'month-click': versions.length > 1 }" @click.stop="toggleVersions">
      REPORTING MONTH<br/><b>{{ reportMonth }}</b>
      <span v-if="versions.length > 1" class="month-arrow" :class="{ open: versionsOpen }">▼</span>
      <div v-if="versionsOpen" class="version-list">
        <div v-for="v in versions" :key="v.id" class="version-item"
             :class="{ active: v.id === db.version }" @click.stop="pickVersion(v)">
          <div class="vi-head">
            <span class="vi-label">{{ v.label }}</span>
            <span v-if="v.id === db.version" class="vi-cur">CURRENT</span>
          </div>
          <div v-if="v.source" class="vi-src">{{ v.source }}</div>
        </div>
      </div>
    </div>
    <div class="import-entry" @click="$emit('import')">IMPORT EXCEL</div>
    <div class="topbar-left">
      <search-box/>
    </div>
    <!--    <div v-if="showImport" class="import-entry" @click="$emit('import')">IMPORT EXCEL</div>-->
    <div v-if="db.isPreview" class="preview-flag">PREVIEW</div>
    <div class="topbar-right">
      <div id="clock">
        <div class="t">{{ timeStr }}</div>
        <div class="d">{{ dateStr }}</div>
      </div>
    </div>
    <div class="head-panle-btn">
      <img alt="" class="imgButton" src="@/assets/images/icon12.png" title="Refresh" @click="refreshClick"/>
      <div class="obliqueLine"></div>
      <img alt="" class="imgButton" src="@/assets/images/icon11.png" title="HeadTitle" @click="clickHeadTitle"/>
      <div class="obliqueLine"></div>
      <img alt="" class="imgButton2" src="@/assets/images/icon133.png" title="LogOut" @click="logOut"/>
    </div>
  </div>
</template>

<script>
import {requestMarkers} from "@/utils/marker";
import {db, loadVersion} from "@/data/store";
import {logout} from "@/utils/auth";
import SearchBox from "./SearchBox.vue";

export default {
  name: 'DashboardTopBar',
  components: {SearchBox},
  props: {
    // 上传入口默认关闭，由 index.vue 显式打开（运维/管理用途，不对业主大屏露出）
    showImport: {type: Boolean, default: false}
  },
  data() {
    return {
      db,
      activeTab: 'overview',
      timeStr: '--:--:--',
      dateStr: '--',
      timer: null,
      versionsOpen: false
    }
  },
  computed: {
    versions() {
      return this.db.versions || []
    },
    // 版本身份以清单为准，与下拉里列的用同一个 label；
    // 文件自带的 meta.label 只在清单没写 label 时兜底
    reportMonth() {
      const cur = this.versions.find(v => v.id === this.db.version)
      return (cur && cur.label) || (this.db.meta && this.db.meta.label) || this.db.version || '—'
    }
  },
  mounted() {
    this.tick()
    this.timer = setInterval(this.tick, 1000)
    // #monthSel 自身 @click.stop，所以这里只需处理「点别处关掉」
    document.addEventListener('click', this.closeVersions)
  },
  beforeDestroy() {
    clearInterval(this.timer)
    this.timer = null
    document.removeEventListener('click', this.closeVersions)
  },
  methods: {
    refreshClick() { // 刷新
      location.reload();
    },
    clickHeadTitle() {
      __g.camera.set([-1307502.429766,151466.012734,923.030703,-46.500324,-94.496506,-0.000002],3)
    },
    logOut() {// 退出登录：清 session 后整页刷新，路由守卫会弹回登录页
      logout()
      location.reload()
    },
    tick() {
      const n = new Date()
      const p = x => String(x).padStart(2, '0')
      this.timeStr = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`
      this.dateStr = n.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase()
    },
    switchTab(tab) {
      this.activeTab = tab
      // 引擎或数据未就绪时只暂存，不会把已有点位清空
      requestMarkers(tab)
    },
    // 单版本时不可点（大屏常态，只有一次导入）
    toggleVersions() {
      if (this.versions.length < 2) return
      this.versionsOpen = !this.versionsOpen
    },
    closeVersions() {
      this.versionsOpen = false
    },
    // 换版本只需灌数据，重画点位由 index.vue 对 db.version 的 watch 负责
    async pickVersion(v) {
      this.versionsOpen = false
      if (v.id === this.db.version) return
      try {
        await loadVersion(v.id)
      } catch (e) {
        console.error('[dashboard] 版本切换失败:', e)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.import-entry {
  position: absolute;
  left: 180px;
  top: 26px;
  padding: 5px 12px;
  font-size: 12px;
  letter-spacing: 1px;
  color: #8fc6ea;
  border: 1px solid rgba(90, 170, 230, 0.45);
  border-radius: 2px;
  cursor: pointer;
  z-index: 31;

  &:hover {
    color: #eaf7ff;
    border-color: #3fd2ff;
    background: rgba(14, 154, 216, 0.25);
  }
}

.preview-flag {
  position: absolute;
  left: 330px;
  top: 26px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #041e3a;
  background: #ffd83d;
  border-radius: 2px;
  z-index: 31;
}

.topbar {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 100px;
  z-index: 30;
  background: linear-gradient(180deg, rgba(4, 40, 80, 0.95), rgba(3, 22, 44, 0.75) 70%, transparent);

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
    color: #fff;
    font-weight: 700;
    background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
    box-shadow: 0 0 14px rgba(0, 200, 255, 0.7);
  }
}

#monthSel {
  position: absolute;
  left: 20px;
  top: 20px;
  z-index: 31;
  font-size: 12px;
  color: #8fc6ea;
  letter-spacing: 1px;

  b {
    color: #eaf7ff;
    font-size: 16px;
  }

  .month-arrow {
    font-size: 11px;
    display: inline-block;
    transition: transform 0.2s;

    &.open {
      transform: rotate(180deg);
    }
  }

  &.month-click {
    cursor: pointer;

    &:hover b {
      color: #3fd2ff;
    }
  }
}

.version-list {
  margin-top: 6px;
  min-width: 320px;
  padding: 4px;
  background: rgba(4, 34, 64, 0.97);
  border: 1px solid rgba(0, 190, 255, 0.45);
  border-radius: 3px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
  cursor: default;
}

.version-item {
  padding: 7px 10px;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: rgba(14, 154, 216, 0.28);
  }

  &.active {
    background: rgba(14, 154, 216, 0.18);
    box-shadow: inset 2px 0 0 #3fd2ff;
  }

  .vi-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .vi-label {
    color: #eaf7ff;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .vi-cur {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #041e3a;
    background: #3fd2ff;
    padding: 1px 5px;
    border-radius: 2px;
  }

  .vi-src {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0;
    color: #6fb7e2;
    white-space: normal;
  }
}

.topbar-left {
  position: absolute;
  left: 340px;
  top: 20px;
  display: flex;
  align-items: flex-start;
  gap: 60px;
  z-index: 31;
}

.topbar-right {
  position: absolute;
  right: 20px;
  top: 18px;
  display: flex;
  align-items: flex-start;
  gap: 60px;
  z-index: 31;
}

#clock {
  text-align: right;

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

.head-panle-btn {
  position: absolute;
  right: 160px;
  top: 20px;
  display: flex;
  align-items: center;
  z-index: 40;
  gap: 10px;

  .obliqueLine {
    width: 2px;
    height: 25px;
    background: #0F6ED6;
    margin: 0 var(--px20);
    transform: rotate(-15deg);
  }

  .imgButton {
    width: 30px;
    //height:50px;
    cursor: pointer;
  }

  .imgButton2 {
    width: 25px;
    //height:50px;
    cursor: pointer;
  }
}
</style>
