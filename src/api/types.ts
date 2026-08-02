// 站点
export interface Site {
  // ID
  id: number
  // 站点名称
  name: string
  // 站点主域名Key
  domain: string
  // 站点地址
  url: string
  // 站点优先级
  pri?: number
  // 下载器
  downloader: string
  // Cookie
  cookie?: string
  // ApiKey
  apikey?: string
  // Token
  token?: string
  // User-Agent
  ua?: string
  // 是否使用代理
  proxy?: any
  // 站点种子过滤规则
  filter?: string
  // 是否演染
  // 是否公开站点
  public?: number
  // 备注
  note?: string
  // 超时时间
  timeout?: number
  // 流控单位周期
  limit_interval?: number
  // 流控次数
  limit_count?: number
  // 流控间隔
  limit_seconds?: number
  // 是否启用
  is_active: boolean
}

// 站点使用统计
export interface SiteStatistic {
  // 站点主域名Key
  domain?: string
  // 成功次数
  success?: number
  // 失败次数
  fail?: number
  // 平均耗时
  seconds?: number
  // 最后一次访问状态 0-成功 1-失败
  lst_state?: number
  // 最后访问时间
  lst_mod_date?: string
  // 耗时记录 JSON
  note?: string
}

// 站点用户数据
export interface SiteUserData {
  // 站点域名
  domain?: string
  // 用户名
  username?: string
  // 用户ID
  userid?: string
  // 用户等级
  user_level?: string
  // 加入时间
  join_at?: string
  // 积分
  bonus?: number // 默认为 0.0
  // 上传量
  upload?: number // 默认为 0
  // 下载量
  download?: number // 默认为 0
  // 分享率
  ratio?: number // 默认为 0
  // 做种数
  seeding?: number // 默认为 0
  // 下载数
  leeching?: number // 默认为 0
  // 做种体积
  seeding_size?: number // 默认为 0
  // 下载体积
  leeching_size?: number // 默认为 0
  // 做种人数, 种子大小
  seeding_info?: any[] // 默认为空数组
  // 未读消息
  message_unread?: number // 默认为 0
  // 未读消息内容
  message_unread_contents?: any[] // 默认为空数组
  // 错误信息
  err_msg?: string | null // 默认为 null
  // 更新日期
  updated_day?: string
  // 更新时间
  updated_time?: string
}

// 正在下载
export interface DownloadingInfo {
  // HASH
  hash?: string
  // 种子名称
  title?: string
  // 大小
  size?: number
  // 下载进 度
  progress?: number
  // 状态
  state?: string
  // 下载速度
  dlspeed?: string
  // 上传速度
  upspeed?: string
  // 下载器分类
  category?: string
  // 下载限速 KB/s
  download_limit?: number
  // 上传限速 KB/s
  upload_limit?: number
  // 保存路径
  save_path?: string
  // 下载用户ID
  userid?: string
  // 下载用户名称
  username?: string
  // 剩余时间
  left_time?: string
}

// 插件
export interface Plugin {
  id: string
  // 插件名称
  plugin_name: string
  // 插件描述
  plugin_desc?: string
  // 插件图标
  plugin_icon?: string
  // 插件标签，多个以,分隔
  plugin_label?: string
  // 插件版本
  plugin_version?: string
  // 插件作者
  plugin_author?: string
  // 作者主页
  author_url?: string
  // 插件配置项ID前缀
  plugin_config_prefix?: string
  // 加载顺序
  plugin_order?: number
  // 可使用的用户级别
  auth_level?: number
  // 是否已安装
  installed?: boolean
  // 运行状态
  state?: boolean
  // Lite 插件运行状态
  runtime_status?: 'not_loaded' | 'running' | 'stopped' | 'load_error' | 'lite_incompatible'
  // Lite 插件运行错误
  runtime_error?: {
    code: 'PLUGIN_LITE_INCOMPATIBLE' | 'PLUGIN_LOAD_FAILED'
    phase: 'manifest' | 'import' | 'construct' | 'preflight' | 'initialize' | 'frontend'
    message: string
    retryable: boolean
  } | null
  // Lite 插件内容指纹
  fingerprint?: string | null
  // 是否有详情页面
  has_page?: boolean
  // 是否有新版本
  has_update?: boolean
  // 主系统版本是否兼容
  system_version_compatible?: boolean
  // 主系统版本兼容提示
  system_version_message?: string
  // 主系统版本限定范围
  system_version?: string
  // 是否声明支持通过 GitHub Release 资产安装
  release?: boolean
  // 是否本地插件
  is_local?: boolean
  // 插件仓库地址
  repo_url?: string
  // 变更历史
  history?: { [key: string]: string }
  // 添加时间
  add_time?: number
  // 页面打开状态
  page_open?: boolean
}

// 插件 Release 可安装版本
export interface PluginReleaseVersion {
  // 插件版本
  version: string
  // GitHub Release tag
  tag_name: string
  // Release 标题
  name?: string
  // 发布时间
  published_at?: string
  // Release 说明
  body?: string
  // 匹配到的资产文件名
  asset_name?: string
  // 是否为当前市场最新版本
  is_latest?: boolean
  // 是否为本地已安装版本
  is_current?: boolean
}

