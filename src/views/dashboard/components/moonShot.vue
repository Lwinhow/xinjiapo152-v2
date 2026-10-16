<template>
  <div class="moon-shot">
    <div class="moon-box">
      <div :style="colorConfig.headBg" class="moon-head">
        <el-popover placement="bottom-start" width="280" trigger="click" :append-to-body="true"
                    @show="loadChatFiles">
          <el-button slot="reference" circle icon="el-icon-download" title="Download chat logs"></el-button>
          <div class="chat-files-panel">
            <div v-if="!chatFiles.length" class="chat-files-empty">No chat logs yet</div>
            <el-checkbox-group v-model="selectedFiles" class="chat-files-list">
              <el-checkbox v-for="f in chatFiles" :key="f" :label="f" class="chat-file-item">{{
                  fileLabel(f)
                }}
              </el-checkbox>
            </el-checkbox-group>
            <el-button type="primary" size="mini" :disabled="!selectedFiles.length"
                       @click="downloadChatFiles">Download
            </el-button>
          </div>
        </el-popover>
        <div class="moon-title">
          <p :style="colorConfig.headTitle" class="title-text">{{ chatTitle }}</p>
          <p class="name-text">
            <span>{{ myself.name }},</span>
            <span>{{ chatAi.name }}</span>
          </p>
        </div>
        <div class="moon-config">
          <div style="width: 200px" title="Select AI Model Version">
            <el-select v-model="model" placeholder="Please Select" style="width: 180px">
              <el-option
                  v-for="item in models"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value">
              </el-option>
            </el-select>
          </div>
          <div title="Save to Server?">
            <el-switch
                v-model="isSave"
                active-color="#2eff9d"
                inactive-color="#39597a">
            </el-switch>
          </div>
          <div title="Clear Current Chat Records">
            <el-popconfirm
                :hide-icon=false
                cancel-button-text='No'
                confirm-button-text='OK'
                icon="el-icon-info"
                icon-color="red"
                title="Are you sure to clear chat records?"
                @confirm=clearMessage>
              <el-button slot="reference" circle icon="el-icon-delete" type="primary"></el-button>
            </el-popconfirm>
          </div>
          <div>
            <el-button slot="reference" circle icon=" el-icon-close" type="danger" @click="closeChat"></el-button>
          </div>
        </div>
      </div>
      <div ref="messagesContainer" :style="colorConfig.bodyBg" class="moon-body">
        <div v-for="(message,index) in messages" :key="index" class="message-box">
          <div v-if="message.role==='user'" class="my-message">
            <div class="message-content">
              <div :style="colorConfig.message.my.content" class="message-text">
                <p :style="colorConfig.message.my.name" class="message-name">{{ myself.name }}</p>
                <p>{{ message.content }}</p>
              </div>
              <div v-if="timestampConfig.show" class="message-timestamp">
                {{ formatTimestamp(message.timestamp) }}
              </div>
              <div class="bubble-actions">
                <span class="ba-btn" title="Copy" @click="copyMessage(message.content)"><i
                    class="el-icon-document-copy"></i></span>
              </div>
            </div>
            <div class="message-icon">
              <img v-if="profileConfig.ai" :src="myself.profilePicture" :style="profileConfig.styles" alt="">
            </div>
          </div>
          <div v-else class="ai-message">
            <div class="message-icon">
              <img v-if="profileConfig.my" :src="chatAi.profilePicture" :style="profileConfig.styles" alt="">
            </div>
            <div class="message-content">
              <div :style="colorConfig.message.ai.content" class="message-text">
                <p :style="colorConfig.message.ai.name" class="message-name">{{ chatAi.name }}</p>
                <div class="md-body" v-html="renderMarkdown(message.content)"></div>
              </div>
              <div v-if="timestampConfig.show" class="message-timestamp">
                {{ formatTimestamp(message.timestamp) }}
              </div>
              <div class="bubble-actions">
                <span class="ba-btn" title="Copy" @click="copyMessage(message.content)"><i
                    class="el-icon-document-copy"></i></span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="thinking" class="message-box">
          <div class="ai-message">
            <div class="message-icon">
              <img v-if="profileConfig.my" :src="chatAi.profilePicture" :style="profileConfig.styles" alt="">
            </div>
            <div class="message-content">
              <div :style="colorConfig.message.ai.content" class="message-text">
                <p :style="colorConfig.message.ai.name" class="message-name">{{ chatAi.name }}</p>
                <div class="md-body thinking"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div :style="colorConfig.bottomBg" class="moon-bottom">
        <div class="message-input">
          <div ref="messageInput"
               :placeholder=placeholder
               class="input-box"
               contenteditable="true"
               tabindex="0"
               @keydown="handleKeydown">
          </div>
        </div>
        <div class="sand-icon" title="sendMessage">
          <el-button slot="reference" circle icon="el-icon-s-promotion" type="primary" @click="sendMessage"></el-button>
        </div>
        <div class="sand-icon" title="sendFile">
          <input ref="fileInput" :accept=acceptImageTypes style="display: none;" type="file" @change="sendFile">
          <el-button slot="reference" circle icon="el-icon-picture" type="primary" @click="openFileInput"></el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import api from "@/utils/api";
