/* 在package.json文件中通过 --mode 配置运行的指定模式后,process.env.NODE_ENV有如下三个值：
production 线上生产环境
development 本地开发环境
test 线上开发/测试环境 
PS: --mode只能指定如上三种环境变量值
*/

export default {
	development: {//开发环境
		//baseUrl: '/tyl', //接口路径  走反向代理
		baseUrl:"https://dev-partybuilding.tylin.com.cn/partybuilding",//接口路径
		// playerPath: "127.0.0.1:8080",
		playerPath: "172.168.34.24:8080",
		playerExampleId: '2462623268777',
	},
	test: {// 测试环境
		baseUrl:"https://test-partybuilding.tylin.com.cn/partybuilding",
		playerPath: "127.0.0.1:8080",
		playerExampleId: '2462623268777',
	},
	production: {// 生产环境
		baseUrl:"https://ies-partybuilding.tylin.com.cn/partybuilding",
		playerPath: "127.0.0.1:8080",
		playerExampleId: '2462623268777',
	}
}