// 插件 Release 可安装版本响应
export interface PluginReleaseVersionsResponse {
  // 当前插件是否存在可直接安装的 Release 资产
  release_supported: boolean
  // 当前市场 package 声明的最新版本
  latest_version?: string | null
  // 本地已安装版本
  current_version?: string | null
  // 可安装版本列表
  items: PluginReleaseVersion[]
}

// 插件侧栏全页导航项（与后端 PluginSidebarNavItem 对齐）
export interface PluginSidebarNavItem {
  plugin_id: string
  nav_key: string
  title: string
  icon: string
  section: 'start' | 'manage' | 'settings'
  permission?: 'search' | 'manage' | 'admin' | null
  order: number
  runtime_status?: Plugin['runtime_status']
}

// 渲染结构
export interface RenderProps {
  component: string
  text?: string
  html?: string
  content?: any
  slots?: any
  props?: any
  events?: any
}

// 仪表板组件
export interface DashboardItem {
  // ID
  id: string
  // 名称
  name: string
  // 插件的仪表板key
  key: string
  // 全局配置
  attrs: { [key: string]: any }
  // col列数
  cols: { [key: string]: number }
  // Grid行数
  rows?: number
  // 页面元素
  elements: RenderProps[]
  // 渲染方式
  render_mode?: string
  runtime_status?: Plugin['runtime_status']
  fingerprint?: string | null
}

// 种子信息
export interface TorrentInfo {
  // 站点ID
  site?: number
  // 站点名称
  site_name?: string
  // 站点Cookie
  site_cookie?: string
  // 站点UA
  site_ua?: string
  // 站点是否使用代理
  site_proxy: boolean
  // 站点优先级
  site_order: number
  // 站点下载器
  site_downloader?: string
  // 种子名称
  title?: string
  // 种子副标题
  description?: string
  // IMDB ID
  imdbid: string
  // 种子链接
  enclosure?: string
  // 详情页面
  page_url?: string
  // 种子大小
  size: number
  // 做种者
  seeders: number
  // 下载者
  peers: number
  // 完成者
  grabs: number
  // 发布时间
  pubdate?: string
  // 已过时间
  date_elapsed?: string
  // 上传因子
  uploadvolumefactor: number
  // 下载因子
  downloadvolumefactor: number
  // HR
  hit_and_run: boolean
  // 种子标签
  labels: string[]
  // 种子优先级
  pri_order: number
  // 促销描述
  volume_factor: string
  // 免费时间
  freedate: string
  // 剩余免费时间
  freedate_diff: string
  // 种子类型
  category: string
}

// 用户信息
export interface User {
  // 用户ID
  id: number
  // 用户名称
  name: string
  // 用户密码
  password: string
  // 用户邮箱
  email: string
  // 是否激活
  is_active: boolean
  // 是否管理员
  is_superuser: boolean
  // 头像
  avatar: string
  // 是否开启二次验证
  is_otp: boolean
  // 用户权限 json
  permissions: { [key: string]: any }
  // 用户个性化设置 json
  settings: { [key: string]: string | null }
  // 昵称
  nickname?: string
}

// 通行密钥
export interface PassKey {
  id: number
  name: string
  created_at: string
  last_used_at?: string
  aaguid?: string
  transports?: string
}

// 消息通知
export interface Message {
  // 消息ID
  id?: number
  // 消息渠道
  channel?: string
  // 消息来源
  source?: string
  // 消息类型
  mtype?: string
  // 消息标题
  title?: string
  // 消息内容
  text?: string
  // 消息链接
  link?: string
  // 消息图片
  image?: string
  // 消息时间
  date?: string
  // 登记时间
  reg_time?: string
  // 用户ID
  userid?: string
  // 消息方向：0-接收，1-发送
  action?: number
  // JSON
  note?: string | any[] | Record<string, any>
}

// 系统通知
export interface SystemNotification extends Message {
  // 通知类型 user/system/plugin/notification
  type?: string
  // 通知时间
  date?: string
  // 是否已读
  read?: boolean
}

// 下载器配置
export interface DownloaderConf {
  // 名称
  name: string
  // 类型 qbittorrent/transmission
  type: string
  // 是否默认
  default: boolean
  // 配置
  config: { [key: string]: any }
  // 是否启用
  enabled: boolean
  // 路径映射
  path_mapping?: Array<[storagePath: string, downloadPath: string]>
}

// 通知配置
export interface NotificationConf {
  // 名称
  name: string
  // 类型 telegram/wechat/vocechat/synologychat
  type: string
  // 配置
  config: { [key: string]: any }
  // 场景开关
  switchs?: string[]
  // 是否启用
  enabled: boolean
}

// 通知场景开关配置
export interface NotificationSwitchConf {
  // 场景名称
  type: string
  // 通知范围 all/user/admin
  action: string
}

// 站点资源分类
export interface SiteCategory {
  id: number
  cat: string
  desc: string
}

// 通用API响应
export interface ApiResponse<T = any> {
  success: boolean
  code?: string | null
  message?: string
  message_i18n?: string
  data: T
}
