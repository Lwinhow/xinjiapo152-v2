/**
 * 3D 标记渲染
 *
 * 本模块只负责「把数据画出来」，不再持有任何数据 ——
 * 数据全部来自 @/data/store 的 db。
 *
 * 时序门闩：引擎就绪（db.engineReady）与数据就绪（db.dataReady）缺一不可。
 * 未就绪时 requestMarkers 只暂存 tab，绝不进入 addMarker* ——
 * 那几个函数一进门就 clear()，空数据会把已有点位清掉。
 *
 * 注意：标记点的 co 是 [x, y, z] 三元组。RCID 表只提供 X/Y 两列，
 * Z 沿用既有硬编码值（见 tools/ 里的 zByLocation 映射表）。
 */
import {db} from '@/data/store'
import config from '@/utils/config.js';
const path = config[process.env.NODE_ENV].bimUrl

const riskColorMap = {
    'On Track': '#099100',
    'At Risk': '#9c9200',
    'High Risk': '#da2222'
}

const safetyImgMap = {
    'Utility Damage': 'safety1.png',
    'Non-MOM Incident': 'safety2.png',
    'MOM ≥ 3d MC': 'safety3.png',
    'MOM < 3d MC': 'safety4.png',
    'Env. Infringement': 'safety5.png',
    'Near Miss (Cat A)': 'safety6.png',
    'Vector Control': 'safety7.png',
}

let tab0 = ''
let z0 = 1

/* ---------------- 时序门闩 ---------------- */

let pendingTab = null
let flushing = false

function dataFor(tab) {
    if (tab === 'safety') return db.safety.safetyPoints || []
    if (tab === 'monitor') return db.monitors || []
    return db.progressRisk.riskZones || []
}

async function flush() {
    if (flushing) return
    if (!db.engineReady || !db.dataReady || pendingTab == null) return
    flushing = true
    const tab = pendingTab
    pendingTab = null
    try {
        const data = dataFor(tab)
        if (tab === 'safety') await addMarkerSafetyPoints(data, tab)
        else if (tab === 'monitor') await addMarkerMonitor(data, tab)
        else await addMarkerZones(data, tab)
    } finally {
        flushing = false
    }
}

/** 请求渲染某个 tab 的标记。引擎或数据未就绪则只暂存，等两者到齐自动补齐。 */
export function requestMarkers(tab) {
    pendingTab = tab
    return flush()
}

/** 由 index.vue 的 onReady 回调调用 */
export function notifyEngineReady() {
    db.engineReady = true
    return flush()
}

/** 由数据加载完成后调用 */
export function notifyDataReady() {
    db.dataReady = true
    return flush()
}

/* ---------------- 渲染 ---------------- */

export const addMarkerZones = async (data, tab = 'overview') => {
    tab0 = tab
    z0 = 1
    __g.marker.clear()
    __g.marker3d.clear()
    __g.customObject.clear()
    let allMarkArr = [];
    let allMarkerArr1 = [];// 所有标签的修改参数
    data.forEach((item, index) => {
        let o1 = {
            id: item.name,
            pakFilePath: '@path:DTS_Library.pak',//3D标注显示文字是否显示文本
            assetPath: '/JC_CustomAssets/EffectLibrary/Exhibition/3DUI/3D_UI_C_5',//3D标注展示的特效名称
            location: item.co,//坐标位置
            coordinateType: 0,// 坐标系类型
            rotation: [0, 0, 0],// 世界坐标系旋转
            range: [0, 10000000],//可见范围
            groupId: "zones",//分组id
            localRotation: [0, 0, 0],//模型自身旋转
            scale: [2, 2, 2],//模型缩放
            isEffectRotation: false,//是否开启旋转效果
            smoothMotion: 1,   //1: 平滑移动，0: 跳跃移动
            enableDecal: false, //不支持贴画贴合
            visible: true,//模型加载后默认是否显示
            autoHeight: false, //是否开启自动高度 开启后自动贴地不再使用坐标Z
            collision: true, //可选，设置自定义对象加载后是否开启碰撞，默认：true
        };
        allMarkArr.push(o1)
        allMarkerArr1.push(
            {
                id: item.name,
                functionName: '数据',
                parameters: [
                    {"name": "数据内容", "paramType": 5, "paramValue": item.pct + '%'},
                    {"name": "数据颜色", "paramType": 6, "paramValue": hexToRgbArray(riskColorMap[item.risk], 1)},
                    {"name": "数据背景", "paramType": 16, "paramValue": "图标背景D"},
                ]
            },
            {
                id: item.name,
                functionName: '文字',
                parameters: [
                    {"name": "文字内容", "paramType": 5, "paramValue": item.name},
                    {"name": "文字颜色", "paramType": 6, "paramValue": [1, 1, 1, 1]},
                    {"name": "背景颜色", "paramType": 6, "paramValue": hexToRgbArray(riskColorMap[item.risk], 1)},
                    {"name": "背景样式", "paramType": 16, "paramValue": '背景样式4'},
                ]
            })
    })
    await __g.customObject.add(allMarkArr, () => {
        __g.customObject.callBPFunction(allMarkerArr1);
    });
    __g.camera.get().then(async (res) => {
        setScaleCo(res.z)
    })
}