import {db, rawDoc} from "@/data/store";
import {currentUser} from "@/utils/auth";
import markdownit from 'markdown-it'
import DOMPurify from 'dompurify'

const md = markdownit({breaks: true, linkify: true})

export default {
  name: 'chatAi',
  data() {
    return {
      //内容参数
      isSave: true,
      chatTitle: 'chat ai',
      placeholder: 'send your message !',
      model: 'deepseek-flash',
      models: [
        {
          value: 'deepseek-v4-pro',
          label: 'deepseek-v4-pro'
        },
        {
          value: 'deepseek-flash',
          label: 'deepseek-flash'
        },
      ],
      chatAi: {
        name: 'deepseek',
        profilePicture: require(`@/assets/deepseek.png`)
      },
      myself: {
        name: 'me',
        profilePicture: require(`@/assets/touxiang.jpg`)
      },
      messages: [],
      chatHistory: [],
      thinking: false,
      username: currentUser() || 'anonymous',
      chatFiles: [],
      selectedFiles: [],

      //已完成的配置 —— 配色与大屏深蓝+青色主题一致
      colorConfig: {
        headBg: {
          background: 'rgba(4, 30, 58, 0.98)'
        },
        headTitle: {
          color: '#eaf7ff'
        },
        bodyBg: {
          background: 'rgba(4, 34, 64, 0.98)'
        },
        bottomBg: {
          background: 'rgba(6, 34, 66, 0.98)'
        },
        message: {
          my: {
            name: {
              color: '#8fc6ea'
            },
            content: {
              background: 'linear-gradient(180deg, #3fd2ff, #0e9ad8)',
              color: '#ffffff'
            }
          },
          ai: {
            name: {
              color: '#8fc6ea'
            },
            content: {
              background: 'rgba(10, 60, 110, 0.9)',
              color: '#eaf7ff'
            }
          },
        },
      },
      scrollBottom: {
        messageSent: true,
        messageReceived: false,
      },
      profileConfig: {
        ai: true,
        my: true,
        styles: {
          width: '30px',
          height: '30px',
          borderRadius: '50%',
        }
      },
      timestampConfig: {
        format: 'MM/dd-HH:mm',
        show: true,
      },
      acceptImageTypes: ['image/png', 'image/jpg', 'image/jpeg'],
      //还没开发的配置
      linkOptions: {
        myself: {
          className: 'myLinkClass',
          events: {
            click: function (e) {
              alert('Link clicked!');
            },
            mouseover: function (e) {
              alert('Link hovered!');
            }
          },
          format: function (value, type) {
            if (type === 'url' && value.length > 50) {
              value = value.slice(0, 50) + '…';
            }
            return value;
          }
        },
        others: {
          className: 'othersLinkClass',
          events: {
            click: function (e) {
              alert('Link clicked!');
            },
            mouseover: function (e) {
              alert('Link hovered!');
            }
          },
          format: function (value, type) {
            if (type === 'url' && value.length > 50) {
              value = value.slice(0, 50) + '…';
            }
            return value;
          }
        }
      },
    }
  },
  methods: {
    closeChat() {
      this.$emit("closeChat")
    },
    clearMessage() {
      this.messages = []
    },
    /** AI 文本是 markdown（**加粗**、- 列表、```代码```），渲染前必须消毒防 XSS */
    renderMarkdown(text) {
      return DOMPurify.sanitize(md.render(text || ''))
    },
    /**
     * 系统提示词：角色设定 + 版本清单 + 当前看板全量数据。
     * 每次发消息都重新构建 —— 数据随版本切换/上传自动保持最新。
     */
    buildSystemPrompt() {
      const doc = rawDoc()
      const versions = (db.versions || [])
          .map(v => `${v.id} (${v.label || '-'})`)
          .join('; ')
      return [
        'You are the AI assistant embedded in the DE152 DART project command dashboard.',
        'Answer questions about this construction project strictly based on the dashboard data provided below.',
        'The project is located in Singapore. References shall be subject to local laws, regulations, work codes and requirements.',
        'If something is not in the data, say you cannot find it instead of guessing.',
        `Current dashboard version: ${doc.meta && doc.meta.version || '-'} (${doc.meta && doc.meta.label || '-'})`,
        `Other versions available on the server: ${versions || 'none'} — their data is NOT loaded; tell the user to switch versions in the top bar to inspect them.`,
        'Reply concisely in the same language the user writes in.',
        '--- DASHBOARD DATA (JSON) ---',
        JSON.stringify(doc)
      ].join('\n')
    },
    async sendMessageToAI() {
      this.thinking = true
      this.scrollToBottom()
      try {
        this.chatHistory = []
        for (const message of this.messages) {
          const one = {
            role: message.role,
            content: message.content,
          }
          this.chatHistory.push(one)
        }
        if (this.chatHistory.length > 20) {
          let numberOfItemsToRemove = this.chatHistory.length - 20;
          this.chatHistory.splice(0, numberOfItemsToRemove);
        }
        const payload = [{role: 'system', content: this.buildSystemPrompt()}, ...this.chatHistory];
        const response = await api.getCompletion(this.model, payload);
        const time = new Date();
        let result = {role: 'assistant', content: response.data.choices[0].message.content, timestamp: time}
        this.messages.push(result)
        const lastUser = [...this.messages].reverse().find(m => m.role === 'user')
        this.logConversation(lastUser ? lastUser.content : '', result.content)
        this.scrollToBottom();
      } catch (err) {
        const msg = (err.response && err.response.data && err.response.data.error && err.response.data.error.message) || err.message;
        const errText = '⚠ ' + msg
        this.messages.push({role: 'assistant', content: errText, timestamp: new Date()})
        const lastUser = [...this.messages].reverse().find(m => m.role === 'user')
        this.logConversation(lastUser ? lastUser.content : '', errText)
        this.scrollToBottom();
        console.log(err)
      } finally {
        this.thinking = false
        this.scrollToBottom();
      }
    },
    /** 每轮对话写入 server 端 public/chat/chat-YYYY-MM-DD-<username>.txt；isSave 关闭或 server 不在时静默跳过 */
    logConversation(userText, aiText) {
      if (!this.isSave) return
      const doc = rawDoc()
      fetch(`${(process.env.BASE_URL || '/').replace(/^\.\//, '/')}api/chat-log`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          user: userText,
          assistant: aiText,
          model: this.model,
          version: doc.meta && doc.meta.version,
          username: this.username
        })
      }).catch(() => {
      })
    },
    fileLabel(f) {
      return f.replace(/^chat-/, '').replace(new RegExp(`-${this.username}\\.txt$`), '')
    },
    loadChatFiles() {
      this.selectedFiles = []
      const base = (process.env.BASE_URL || '/').replace(/^\.\//, '/')
      fetch(`${base}api/chat-log/list?username=${encodeURIComponent(this.username)}`)
          .then(r => r.json())
          .then(d => {
            this.chatFiles = d.files || []
          })
          .catch(() => {
            this.chatFiles = []
          })
    },
    async downloadChatFiles() {
      if (!this.selectedFiles.length) return
      const base = (process.env.BASE_URL || '/').replace(/^\.\//, '/')
      for (const f of this.selectedFiles) {
        try {
          const res = await fetch(`${base}api/chat-log/download?file=${encodeURIComponent(f)}&username=${encodeURIComponent(this.username)}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = f
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (e) {
          this.$message.error(`Download failed: ${f}`)
        }
        await new Promise(r => setTimeout(r, 400))
      }
    },
    copyMessage(text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => this.$message.success('Copied'))
            .catch(() => this.fallbackCopy(text))
      } else {
        this.fallbackCopy(text)
      }
    },
    fallbackCopy(text) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        this.$message.success('Copied')
      } catch (e) {
        this.$message.error('Copy failed')
      }
      document.body.removeChild(ta)
    },
    sendMessage() {
      const messageContent = this.$refs.messageInput.innerText;
      if (messageContent.trim()) {
        const time = new Date();
        const message = {
          role: "user",
          content: messageContent,
          timestamp: time,
        }
        this.messages.push(message)
        this.$refs.messageInput.innerText = '';
        if (this.scrollBottom.messageSent) {
          this.scrollToBottom();
        }
        this.sendMessageToAI()
      } else {
        console.log('输入信息不能为空');
      }
    },

    sendFile(event) {
      const files = event.target.files;
      if (files.length > 0) {
        const file = files[0];
        const isAcceptedType = this.acceptImageTypes.includes(file.type);
        if (!isAcceptedType) {
          this.$message.error('不接受的文件类型，请选择PNG、JPG或JPEG格式的文件。');
          this.$refs.fileInput.value = '';
          return;
        }
        console.log('选中的文件:', file);
      }
    },
    handleKeydown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.sendMessage();
      }
    },
    openFileInput() {
      this.$refs.fileInput.click();
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        container.scrollTop = container.scrollHeight;
      });
    },
    formatTimestamp(timestamp) {
      const date = new Date(timestamp); // 解析日期字符串
      const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份，注意要加1
      const day = String(date.getDate()).padStart(2, '0'); // 日期
      const hour = String(date.getHours()).padStart(2, '0'); // 小时
      const minute = String(date.getMinutes()).padStart(2, '0'); // 分钟
      const year = date.getFullYear(); // 年份
      switch (this.timestampConfig.format) {
        case 'MM/dd-HH:mm':
          return `${month}/${day}-${hour}:${minute}`;
        case 'dd/MM/yyyy':
          return `${day}/${month}/${year}`; // 日/月/年格式
        case 'yyyy-MM-dd HH:mm':
          return `${year}-${month}-${day} ${hour}:${minute}`; // 年-月-日 时:分格式
        case 'MM dd, yyyy':
          return `${month} ${day}, ${year}`; // 月 日, 年格式
        case 'dd-MM-yyyy HH:mm':
          return `${day}-${month}-${year} ${hour}:${minute}`; // 日-月-年 时:分格式
        case 'HH:mm':
          return `${hour}:${minute}`; // 时:分格式
        default:
          return `${month}/${day}-${hour}:${minute}`; // 默认格式
      }
    },
  },
  mounted() {
  }
}
</script>
<style lang="scss" scoped>
.moon-shot {
  position: absolute;
  z-index: 50;
  top: 200px;
  left: 450px;
  width: 1000px;
  height: 600px;
}

.moon-box {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #041e3a;
  border: 1px solid rgba(0, 200, 255, 0.35);
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.25);
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  flex-direction: column;
  -webkit-box-align: stretch;
  align-items: stretch;
  overflow: hidden;
  border-radius: 10px 10px 0 0;

  .moon-head {
    position: relative;
    z-index: 10;
    height: 70px;
    display: flex;
    padding: 0 10px 0 10px;
    -webkit-box-align: center;
    align-items: center;
    box-shadow: 0 2px 20px 2px rgba(0, 80, 160, 0.35);
    background: rgba(4, 30, 58, 0.98);
    border-bottom: 1px solid rgba(0, 200, 255, 0.3);

    .moon-title {
      padding: 10px;
      -webkit-box-flex: 1;
      flex: 1;
      text-align: left;

      .title-text {
        color: #eaf7ff;
        margin-bottom: 0;
      }

      .name-text {
        color: #8fc6ea;
        font-size: 12px;
        margin-top: 5px;
        max-height: 30px;
        overflow: hidden;
      }
    }

    .moon-config {
      display: flex;
      gap: 5px;
      align-items: center;

      div {
        width: 50px;
        height: 50px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #8fc6ea;
        text-decoration: none;
        font-size: 20px;
        cursor: pointer;

        &:hover {
          background-color: rgba(14, 154, 216, 0.28);
          color: #eaf7ff;
        }
      }

      ::v-deep .el-input__inner {
        background: rgba(4, 34, 64, 0.97);
        border-color: rgba(63, 210, 255, 0.35);
        color: #eaf7ff;

        &::placeholder {
          color: #6fb7e2;
        }
      }
    }
  }

  .moon-body {
    -webkit-box-flex: 1;
    flex: 1;
    overflow-y: scroll;
    overflow-x: hidden;
    display: flex;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    flex-direction: column;
    padding-bottom: 20px;
    height: calc(100% - 155px);
    background: rgba(4, 34, 64, 0.98);

    .message-box {
      display: flex;
      flex-wrap: wrap;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      flex-direction: column;

      .my-message {
        display: flex;
        -webkit-box-pack: end;
        align-items: flex-end;
        padding-right: 10px;
        padding-top: 10px;

        .message-content {
          -webkit-box-pack: start;
          justify-content: flex-start;
          -webkit-box-orient: vertical;
          -webkit-box-direction: normal;
          flex-direction: column;
          -webkit-box-flex: 1;
          flex-grow: 1;
          display: flex;
          -webkit-box-align: end;
          align-items: flex-end;

          .message-text {
            padding: 6px 10px;
            line-height: 1.55;
            margin: 5px 0 5px 0;
            max-width: 70%;
            overflow-wrap: break-word;
            text-align: left;
            white-space: pre-wrap;
            border-radius: 15px 15px 0 15px;
            word-break: break-word;
            background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
            color: #ffffff;

            p {
              margin: 5px 0 5px 0;
              font-size: 14px;
            }

            .message-name {
              font-weight: 700;
            }
          }

          .message-timestamp {
            padding: 2px 7px;
            border-radius: 15px;
            margin: 0;
            max-width: 50%;
            overflow-wrap: break-word;
            text-align: left;
            font-size: 10px;
            color: #6fb7e2;
            width: 100%;
            display: flex;
            -webkit-box-align: center;
            align-items: center;
            justify-content: flex-end;
          }
        }

        .message-icon {
          img {
            margin-left: 10px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
          }
        }
      }

      .ai-message {
        display: flex;
        -webkit-box-align: end;
        align-items: flex-end;
        padding-left: 10px;
        padding-top: 10px;

        .message-icon {
          img {
            margin-right: 10px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
          }
        }

        .message-content {
          display: flex;
          -webkit-box-align: start;
          align-items: flex-start;
          -webkit-box-pack: start;
          justify-content: flex-start;
          -webkit-box-orient: vertical;
          -webkit-box-direction: normal;
          flex-direction: column;
          -webkit-box-flex: 1;
          flex-grow: 1;

          .message-text {
            padding: 6px 10px;
            line-height: 1.55;
            margin: 5px 0 5px 0;
            max-width: 70%;
            overflow-wrap: break-word;
            text-align: left;
            white-space: pre-wrap;
            border-radius: 15px 15px 15px 0;
            word-break: break-word;
            background: rgba(10, 60, 110, 0.9);
            color: #eaf7ff;

            p {
              margin: 5px 0 5px 0;
              font-size: 14px;
            }

            .message-name {
              font-weight: 700;
            }
          }

          .message-timestamp {
            padding: 2px 7px;
            border-radius: 15px;
            margin: 0;
            max-width: 50%;
            overflow-wrap: break-word;
            text-align: left;
            font-size: 10px;
            color: #6fb7e2;
            width: 100%;
            display: flex;
            -webkit-box-align: center;
            align-items: center;
          }
        }
      }
    }
  }

  .moon-bottom {
    gap: 5px;
    position: absolute;
    left: 0;
    bottom: 1px;
    height: 65px;
    width: 100%;
    background: rgba(6, 34, 66, 0.98);
    border-top: 1px solid rgba(0, 200, 255, 0.25);
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    padding: 0 5px 0 20px;
    box-shadow: 0 -2px 24px rgba(0, 200, 255, 0.12);

    .message-input {
      padding: 0 10px 0 10px;
      -webkit-box-flex: 1;
      flex: 1;
      overflow: hidden;

      .input-box {
        width: 100%;
        resize: none;
        border: 1px solid rgba(63, 210, 255, 0.35);
        outline: none;
        box-sizing: border-box;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.33;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #eaf7ff;
        -webkit-font-smoothing: antialiased;
        height: 50px;
        overflow: scroll;
        overflow-x: hidden;
        overflow-y: auto;
        text-align: left;
        cursor: text;
        display: inline-block;
        background-color: rgba(4, 34, 64, 0.97);
        border-radius: 6px;
        padding: 5px 8px;

        &:focus {
          border-color: #3fd2ff;
        }

        &:empty:before {
          content: attr(placeholder);
          color: #6fb7e2;
        }

        &:focus:before {
          content: none;
        }
      }
    }

    .sand-icon {
      width: 50px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #8fc6ea;
      text-decoration: none;
      font-size: 20px;
      cursor: pointer;
      opacity: .7;
      transition: .3s;
      border-radius: 11px;

      &:hover {
        background-color: rgba(14, 154, 216, 0.28);
        opacity: 1;
      }
    }
  }

  ::v-deep .el-button--primary {
    background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
    border: none;

    &:hover, &:focus {
      background: linear-gradient(180deg, #5bdaff, #17a7e6);
    }
  }
}

.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
  opacity: 0.55;
  transition: opacity 0.2s;

  .ba-btn {
    cursor: pointer;
    font-size: 13px;
    color: #6fb7e2;

    &:hover {
      color: #3fd2ff;
    }
  }

  &:hover {
    opacity: 1;
  }
}

::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  /* 背景颜色 */
}

::-webkit-scrollbar-thumb {
  background: rgba(63, 210, 255, 0.35);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(63, 210, 255, 0.7);
}
</style>

<!--
  v-html 注入的 markdown 内容不带 scoped data-v 属性，scoped 样式命中不了，
  必须用非 scoped 块并以 .md-body 为命名空间，避免污染其他组件。
  AI 气泡底色是红色（colorConfig.message.ai.content），配色按白字浅透明底设计。
-->
<style lang="scss">
.md-body {
  white-space: normal;
  line-height: 1.55;

  p {
    margin: 6px 0;
  }

  strong, b {
    font-weight: 800;
    color: #ffd83d;
  }

  ul, ol {
    margin: 6px 0;
    padding-left: 18px;
  }

  li {
    margin: 3px 0;
  }

  h1, h2, h3, h4 {
    margin: 8px 0 4px;
    font-size: 14px;
  }

  code {
    background: rgba(0, 0, 0, 0.18);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
  }

  pre {
    background: rgba(0, 0, 0, 0.18);
    padding: 6px 8px;
    border-radius: 4px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
    }
  }

  table {
    border-collapse: collapse;
    margin: 4px 0;
  }

  th, td {
    border: 1px solid rgba(255, 255, 255, 0.45);
    padding: 2px 6px;
  }

  a {
    color: #fff;
  }

  blockquote {
    margin: 4px 0;
    padding-left: 8px;
    border-left: 3px solid rgba(255, 255, 255, 0.5);
  }
}

.thinking {
  display: inline-flex;
  gap: 4px;
  padding: 6px 0;

  span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    animation: moonDot 1.2s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }

    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
}

@keyframes moonDot {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

<!--
  el-popover 开了 append-to-body，下拉面板挂在 <body> 下，scoped 样式命中不了，
  用 .chat-files-* 命名空间写在非 scoped 块里。
-->
<style lang="scss">
.chat-files-list {
  max-height: 220px;
  overflow-y: auto;
}

.chat-file-item {
  display: flex;
  margin: 0 0 4px;
}

.chat-files-empty {
  color: #909399;
  font-size: 12px;
  padding: 4px 0;
}

.chat-files-panel .el-button--primary {
  margin-top: 8px;
  float: right;
  background: linear-gradient(180deg, #3fd2ff, #0e9ad8);
  border: none;

  &:hover, &:focus {
    background: linear-gradient(180deg, #5bdaff, #17a7e6);
  }
}
</style>