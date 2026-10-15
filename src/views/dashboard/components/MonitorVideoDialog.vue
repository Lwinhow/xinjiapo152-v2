<template>
  <div class="monitor-dialog-mask" v-show="visible" @click.stop>
    <div class="monitor-dialog">
      <div class="md-head">
        <span class="md-title">{{ monitor.name }}</span>
        <span class="md-close" @click="$emit('close')">✕</span>
      </div>
      <video class="md-video" :src="videoSrc" autoplay muted loop controls></video>
      <div class="md-info">
        <div class="md-row">
          <span class="k">Area</span>
          <b class="v">{{ monitor.area }}</b>
        </div>
        <div class="md-row">
          <span class="k">Device Status</span>
          <b class="v" :class="statusCls">{{ monitor.deviceStatus }}</b>
        </div>
        <div class="md-row">
          <span class="k">Anomaly Today</span>
          <b class="v" :class="{ alarm: monitor.anomalyDetected }">{{ monitor.anomalyDetected ? 'Yes' : 'No' }}</b>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MonitorVideoDialog',
  props: {
    visible: Boolean,
    monitor: {type: Object, default: () => ({})}
  },
  computed: {
    videoSrc() {
      return '/video/' + (this.monitor.id || 'm001') + '.mp4'
    },
    statusCls() {
      const s = this.monitor.deviceStatus
      if (s === 'Fault') return 'fault'
      if (s === 'Warning') return 'warning'
      return 'normal'
    }
  }
}
</script>

<style lang="scss" scoped>
.monitor-dialog-mask {
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

.monitor-dialog {
  width: 1000px;
  height: 700px;
  background: rgba(4, 30, 58, 0.96);
  border: 1px solid #00c8ff;
  border-radius: 6px;
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .md-head {
    height: 46px;
    padding: 0 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(0, 200, 255, 0.35);

    .md-title {
      color: #7fe6ff;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .md-close {
      color: #cfe8ff;
      font-size: 18px;
      cursor: pointer;

      &:hover {
        color: #fff;
      }
    }
  }

  .md-video {
    width: 100%;
    height: 480px;
    background: #02121f;
    object-fit: cover;
  }

  .md-info {
    flex: 1;
    padding: 10px 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    .md-row {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      padding: 0 12px;
      border-left: 1px solid rgba(0, 200, 255, 0.25);

      &:first-child {
        border-left: none;
      }

      .k {
        color: #7fb8e0;
        font-size: 13px;
      }

      .v {
        color: #cfe8ff;
        font-weight: 700;
        font-size: 17px;

        &.normal {
          color: #7dff9b;
        }

        &.warning {
          color: #ffd83d;
        }

        &.fault {
          color: #ff5252;
        }

        &.alarm {
          color: #ff5252;
        }
      }
    }
  }
}
</style>
