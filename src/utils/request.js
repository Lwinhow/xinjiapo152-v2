/*网络请求配置，基于axios*/
import axios from "axios";
import config from '@/utils/config.js';

console.log("当前环境",process.env.NODE_ENV);  

let service = axios.create({ //创建axios通用配置实例
	baseURL:config[process.env.NODE_ENV].baseUrl,
	//baseURL2:config[process.env.NODE_ENV].baseUrl2,
	timeout: 30000
});
// 请求拦截配置
service.interceptors.request.use(
  config => {
	//config.headers['token'] = 
    return config
  },
  error => {
    console.log(error)
    return Promise.reject(error)
  }
)

// 响应拦截配置
service.interceptors.response.use(
  response => {
	//console.log('response',response)
    return response.data
  },
  error => {
    console.log('err' + error)
    //return Promise.reject(error)
  }
)
//console.log("ahha",request)
export default service;