//缩放比例
function changeZ(z) {
    const map = [
        [2000, 36],
        [1800, 32],
        [1600, 24],
        [1400, 22],
        [1200, 20],
        [1000, 18],
        [800, 16],
        [600, 14],
        [500, 12],
        [400, 10],
        [300, 8],
        [200, 6],
        [100, 4],
    ];
    for (const [limit, val] of map) {
        if (z > limit) return val;
    }
    return 2;
}

export const setScaleCo = async (z) => {
    let z1 = changeZ(z)
    if (z0 === z1) return
    z0 = z1
    // 只有 overview 的标记点是 customObject，才有 setScale 接口；
    // safety / monitor 走的是 __g.marker，不参与缩放。
    if (tab0 !== 'overview') return
    const data = db.progressRisk.riskZones || []
    fdapi.customObject.updateBegin()
    for (let i = 0; i < data.length; i++) {
        fdapi.customObject.setScale(data[i].name, [z1, z1, z1])
    }
    fdapi.customObject.updateEnd()
}

export const addMarkerSafetyPoints = async (data, tab = 'safety') => {
    tab0 = tab
    __g.marker.clear()
    __g.marker3d.clear()
    __g.customObject.clear()
    let allMarkArr = [];
    data.forEach((item, index) => {
        const imgFile = safetyImgMap[item.cat] || 'safety1.png'
        let o1 = {
            id: item.cat,//折线唯一标识id
            groupId: 'safetyPoints',
            coordinate: item.co,//构成折线的坐标点数组
            coordinateType: 0,//坐标系类型，取值范围：0为Projection类型，1为WGS84类型，2为火星坐标系(GCJ02)，3为百度坐标系(BD09)，默认值：0
            anchors: [-32, 64],
            imageSize: [64, 64],//图片的尺寸
            range: [0, 1000000],//可视范围
            imagePath: path + '/marker/' + imgFile,//显示图片路径
            hoverImagePath: path + '/marker/' + imgFile,//显示图片路径

            showLine: true,//标注点下方是否显示垂直牵引线
            lineSize: [2, 20],
            lineOffset: [32, 0],

            autoHidePopupWindow: true,//失去焦点后是否自动关闭弹出窗口
            autoHeight: false,// 自动判断下方是否有物体
            displayMode: 2,//智能显示模式  开发过程中请根据业务需求判断使用四种显示模式
            clusterByImage: false,// 聚合时是否根据图片路径分类，即当多个marker的imagePath路径参数相同时按路径对marker分类聚合
            priority: 0,//避让优先级
            occlusionCull: false//是否参与遮挡剔除
        };
        allMarkArr.push(o1)
    })
    await __g.marker.add(allMarkArr);
}

//颜色转换
function hexToRgbArray(hex, op) {
    if (!hex) return [1, 1, 1, op]
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return [r / 255, g / 255, b / 255, op];
}

export const addMarkerMonitor = async (data, tab = 'monitor') => {
    tab0 = tab
    __g.marker.clear()
    __g.marker3d.clear()
    __g.customObject.clear()
    let allMarkArr = [];
    data.forEach((item, index) => {
        let o1 = {
            id: item.id,//折线唯一标识id
            groupId: 'Monitor',
            coordinate: item.co,//构成折线的坐标点数组
            coordinateType: 0,//坐标系类型，取值范围：0为Projection类型，1为WGS84类型，2为火星坐标系(GCJ02)，3为百度坐标系(BD09)，默认值：0
            anchors: [-32, 64],
            imageSize: [64, 64],//图片的尺寸
            range: [0, 1000000],//可视范围
            imagePath: path + '/marker/m000.png',//显示图片路径
            hoverImagePath: path + '/marker/m000.png',//显示图片路径

            showLine: false,//标注点下方是否显示垂直牵引线

            autoHidePopupWindow: true,//失去焦点后是否自动关闭弹出窗口
            autoHeight: false,// 自动判断下方是否有物体
            displayMode: 2,//智能显示模式  开发过程中请根据业务需求判断使用四种显示模式
            clusterByImage: false,// 聚合时是否根据图片路径分类，即当多个marker的imagePath路径参数相同时按路径对marker分类聚合
            priority: 0,//避让优先级
            occlusionCull: false//是否参与遮挡剔除
        };
        allMarkArr.push(o1)
    })
    await __g.marker.add(allMarkArr);
}
