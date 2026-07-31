export default {
  name: 'MoreTab',
  template: `
    <div class="content-section manager-padding" style="padding: 15px 15px 80px 15px;">
      
      <div v-if="activeSubTab === 'memo'">
        <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <button class="btn" style="background:#666; padding: 6px 14px; font-size: 13px; border-radius: 8px;" @click="backToGrid">◀ 返回更多服务</button>
          <span style="font-weight: bold; font-size: 15px; color: #333;">📝 家庭备忘录</span>
        </div>
        <memo-tab></memo-tab>
      </div>

      <div v-else-if="activeSubTab === 'calendar'">
        <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <button class="btn" style="background:#666; padding: 6px 14px; font-size: 13px; border-radius: 8px;" @click="backToGrid">◀ 返回更多服务</button>
          <span style="font-weight: bold; font-size: 15px; color: #333;">📅 家庭日历</span>
        </div>
        <calendar-tab></calendar-tab>
      </div>

      <div v-else-if="activeSubTab === 'recipe'">
        <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <button class="btn" style="background:#666; padding: 6px 14px; font-size: 13px; border-radius: 8px;" @click="backToGrid">◀ 返回更多服务</button>
          <span style="font-weight: bold; font-size: 15px; color: #333;">🍳 家庭菜谱</span>
        </div>
        <recipe-tab></recipe-tab>
      </div>

      <div v-else style="width: 100%; box-sizing: border-box;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; box-sizing: border-box;">
          <div 
            v-for="item in appList" 
            :key="item.id" 
            @click="openApp(item)"
            style="background: #ffffff; border-radius: 12px; padding: 18px 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); border: 1px solid #edf0f7; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; cursor: pointer; box-sizing: border-box; width: 100%; min-width: 0;"
          >
            <span :style="{
                position: 'absolute', top: '6px', right: '6px',
                background: item.badge === '规划中' ? '#f5f5f5' : '#e0f7fa',
                color: item.badge === '规划中' ? '#9e9e9e' : '#00838f',
                fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold'
              }">{{ item.badge }}</span>
            
            <span style="font-size: 32px; line-height: 1; margin-bottom: 8px; display: block;">{{ item.icon }}</span>
            <div style="font-size: 14px; font-weight: bold; color: #2c3e50; margin-bottom: 4px;">{{ item.name }}</div>
            <div style="font-size: 11px; color: #8a94a6;">{{ item.desc }}</div>
          </div>
        </div>
      </div>

    </div>
  `,
  // 异步组件注册，只有在点击进入对应功能时，浏览器才会去加载对应的 JS 文件
  components: {
    MemoTab: Vue.defineAsyncComponent(() => import('./MemoTab.js')),
    CalendarTab: Vue.defineAsyncComponent(() => import('./CalendarTab.js')),
    RecipeTab: Vue.defineAsyncComponent(() => import('./RecipeTab.js'))
  },
  data() {
    return {
      activeSubTab: null, // 当前激活的子功能标识，null 表示展示主九宫格
      appList: [
        { id: 'memo', name: '家庭备忘录', icon: '📝', desc: '账号、户号及琐事记录', badge: '常用' },
        { id: 'calendar', name: '家庭日历', icon: '📅', desc: '日程提醒与纪念日', badge: '常用' },
        { id: 'recipe', name: '家庭菜谱', icon: '🍳', desc: '拿手好菜与做饭教程', badge: '常用' },
        { id: 'ledger', name: '家庭记账', icon: '💰', desc: '日常收支与开销统计', badge: '规划中' },
        { id: 'devices', name: '设备联动', icon: '⚡', desc: '智能家居控制台', badge: '规划中' }
      ]
    }
  },
  methods: {
    // 点击九宫格卡片路由分发
    openApp(item) {
      if (item.badge === '规划中') {
        alert(`【${item.name}】模块正在规划开发中，敬请期待！`);
        return;
      }
      
      this.activeSubTab = item.id;
      // 触发向上传递事件，动态修改顶部 Header 的标题文字
      this.$emit('update-title', `${item.icon} ${item.name}`);
    },
    // 从子功能页面返回九宫格主菜单
    backToGrid() {
      this.activeSubTab = null;
      this.$emit('update-title', '🧰 更多服务');
    }
  }
}