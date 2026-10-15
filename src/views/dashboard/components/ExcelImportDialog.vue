<template>
  <div class="dialog-mask" v-show="visible" @click.self="$emit('close')">
    <div class="dialog-box import-box">
      <div class="dialog-head">
        <span class="dialog-title">IMPORT FROM EXCEL</span>
        <span class="dialog-close" @click="$emit('close')">✕</span>
      </div>

      <div class="ib-body">
        <!-- 文件选择 -->
        <div class="ib-row">
          <div class="ib-file" :class="{ picked: !!files.aip }">
            <div class="ib-name">AIP Tracking List</div>
            <div class="ib-hint">{{ files.aip ? files.aip.name : '选择 DE152 AIP tracking list.xlsx' }}</div>
            <input type="file" accept=".xlsx,.xls" @change="pick('aip', $event)">
          </div>
          <div class="ib-file" :class="{ picked: !!files.rcid }">
            <div class="ib-name">RCID Data Inputs</div>
            <div class="ib-hint">{{ files.rcid ? files.rcid.name : '选择 RCID DART - Data Inputs.xlsx' }}</div>
            <input type="file" accept=".xlsx,.xls" @change="pick('rcid', $event)">
          </div>
        </div>

        <div class="ib-row ib-meta">
          <label>填报月份
            <input v-model="version" placeholder="2026-11" class="ib-input">
          </label>
          <span class="ib-note">留空则按文件名推断；两份表都要填时才需要手动指定</span>
        </div>

        <div class="ib-actions">
          <button class="ib-btn primary" :disabled="busy || (!files.aip && !files.rcid)" @click="run">
            {{ busy ? '解析中…' : '解析并校验' }}
          </button>
          <span v-if="error" class="ib-error">{{ error }}</span>
        </div>

        <!-- 结果 -->
        <div v-if="result" class="ib-result">
          <div class="ib-summary">
            <span class="ok">版本 {{ result.version }} · {{ result.label }}</span>
            <span>告警 {{ result.warnings.length }} 条</span>
          </div>

          <ul v-if="result.warnings.length" class="ib-warn">
            <li v-for="(w, i) in result.warnings.slice(0, 12)" :key="i">{{ w }}</li>
            <li v-if="result.warnings.length > 12">… 另有 {{ result.warnings.length - 12 }} 条</li>
          </ul>

          <div class="ib-counts">
            <div v-for="c in counts" :key="c.k" class="ib-count">
              <b>{{ c.v }}</b><span>{{ c.k }}</span>
            </div>
          </div>

          <div class="ib-actions">
            <button class="ib-btn primary" @click="doUpload">保存并切换</button>
            <button class="ib-btn" @click="doPreview">仅本机预览</button>
            <button class="ib-btn" @click="doExport">导出 JSON</button>
          </div>
          <div v-if="previewOn" class="ib-preview-note">
            当前处于本机预览态，仅本浏览器可见
            <a @click="dropPreview">恢复服务器版本</a>
          </div>
          <div v-if="done" class="ib-success">{{ done }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {db, rawDoc} from '@/data/store'
import {buildDocFromFiles, downloadJson, savePreview, clearPreview, uploadToServer} from '@/utils/importExcel'

export default {
  name: 'ExcelImportDialog',
  props: {
    visible: {type: Boolean, default: false}
  },
  data() {
    return {
      db,
      files: {aip: null, rcid: null},
      version: '',
      busy: false,
      error: '',
      done: '',
      result: null,
      previewOn: false
    }
  },
  computed: {
    counts() {
      if (!this.result) return []
      const d = this.result.doc
      return [
        {k: 'AIP', v: (d.aip && d.aip.list || []).length},
        {k: '支撑合同', v: (d.supportContracts || []).length},
        {k: '风险点', v: ((d.progressRisk || {}).riskZones || []).length},
        {k: '安全点', v: ((d.safety || {}).safetyPoints || []).length},
        {k: '进度月数', v: (((d.overallProgress || {}).chart || {}).months || []).length}
      ]
    }
  },
  methods: {
    pick(key, e) {
      this.files[key] = e.target.files[0] || null
      this.result = null
      this.done = ''
      this.error = ''
    },
    async run() {
      this.busy = true
      this.error = ''
      this.done = ''
      try {
        // 基线取当前已加载的数据，未在 Excel 中出现的段落保持不动
        const baseline = rawDoc()
        this.result = await buildDocFromFiles({
          aip: this.files.aip,
          rcid: this.files.rcid,
          version: this.version.trim(),
          baseline
        })
      } catch (e) {
        this.error = e.message
      } finally {
        this.busy = false
      }
    },
    doPreview() {
      savePreview(this.result.doc)
      this.previewOn = true
      this.done = '已存入本机预览'
      window.location.reload()
    },
    doExport() {
      downloadJson(this.result.doc)
      this.done = '已导出，替换服务器上的 public/data/ 对应文件即可发布'
    },
    async doUpload() {
      this.busy = true
      this.error = ''
      try {
        await uploadToServer(this.result.doc)
        // 清掉本机预览，否则刷新后它优先级更高，会盖住刚上传的这一版
        clearPreview()
        this.previewOn = false
        this.done = `已保存版本 ${this.result.version}，正在切换…`
        this.$emit('uploaded', this.result.version)
      } catch (e) {
        this.error = e.message
      } finally {
        this.busy = false
      }
    },
    dropPreview() {
      clearPreview()
      this.previewOn = false
      window.location.reload()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/panel.scss';

/*
 * 弹窗外壳这几个类，LeftPanels 和 RightPanels 的 scoped 样式里各有一份。
 * scoped 会给选择器挂上各自组件的 data-v 属性，本组件的元素匹配不上，
 * 结果弹窗拿不到 position/z-index，直接排进文档流被挤到屏幕外 ——
 * 表现就是「点了 IMPORT EXCEL 没反应」。所以这里必须自带一份。
 *
 * 别顺手把它们抽进 panel.scss：那两处的 dialog-box 已经各自演化过
 * （高度 400 / 500、表头省略号、列宽），合并会改动现有效果。
 */
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
  // 高度由内容决定，只封顶。面板那两个弹窗是固定高，这里内容多少不定
  max-height: 86vh;
  background: rgba(4, 30, 58, 0.96);
  border: 1px solid #00c8ff;
  border-radius: 6px;
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-head {
  height: 44px;
  flex: none;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 200, 255, 0.35);
}

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
  margin-left: 12px;

  &:hover {
    color: #fff;
  }
}

.import-box {
  width: 720px;
  max-width: 92vw;
}

.ib-body {
  padding: 14px 18px 18px;
  color: #cfe8ff;
  font-size: 12px;
  overflow-y: auto;
}

.ib-row {
  display: flex;
  gap: 12px;
}

.ib-file {
  flex: 1;
  position: relative;
  padding: 14px 12px;
  border: 1px dashed rgba(90, 170, 230, 0.45);
  border-radius: 3px;
  background: rgba(6, 30, 56, 0.5);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &.picked {
    border-style: solid;
    border-color: #2eff9d;
    background: rgba(10, 50, 40, 0.45);
  }

  &:hover {
    border-color: #3fd2ff;
  }

  input[type='file'] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.ib-name {
  font-weight: 700;
  color: #eaf7ff;
  margin-bottom: 4px;
}

.ib-hint {
  color: #7fb9e2;
  font-size: 11px;
  word-break: break-all;
}

.ib-meta {
  align-items: center;
  margin-top: 12px;
}

.ib-note {
  color: #6fa8d0;
  font-size: 11px;
}

.ib-input {
  background: rgba(6, 30, 56, 0.7);
  border: 1px solid rgba(90, 170, 230, 0.45);
  border-radius: 2px;
  color: #eaf7ff;
  padding: 4px 8px;
  margin-left: 6px;
  width: 110px;
  font-size: 12px;
}

.ib-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.ib-btn {
  background: rgba(10, 60, 105, 0.85);
  border: 1px solid rgba(90, 170, 230, 0.55);
  color: #cfe8ff;
  border-radius: 2px;
  padding: 5px 14px;
  cursor: pointer;
  font-size: 12px;

  &.primary {
    background: rgba(14, 154, 216, 0.85);
    border-color: #3fd2ff;
    color: #eaf7ff;
    font-weight: 700;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.ib-result {
  margin-top: 18px;
  border-top: 1px solid rgba(90, 170, 230, 0.25);
  padding-top: 12px;
}

.ib-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;

  .ok {
    color: #2eff9d;
    font-weight: 700;
  }
}

.ib-warn {
  margin: 0 0 10px;
  padding-left: 18px;
  color: #ffd83d;
  font-size: 11px;
  line-height: 1.7;
}

.ib-counts {
  display: flex;
  gap: 18px;
  margin-bottom: 6px;
}

.ib-count {
  text-align: center;

  b {
    display: block;
    font-size: 18px;
    color: #3fd2ff;
  }

  span {
    font-size: 10px;
    color: #7fb9e2;
  }
}

.ib-error {
  color: #ff6b6b;
  font-size: 11px;
}

.ib-success {
  margin-top: 10px;
  color: #2eff9d;
}

.ib-preview-note {
  margin-top: 10px;
  color: #ffd83d;

  a {
    color: #3fd2ff;
    cursor: pointer;
    text-decoration: underline;
    margin-left: 6px;
  }
}
</style>
