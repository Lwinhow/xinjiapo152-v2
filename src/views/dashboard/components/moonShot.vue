<template>
  <div class="moon-shot">
    <div class="moon-box">
      <div :style="colorConfig.headBg" class="moon-head">
        <div class="moon-title">
          <p :style="colorConfig.headTitle" class="title-text">{{ chatTitle }}</p>
          <p class="name-text">
            <span>{{ myself.name }},</span>
            <span>{{ chatAi.name }}</span>
          </p>
        </div>
        <div class="moon-config">
          <!--          <div style="width: 100px" title="选择模型大小">
                      <el-select v-model="model" placeholder="请选择" style="width: 80px">
                        <el-option
                            v-for="item in models"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value">
                        </el-option>
                      </el-select>
                    </div>
                    <div title="是否请求AI">
                      <el-switch
                          v-model="isPost"
                          active-color="#13ce66"
                          inactive-color="#ff4949">
                      </el-switch>
                    </div>-->
          <div title="清空聊天记录">
            <el-popconfirm
                :hide-icon=false
                cancel-button-text='不用了'
                confirm-button-text='好的'
                icon="el-icon-info"
                icon-color="red"
                title="真的要清空聊天记录？"
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
                <p>{{ message.content }}</p>
              </div>
              <div v-if="timestampConfig.show" class="message-timestamp">
                {{ formatTimestamp(message.timestamp) }}
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
        <div class="sand-icon" title="发送">
          <el-button slot="reference" circle icon="el-icon-s-promotion" type="primary" @click="sendMessage"></el-button>
        </div>
        <div class="sand-icon" title="图片">
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

export default {
  name: 'chatAi',
  data() {
    return {
      //内容参数
      isPost: false,
      chatTitle: 'chat ai',
      placeholder: 'send your message !',
      model: 'moonshot-v1-8k',
      models: [
        {
          value: 'moonshot-v1-8k',
          label: '8k'
        },
        {
          value: 'moonshot-v1-32k',
          label: '32k'
        },
        {
          value: 'moonshot-v1-128k',
          label: '128k'
        },
      ],
      chatAi: {
        name: 'ai',
        profilePicture: ''
      },
      myself: {
        name: 'me',
        profilePicture: require(`@/assets/touxiang.jpg`)
      },
      messages: [],
      chatHistory: [],

      //已完成的配置
      colorConfig: {
        headBg: {
          background: '#DBE1E7'
        },
        headTitle: {
          color: '#fff'
        },
        bodyBg: {
          background: '#F7F3F3'
        },
        bottomBg: {
          background: '#fff'
        },
        message: {
          my: {
            name: {
              color: '#bdb8b8'
            },
            content: {
              background: '#fff',
              color: '#bdb8b8'
            }
          },
          ai: {
            name: {
              color: '#fff'
            },
            content: {
              background: '#fb4141',
              color: '#fff'
            }
          },
        },
        submitIcon: {
          fill: '#B91010'
        },
        submitImageIcon: {
          fill: '#B91010'
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
    async sendMessageToAI() {
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
        const response = await api.getCompletion('moonshot-v1-8k', this.chatHistory);
        const time = new Date();
        let result = {role: 'assistant', content: response.data.choices[0].message.content, timestamp: time}
        this.messages.push(result)
        if (this.scrollBottom.messageReceived) {
          this.scrollToBottom();
        }
      } catch (err) {
        console.log(err)
      }
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
        if (this.isPost) {
          this.sendMessageToAI()
        }
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
  background-color: #f5f1f1;
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
    box-shadow: 0 2px 20px 2px rgba(90, 90, 90, .40);
    background: #DBE1E7;

    .moon-title {
      padding: 10px;
      -webkit-box-flex: 1;
      flex: 1;
      text-align: left;

      .title-text {
        color: #000;
        margin-bottom: 0;
      }

      .name-text {
        color: rgb(142, 142, 142);
        font-size: 12px;
        margin-top: 5px;
        max-height: 30px;
        overflow: hidden;
      }
    }

    .moon-config {
      display: flex;
      gap: 5px;

      div {
        width: 50px;
        height: 50px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #84878b;
        text-decoration: none;
        font-size: 20px;
        cursor: pointer;

        &:hover {
          background-color: rgb(196, 202, 207);
          color: #000;
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
    background: #F7F3F3;

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
            line-height: 14px;
            margin: 5px 0 5px 0;
            max-width: 70%;
            overflow-wrap: break-word;
            text-align: left;
            white-space: pre-wrap;
            border-radius: 15px 15px 0 15px;
            word-break: break-word;
            background: rgb(255, 255, 255);
            color: rgb(189, 184, 184);

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
            color: #bdb8b8;
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
            line-height: 14px;
            margin: 5px 0 5px 0;
            max-width: 70%;
            overflow-wrap: break-word;
            text-align: left;
            white-space: pre-wrap;
            border-radius: 15px 15px 15px 0;
            word-break: break-word;
            background: rgb(251, 65, 65);
            color: rgb(255, 255, 255);

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
            color: #bdb8b8;
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
    background: #fff;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    padding: 0 5px 0 20px;
    box-shadow: 0 -2px 40px 0 hsla(0, 0%, 72.9%, .67);

    .message-input {
      padding: 0 10px 0 10px;
      -webkit-box-flex: 1;
      flex: 1;
      overflow: hidden;

      .input-box {
        width: 100%;
        resize: none;
        border: none;
        outline: none;
        box-sizing: border-box;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.33;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #bababa;
        -webkit-font-smoothing: antialiased;
        max-height: 40px;
        bottom: 0;
        overflow: scroll;
        overflow-x: hidden;
        overflow-y: auto;
        text-align: left;
        cursor: text;
        display: inline-block;

        &:empty:before {
          content: attr(placeholder);
          color: #bbb;
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
      color: #84878b;
      text-decoration: none;
      font-size: 20px;
      cursor: pointer;
      opacity: .7;
      transition: .3s;
      border-radius: 11px;

      &:hover {
        background-color: #ececec;
        opacity: 1;
      }
    }
  }
}

::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  /* 背景颜色 */
}

::-webkit-scrollbar-thumb {
  background: #a9a8a8;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #645858;
}
</style>