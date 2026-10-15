// 全局方法、全局组件、全局指令、全局过滤器的注册文件
// 注册方式举例如下，可以将函数/对象单独用一个js文件写好，引入到该文件注册即可，保持该文件干净整洁

import * as globalMethods from "@/utils/globalMethods.js";
export default {
	install:(Vue)=>{
		// 注册全局组件
		//Vue.component('countTo',countTo);
		// 注册全局方法
		Object.keys(globalMethods).forEach((key)=>{
			Vue.prototype[key] = globalMethods[key];
		})
		/* 以下为使用教程，正式做项目可以删了
		// 全局指令
		//Vue.directive('drag',drag);
		Vue.directive('color',{
			//1.指令绑定到元素上回立刻执行bind函数，只执行一次
			//2.每个函数中第一个参数永远是el，表示绑定指令的元素，el参数是原生js对象
			bind: function() {},
			//inserted表示一个元素，插入到DOM中会执行inserted函数，只触发一次
			inserted: function(el, binding) {// 可以利用 binding 传参
				console.log("color",el,binding);
				el.style.color = binding.value;
			},
			//当VNode更新的时候会执行updated，可以触发多次
			updated: function() {}
		});
		// 全局过滤器
		Vue.filter('my-filter', function (value) {
			console.log("filter",value);
			return value.toString().split("").join(",")
		})*/	
	}
}