<template>
  <div class="desc-dialog-mask" v-show="visible" @click.stop>
    <div class="desc-dialog">
      <div class="dd-head">
        <span class="dd-title">{{ title }}</span>
        <span class="dd-close" @click="$emit('close')">✕</span>
      </div>
      <div class="dd-body">
        <div class="dd-content">{{ desc }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DescDetailDialog',
  props: {
    visible: Boolean,
    title: {type: String, default: ''},
    desc: {type: String, default: ''}
  }
}
</script>

<style lang="scss" scoped>
.desc-dialog-mask {
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

.desc-dialog {
  width: 600px;
  height: 400px;
  background: rgba(4, 30, 58, 0.96);
  border: 1px solid #00c8ff;
  border-radius: 6px;
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .dd-head {
    height: 44px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(0, 200, 255, 0.35);

    .dd-title {
      color: #7fe6ff;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .dd-close {
      color: #cfe8ff;
      font-size: 18px;
      cursor: pointer;

      &:hover {
        color: #fff;
      }
    }
  }

  .dd-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;

    .dd-content {
      color: #cfe8ff;
      font-size: 13px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  .dd-body::-webkit-scrollbar {
    width: 6px;
  }

  .dd-body::-webkit-scrollbar-thumb {
    background: rgba(0, 200, 255, 0.35);
    border-radius: 3px;
  }

  .dd-body::-webkit-scrollbar-track {
    background: rgba(0, 20, 40, 0.4);
  }
}
</style>
