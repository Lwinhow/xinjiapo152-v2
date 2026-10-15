import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import global from "./utils/global";// 注册全局方法，组件，指令，过滤器文件
import Element from 'element-ui';
import '@/assets/scss/element-variables.scss';// 可自定义element主题颜色的文件
import "@/assets/iconfont/iconfont.css";
import "@/assets/scss/index.scss";
Vue.use(Element);
Vue.use(global);
Vue.config.productionTip = false;// 为false阻止显示生产模式的消息

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')