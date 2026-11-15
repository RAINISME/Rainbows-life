/* ============================================================
   示例数据  ——  全部在这里改，页面会自动渲染
   替换成你自己的内容即可（名字、经历、兴趣、日常）
   ============================================================ */

/* 工作经历：当前「工作」板块以 index.html 中的静态综述呈现（按需求简化为总览，
   不展开逐条时间线）。如需时间线，可在此定义 WORK 数组并在 index.html 增加
   <div id="workTimeline"></div>，main.js 已预留渲染逻辑。 */

// 兴趣与热爱
// id 用于子页面跳转（hobby.html?h=<id>）；items 为该兴趣下的细分项目
const HOBBIES = [
  {
    id: "sport", icon: "🏃", title: "运动",
    desc: "跑步、骑行、羽毛球、乒乓球、台球，动静皆宜，周末总想动一动。",
    since: "日常",
    items: [
      { icon: "🏃", name: "跑步", note: "清晨或夜跑，一个人也能很自在。" },
      { icon: "🚴", name: "骑行", note: "周末刷街，追风一样的自由。" },
      { icon: "🏸", name: "羽毛球", note: "约上朋友，一场大汗淋漓。" },
      { icon: "🏓", name: "乒乓球", note: "国球，办公室也能来两拍。" },
      { icon: "🎱", name: "台球", note: "安静的专注，杆法即心境。" },
      { icon: "🏊", name: "游泳", note: "入水一刻，世界都安静了。" }
    ]
  },
  {
    id: "music", icon: "🎵", title: "音乐",
    desc: "喜欢唱歌，也玩点乐器，心情好不好都靠它。",
    since: "从小",
    items: [
      { icon: "🎤", name: "唱歌", note: "KTV 麦霸，解压首选。" },
      { icon: "🎸", name: "吉他", note: "弹唱一首，安放安静的夜晚。" },
      { icon: "🎹", name: "电子琴", note: "随手弹点旋律，治愈自己。" }
    ]
  },
  {
    id: "cooking", icon: "🍳", title: "做饭",
    desc: "周末的厨房是我最放松的地方，喜欢折腾新菜。",
    since: "2019 至今",
    items: [
      { icon: "🥘", name: "家常菜", note: "一荤一素，最抚凡人心。" },
      { icon: "🍜", name: "面食", note: "手擀面，北方的根。" },
      { icon: "🧁", name: "烘焙", note: "烤箱里的惊喜。" },
      { icon: "🍲", name: "汤羹", note: "慢炖一锅，暖胃暖心。" }
    ]
  },
  {
    id: "travel", icon: "✈️", title: "旅游",
    desc: "一个人也敢出发，迷路也是风景，在路上最自在。",
    since: "永远",
    items: [
      { icon: "🌊", name: "看海", note: "听浪发呆，什么都不想。" },
      { icon: "⛰️", name: "爬山", note: "登顶的那一瞬，值了。" },
      { icon: "🚶", name: "City Walk", note: "城市里慢走，发现角落。" },
      { icon: "⛺", name: "露营", note: "星空下睡一晚。" }
    ]
  }
];

// 我的宠物（可放多只；photos 为右侧展示的照片路径）
const PETS = [
  {
    emoji: "🦜",
    name: "小芒果 · 小白 · 小绿",
    species: "虎皮鹦鹉",
    since: "2025.5.19 至今",
    desc: "三只小话痨，每天从早叫到晚，家里就没安静过。",
    traits: ["活泼", "粘人", "爱叫", "会说话"],
    dailyUrl: "pet-daily.html",
    photos: [
      { src: "assets/img/pet-mango.jpg", alt: "小芒果" },
      { src: "assets/img/pet-white.jpg", alt: "小白" },
      { src: "assets/img/pet-green.jpg", alt: "小绿" }
    ]
  }
];

/* 鹦鹉日常：视频占位
   后期上传视频时：把视频文件放到 assets/video/ 下，
   然后把对应项的 src 填成 "assets/video/xxx.mp4"（poster 可选，为封面图路径），
   页面会自动把「筹备中」的占位卡替换成可播放的 <video controls>。
   没填 src 的项会继续显示为占位卡。 */
const PET_VIDEOS = [
  { title: "第一次学说话", desc: "小芒果的碎碎念，正在剪辑中～", src: "", poster: "" },
  { title: "三小只的日常", desc: "吃饭、理毛、抢站台，慢慢更新。", src: "", poster: "" },
  { title: "晒太阳的午后", desc: "窗边最爱的那个位置。", src: "", poster: "" }
];

// 音乐播放器歌单（第一首为默认歌曲；列表循环播放、进入页面自动播放）
// 数据源：全部音频文件都放在项目内 assets/audio/ 下，页面运行时只读这里列的相对路径，
//         不依赖任何外部目录（微信收到的文件需先复制进 assets/audio/ 再在此登记）。
// 加歌：把音频（mp3 / wav 均可）放进 assets/audio/，在下面加一行 { title, artist, src } 即可。
const PLAYLIST = [
  { title: "爱死了昨天", artist: "彩虹", src: "assets/audio/01.mp3?v=2" },
  { title: "曾经最爱", artist: "彩虹", src: "assets/audio/02.mp3?v=2" },
  { title: "小雪（片段）", artist: "彩虹", src: "assets/audio/03.mp3?v=2" },
  { title: "深爱的人做不了朋友", artist: "彩虹", src: "assets/audio/04.mp3?v=2" },
  { title: "预谋", artist: "彩虹", src: "assets/audio/05.mp3?v=2" }
];

// 日常记录（倒序：最新的放最上面）
// mood 可填任意 emoji；tags 随意
// 说明：通过页面「新增记录」添加的条目会存到 localStorage（key: journal-entries），刷新不丢失
const JOURNAL = [
  {
    date: "2026-11-12",
    title: "把个人空间搭好了",
    mood: "🎉 开心",
    desc: "花了一个下午做了这个网站，终于有了一个属于自己的小角落。接下来要把每天的碎片都记下来。",
    tags: ["生活", "建站"]
  }
];
