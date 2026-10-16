/* 在package.json文件中通过 --mode 配置运行的指定模式后,process.env.NODE_ENV有如下三个值：
production 线上生产环境
development 本地开发环境
test 线上开发/测试环境 
PS: --mode只能指定如上三种环境变量值
*/

export default {
	development: {//开发环境
		//baseUrl: '/tyl', //接口路径  走反向代理
		baseUrl:"http://172.168.34.19:3000",//接口路径
		// playerPath: "127.0.0.1:8080",
		playerPath: "172.168.34.13:8080",
		playerExampleId: '2462623268777',
		bimUrl:window.location.origin,
	},
	test: {// 测试环境
		baseUrl:'http://122.11.233.165:3000',
		playerPath: "122.11.233.165:8080",
		playerExampleId: '2462623268777',
		bimUrl:'@path:',
	},
	production: {// 生产环境
		baseUrl:'http://122.11.233.165:3000',
		playerPath: "122.11.233.165:8080",
		playerExampleId: '2462623268777',
		bimUrl:'@path:',
	}
}
