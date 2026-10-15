// 自定义拖拽指令
//1.参数一：指令的名称，定义时指令前面不需要写v-
//2.参数二：是一个对象，该对象中有相关的操作函数
//3.在调用的时候必须写v-
const drag = {
	//1.指令绑定到元素上回立刻执行bind函数，只执行一次
	//2.每个函数中第一个参数永远是el，表示绑定指令的元素，el参数是原生js对象
	bind: function() {},
	//inserted表示一个元素，插入到DOM中会执行inserted函数，只触发一次
	inserted: function(el, binding) {// 可以利用 binding 传参
		el.onmousedown = function(e) {
			//console.log("e",e,el,el.childNodes)
			e.stopPropagation();
			let dom =  el.parentNode.parentNode;
			//let dom =  el.childNodes[0].parentNode;
			let disx = e.pageX - dom.offsetLeft;
			let disy = e.pageY - dom.offsetTop;
			document.onmousemove = function(e) {
				e.preventDefault();
				dom.style.left = e.pageX - disx + 'px';
				dom.style.top = e.pageY - disy + 'px';
			}
			document.onmouseup = function() {
				document.onmousemove = document.onmouseup = null;
			}
		}
	},
	//当VNode更新的时候会执行updated，可以触发多次
	updated: function() {}
}

export default drag;
