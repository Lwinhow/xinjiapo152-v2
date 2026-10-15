import Vue from 'vue';
import Vuex from "vuex";
//import { getOAuth2,getFileConfig } from '@/apis/public.js'
Vue.use(Vuex);

// https://webpack.js.org/guides/dependency-management/#requirecontext
// 自动引入store/modules下的所有store模块
const modulesFiles = require.context('./modules', true, /\.js$/);
const modules = modulesFiles.keys().reduce((modules, modulePath) => {
  const moduleName = modulePath.replace(/^\.\/(.*)\.\w+$/, '$1')
  const value = modulesFiles(modulePath)
  modules[moduleName] = value.default
  return modules
}, {})
//console.log("modules",modules);
let store = new Vuex.Store({
	namespaced: true,
	state:{
	},
	mutations:{//方法的存储地(在这里的方法不建议做异步请求，如果存在异步请求在actions里面做的，可以直接触发mutations里面的方法，但是如果存在axios异步操作，就把此操作放在actions里面做，最后commit给mutations就行了)
		//mutations中的方法是用来更改state中的数据的
		/* SET_TOKEN: (state, token) => {
			state.token = token
		}, */
	},
	actions:{//如果存在异步操作，一般都在这里做   一般不要在actions里面操作state   actions中的方法名和mutations中的方法名可以一样
		/* // 获取token
		getOAuth2({ commit }, cookie) {
			return new Promise((resolve, reject) => {
				const params = {
					tylincookieloginid: cookie
				}
				getOAuth2(params).then(response => {
					console.log("getOAuth2",response)
					commit('SET_TOKEN', response.data || '')
					resolve()
				}).catch(error => {
					reject(error)
				})
			})
		} */
	}, 
	getters:{//getter是用来做纯过滤的,这个相当于computed,可以在此处做state数据的计算
	},
	modules:modules //将其他的数据管理器存到这儿
})

export default store;

