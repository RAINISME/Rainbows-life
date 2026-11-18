/* ============================================================
   示例数据  ——  全部在这里改，页面会自动渲染
   替换成你自己的内容即可（名字、经历、兴趣、日常）
   ============================================================ */

/* 工作经历：当前「工作」板块以 index.html 中的静态综述呈现（按需求简化为总览，
   不展开逐条时间线）。如需时间线，可在此定义 WORK 数组并在 index.html 增加
   <div id="workTimeline"></div>，main.js 已预留渲染逻辑。 */

// 兴趣与热爱
// id 用于子页面跳转（hobby.html?h=<id>）；items 为该兴趣下的细分项目
// item.link 可选：填了就在卡片上显示「查看记录 →」按钮（如跑步对接 running_page 主页）
const RUNNING_PAGE_URL = "https://rainisme.github.io/running_page/";  // 跑步记录主页（running_page 自动同步 Keep 数据）

const HOBBIES = [
  {
    id: "sport", icon: "🏃", title: "运动",
    href: "sport.html",   // 直达运动记录页（跳过细分卡片列表）
    desc: "跑步、骑行、羽毛球、乒乓球、台球，动静皆宜，周末总想动一动。",
    since: "日常",
    items: [
      { icon: "🏃", name: "跑步", note: "清晨或夜跑，一个人也能很自在。", sportType: "跑步" },
      { icon: "🚴", name: "骑行", note: "周末刷街，追风一样的自由。", sportType: "骑行" },
      { icon: "🏸", name: "羽毛球", note: "约上朋友，一场大汗淋漓。" },
      { icon: "🏓", name: "乒乓球", note: "国球，办公室也能来两拍。", sportType: "乒乓" },
      { icon: "🎱", name: "台球", note: "安静的专注，杆法即心境。" },
      { icon: "🚶", name: "走路", note: "不赶路的步行，也是一种放松。", sportType: "走路" },
      { icon: "🧘", name: "瑜伽", note: "舒展身体，安放呼吸。", sportType: "瑜伽" },
      { icon: "💪", name: "健身", note: "力量与坚持的日常。", sportType: "健身" }
    ]
  },
  {
    id: "music", icon: "🎵", title: "音乐",
    desc: "喜欢唱歌，也玩点乐器，心情好不好都靠它。",
    since: "从小",
    items: [
      { icon: "🎤", name: "唱歌", note: "KTV 麦霸，解压首选。" },
      { icon: "🎸", name: "吉他", note: "弹唱一首，安放安静的夜晚。" },
      { icon: "🎹", name: "电子琴", note: "随手弹点旋律，治愈自己。" },
      { icon: "🪈", name: "陶笛", note: "一小只握在手心，声音空灵又治愈。" },
      { icon: "🎫", name: "演唱会", note: "现场的热烈，耳机里听不到。" }
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
    name: "小芒果 · 小白 · 小绿 · 小叮当 · 小骆驼",
    species: "虎皮鹦鹉 · 小太阳鹦鹉",
    since: "2025.5.19 至今",
    desc: "五只小可爱，每天从早叫到晚，家里就没安静过。",
    traits: ["活泼", "粘人", "爱叫", "会说话"],
    dailyUrl: "pet-daily.html",
    photos: [
      { src: "assets/img/pet-mango.webp", alt: "小芒果" },
      { src: "assets/img/pet-white.webp", alt: "小白" },
      { src: "assets/img/pet-green.webp", alt: "小绿" },
      { src: "assets/img/pet-dingdang.webp", alt: "小叮当" },
      { src: "assets/img/pet-luotuo.webp", alt: "小骆驼" }
    ]
  }
];

/* 鹦鹉日常：视频占位
   后期上传视频时：把视频文件放到 assets/video/ 下，
   然后把对应项的 src 填成 "assets/video/xxx.mp4"（poster 可选，为封面图路径），
   页面会自动把「筹备中」的占位卡替换成可播放的 <video controls>。
   没填 src 的项会继续显示为占位卡。 */
const PET_VIDEOS = [
  { title: "说话日常", desc: "小黄鹦鹉开口说话，叽叽喳喳说个不停。", src: "assets/video/parrot-5.mp4", poster: "assets/video/parrot-5.webp" },
  { title: "摸摸小肚子", desc: "翻过来给你摸摸，乖得很。", src: "assets/video/parrot-2.mp4", poster: "assets/video/parrot-2.webp" },
  { title: "站岗的小鹦鹉", desc: "站在盒子上东张西望。", src: "assets/video/parrot-3.mp4", poster: "assets/video/parrot-3.webp" },
  { title: "开饭时间", desc: "两只凑一起，埋头干饭。", src: "assets/video/parrot-4.mp4", poster: "assets/video/parrot-4.webp" }
];

// 音乐播放器歌单（第一首为默认歌曲；列表循环播放；进页面不自动播放，用户点 ▶ 或选歌才响）
// 数据源：全部音频文件都放在项目内 assets/audio/ 下，页面运行时只读这里列的相对路径，
//         不依赖任何外部目录（微信收到的文件需先复制进 assets/audio/ 再在此登记）。
// 加歌：把音频（mp3 / wav 均可）放进 assets/audio/，在下面加一行 { title, artist, src } 即可。
// 注意：歌单为空时播放器自动进入「歌单待定」占位状态，配好歌后自动恢复。
// 2026-11-16：歌单暂时清空（歌曲文件已从仓库删除），想好用哪首再传回来。
const PLAYLIST = [];

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

/* ============================================================
   站长模式配置 —— 日常记录「只有站长能增删改，其他人只能看」
   ------------------------------------------------------------
   进入方式（两种）：
     1) 网址后加 ?me=1  （例如 index.html?me=1）
     2) 连续点击页脚「© 2026 彩虹 · 用心记录每一天」3 次（隐藏入口）
   默认密码：rainbow2026
   改密码：把新密码的 SHA-256 十六进制填到下面 hash 里。
     生成方法（浏览器控制台执行）：
       crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的新密码'))
         .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
   说明：这是纯前端的「软门禁」，目的是防止路人误操作/随手改，
         不能替代真正的服务端鉴权（静态站点没有后端）。
   ------------------------------------------------------------
   一键发布：站长模式下首次点「发布到线上」会让你粘贴一个 GitHub Token
   （需要该仓库 Contents 读写权限），Token 只存在你本机浏览器，
   发布时通过 GitHub API 更新 journalData.path 指向的文件，全站生效。
   ============================================================ */
const OWNER = {
  hash: "0bb27746937610744f3c1129266330ff3a0b4f4795761662e7b3ad6a08e624dd",
  repo: "RAINISME/Rainbows-life",   // GitHub 仓库（owner/repo）
  branch: "main",                    // 分支
  journalPath: "assets/js/journal-data.json"  // 日常记录数据文件
};

/* ============================================================
   留言板后端（Supabase）
   - url / key 都是公开信息（publishable key 本来就要打包进网页），
     安全性由数据库 RLS 策略保证：anon 只能 INSERT，站长登录后才能 SELECT/DELETE。
   - 站长登录用邮箱验证码（Supabase Auth OTP），不额外注册账号。
   ============================================================ */
const GUESTBOOK = {
  url: "https://ojcegjyawjlbmixcvkoh.supabase.co",
  key: "sb_publishable_kgz6S0Lgy7isr6GZgCqRdw_oSM4h7KL",
  table: "guestbook"
};

/* ============================================================
   访问记录（Supabase visits 表）
   - 每个页面打开时写入一条匿名记录（页面路径 + 来源页），由 track.js 上报。
   - anon 只能 INSERT（RLS 保证），明细只有站长能看。
   - 公开计数走 visit_count() 只读函数：只返回一个总数字，不暴露任何明细。
   ============================================================ */
const VISITS = {
  url: "https://ojcegjyawjlbmixcvkoh.supabase.co",
  key: "sb_publishable_kgz6S0Lgy7isr6GZgCqRdw_oSM4h7KL",
  table: "visits",
  countFn: "visit_count"   // Supabase 只读计数函数（SECURITY DEFINER，仅返回总数）
};

/* ============================================================
   运动记录（Supabase workouts 表，方案 B）
   - GitHub Actions 每天从 Keep 抓取跑步/骑行/走路/乒乓等，按类型写入
   - anon 只读；sport.html 按 ?type= 分类展示
   ============================================================ */
const WORKOUTS = {
  url: "https://ojcegjyawjlbmixcvkoh.supabase.co",
  key: "sb_publishable_kgz6S0Lgy7isr6GZgCqRdw_oSM4h7KL",
  table: "workouts"
};
