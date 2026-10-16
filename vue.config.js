/* 更多配置参考：https://cli.vuejs.org/zh/guide/mode-and-env.html */
const { defineConfig } = require('@vue/cli-service');
//const webpack = require('webpack');
module.exports = defineConfig({
	transpileDependencies: true,
	publicPath: './', // 必须配置这个，否则打包后的文件无法使用
	//打包输出文件夹名称
	//outputDir: `dist/${process.env.NODE_ENV}`,
	outputDir:"dist",
	//放置生成的静态资源 (js、css、img、fonts) 的 (相对于 outputDir 的) 目录。
	assetsDir: 'static',
	pages: {
		index: {
			// page 的入口
			entry: 'src/main.js',
			// 当使用 title 选项时，template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
			title: 'Yantron',
		},
	},
	lintOnSave: false,// 关闭eslint
	/* configureWebpack: (config) => {
		// 定义全局变量
		config.plugins.push(new webpack.ProvidePlugin({
			echarts: 'echarts'
		}));
	}, */
	devServer: {
		port: 9152,
		//open: true,// 是否自动打开项目
		proxy: { // 反向代理配置，解决前端本地跨域问题
			'/tyl': {
				target: 'https://dev-partybuilding.tylin.com.cn/partybuilding',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/tyl': '',
				},
			},
			// 上传接口。生产环境由 server/index.mjs 同时提供 /data 与 /api；
			// 开发环境的版本数据仍走 public/data（不代理 /data），只有上传需要转发。
			// 需先起 `npm run upload-server`，它会把数据写进 public/data ——
			// 直接 `node server/index.mjs` 写的是 ROOT/data，dev 下前端读不到。
			'/api': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				ws: false,
			},
		},
		client: {// 解决vue项目将决Uncaught runtime errors类型的错误报到浏览器上的问题
			overlay: false // 设为false则不将此类型的错误报到浏览器上
		}
	},
})
