<template>
  <div class="search-box" @click.stop>
    <span class="search-icon">🔍</span>
    <input
        v-model="query"
        type="text"
        class="search-input"
        placeholder="Search..."
        @input="onInput"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="close"
        @focus="open"
    />
    <div v-show="show && query.trim()" class="search-results">
      <div v-if="!results.length" class="search-empty">No results</div>
      <div
          v-for="item in results"
          :key="item.id"
          class="search-item"
          @click="onPick(item)"
      >
        <span class="si-title">{{ item.title }}</span>
        <span class="si-cat">{{ item.category }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import {search} from '@/utils/searchIndex'

export default {
  name: 'SearchBox',
  data() {
    return {
      query: '',
      results: [],
      show: false,
      debounceTimer: null
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocClick)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.onDocClick)
    clearTimeout(this.debounceTimer)
  },
  methods: {
    onInput() {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.results = search(this.query)
        this.show = true
      }, 200)
    },
    open() {
      if (this.query.trim()) this.show = true
    },
    close() {
      this.show = false
    },
    onDocClick() {
      this.show = false
    },
    onEnter() {
      if (this.results.length) this.onPick(this.results[0])
    },
    onPick(item) {
      this.show = false
      this.query = ''
      this.results = []
      // 自愈：多阶段编辑/HMR 可能向事件总线注册过 undefined 处理器，发射前清理
      const cbs = this.$root._events['search:navigate']
      if (Array.isArray(cbs)) {
        for (let i = cbs.length - 1; i >= 0; i--) {
          if (typeof cbs[i] !== 'function') cbs.splice(i, 1)
        }
      }
      this.$root.$emit('search:navigate', item)
    }
  }
}
</script>

<style lang="scss" scoped>
.search-box {
  margin-top: 5px;
  position: relative;
  z-index: 32;

  .search-icon {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    pointer-events: none;
    opacity: 0.75;
  }

  .search-input {
    width: 230px;
    height: 30px;
    padding: 0 10px 0 30px;
    font-size: 12px;
    letter-spacing: 0.5px;
    color: #eaf7ff;
    background: rgba(4, 30, 58, 0.9);
    border: 1px solid rgba(0, 200, 255, 0.45);
    border-radius: 4px;
    outline: none;
    transition: border-color 0.2s;

    &::placeholder {
      color: #6fa8d0;
    }

    &:focus {
      border-color: #00d5ff;
      box-shadow: 0 0 10px rgba(0, 200, 255, 0.35);
    }
  }

  .search-results {
    position: absolute;
    top: 36px;
    right: 0;
    width: 340px;
    max-height: 360px;
    overflow-y: auto;
    background: rgba(4, 30, 58, 0.97);
    border: 1px solid #00c8ff;
    border-radius: 4px;
    box-shadow: 0 0 18px rgba(0, 200, 255, 0.4);
  }

  .search-empty {
    padding: 14px 12px;
    font-size: 12px;
    color: #7fb9e2;
    text-align: center;
  }

  .search-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(90, 170, 230, 0.14);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: rgba(0, 200, 255, 0.15);
    }

    .si-title {
      font-size: 12px;
      color: #eaf7ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .si-cat {
      flex: none;
      font-size: 10px;
      padding: 1px 8px;
      color: #9fe4ff;
      border: 1px solid rgba(0, 190, 255, 0.4);
      border-radius: 8px;
      background: rgba(0, 140, 220, 0.12);
    }
  }

  .search-results::-webkit-scrollbar {
    width: 6px;
  }

  .search-results::-webkit-scrollbar-thumb {
    background: rgba(0, 200, 255, 0.35);
    border-radius: 3px;
  }
}
</style>
