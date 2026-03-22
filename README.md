# 简介
为拓竹P1系列提供的控制屏操作软件

P1系列屏幕操作指南：https://wiki.bambulab.com/en/p1/manual/screen-operation
P2S屏幕操作指南：https://wiki.bambulab.com/en/p2s/manual/screen-operation
拓竹局域网控制协议文档：https://github.com/Doridian/OpenBambuAPI/

# 打印屏功能列表
- 主页
- 控制
    - 喷嘴温度
    - 热床温度
    - 打印速度
    - 上下料
    - 挤出机（E）
    - Z轴升降（Z）
    - XY轴控制（X/Y）
- 耗材
    - AMS料盘
    - 外挂料盘
    - 工具
    - 指南
- 设置
    - 账号（绑定）
    - SD卡
    - 设备
    - 固件
    - 配件
    - 校准
- 文件夹

# 使用场景
- 触屏移动端设备，横屏使用
- 分辨率最低需适配568x320（iPhone5）
- 老旧设备，避免性能开销大的阴影和动画效果

# 整体架构
## 前端
- 主要使用 typescript + vue3 + vant4 实现
- 左侧导航栏，右侧显示页面，占满屏幕
- 页面默认占满一屏，若内容较多则向下滑动显示

## 后端
- 使用 typescript 运行 mqtt to websocket 转发服务
- 协议实现参考：https://github.com/BambuTools/bambulabs_api

## 使用步骤
1. 部署后端服务
2. 手机端添加浏览器桌面书签（http://后端ip/?ip=打印机&serial=序列号&code=访问码）

## TODO
- 主页
    - 打印任务数据（项目id，url，预览图）持久化
- 控制页
    - gcode操作：X、Y、Z、E、Home
    - fan滑动条随状态改变
- 耗材页
    - 耗材编辑、进退料、UI优化
- 文件页
    - ftps获取文件列表
- apk构建
- 观察状态变化(https://github.com/greghesp/ha-bambulab/blob/054946b6ab40bdeb772a22abb91b1537a24263fb/custom_components/bambu_lab/pybambu/const.py#L71)
    - stg_cur: CURRENT_STAGE_IDS
    - print_type: GCODE_STATE_OPTIONS

