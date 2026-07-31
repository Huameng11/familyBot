import BatchImport from './BatchImport.js';

export default {
  name: 'RecipeTab',
  components: { BatchImport },
  template: `
    <div class="content-section manager-padding">
      <batch-import 
        title="🍳 录入新菜谱"
        api-route="/api/batch_add_recipe"
        ai-prompt="帮我生成3道精选家常菜谱的JSON数组"
        example-format='[{"name":"西红柿炒鸡蛋","category":"家常热菜","difficulty":"快手菜","ingredients":"- 西红柿 2个\\n- 鸡蛋 3个","steps":"1. 炒熟鸡蛋\\n2. 番茄炒出沙混合","tutorial_link":""}]'
        btn-color="#d32f2f"
        @success="fetchList"
      >
        <div class="form-group"><label>菜品名称 *</label><input type="text" v-model="newRecipe.name" class="form-control"></div>
        <div class="form-group"><label>菜谱分类</label><input type="text" v-model="newRecipe.category" class="form-control"></div>
        <div class="form-group"><label>制作难度</label><input type="text" v-model="newRecipe.difficulty" class="form-control"></div>
        <div class="form-group"><label>主料与配料 (支持 MD)</label><textarea v-model="newRecipe.ingredients" rows="2" class="form-control"></textarea></div>
        <div class="form-group"><label>烹饪步骤 (支持 MD)</label><textarea v-model="newRecipe.steps" rows="3" class="form-control"></textarea></div>
        <div class="form-group"><label>参考教程链接</label><input type="text" v-model="newRecipe.tutorial_link" class="form-control"></div>
        <button class="btn" style="width:100%; background:#d32f2f;" @click="addRecipe">保存到菜谱</button>
      </batch-import>

      <div class="card">
        <h3>📖 我的拿手菜</h3>
        <div style="margin-bottom:15px;"><input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 搜索..."></div>
        
        <div class="common-accordion-list">
          <div v-for="item in filteredRecipeList" :key="item.id" class="accordion-item recipe-item-theme">
            <div class="accordion-header" @click="toggleExpand(item)">
              <div class="header-main-info">
                <span class="header-title-text">🍳 {{ item.name }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ item.category || '未分类' }}</span>
                  <span class="badge-item badge-sub">{{ item.difficulty || '未知' }}</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
            </div>

            <div v-show="item.isExpanded" class="accordion-body">
              <div class="form-group"><label>菜品名称</label><input type="text" class="form-control" v-model="item.name"></div>
              <div class="form-group"><label>菜谱分类</label><input type="text" class="form-control" v-model="item.category"></div>
              <div class="form-group"><label>制作难度</label><input type="text" class="form-control" v-model="item.difficulty"></div>
              
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>主料与配料清单</label>
                  <span class="edit-toggle-link" @click="item.isEditingIng = !item.isEditingIng">{{ item.isEditingIng ? '👁️ 预览' : '✍️ 修改' }}</span>
                </div>
                <textarea v-if="item.isEditingIng" class="form-control" rows="3" v-model="item.ingredients"></textarea>
                <div v-else class="accordion-markdown-panel"><div v-html="renderMarkdown(item.ingredients || '*无记录*')" class="markdown-body"></div></div>
              </div>

              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>烹饪步骤说明</label>
                  <span class="edit-toggle-link" @click="item.isEditingSteps = !item.isEditingSteps">{{ item.isEditingSteps ? '👁️ 预览' : '✍️ 修改' }}</span>
                </div>
                <textarea v-if="item.isEditingSteps" class="form-control" rows="4" v-model="item.steps"></textarea>
                <div v-else class="accordion-markdown-panel"><div v-html="renderMarkdown(item.steps || '*无做法*')" class="markdown-body"></div></div>
              </div>
              
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>参考教程链接</label>
                  <a v-if="item.tutorial_link" :href="item.tutorial_link" target="_blank" style="font-size:12px; color:#d32f2f; font-weight:bold; text-decoration:none;">▶ 观看视频</a>
                </div>
                <input type="text" class="form-control" v-model="item.tutorial_link">
              </div>

              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding:8px 16px;" @click="deleteRecipe(item.id)">删除</button>
                <button class="btn" style="background:#d32f2f; padding:8px 16px;" @click="updateRecipe(item)">保存修改</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { searchKey: '', recipeList: [], newRecipe: { name: '', category: '', ingredients: '', difficulty: '', steps: '', tutorial_link: '' } }
  },
  computed: {
    filteredRecipeList() {
      if (!this.searchKey.trim()) return this.recipeList;
      const k = this.searchKey.toLowerCase();
      return this.recipeList.filter(i => (i.name && i.name.toLowerCase().includes(k)) || (i.ingredients && i.ingredients.toLowerCase().includes(k)));
    }
  },
  methods: {
    toggleExpand(item) { item.isExpanded = !item.isExpanded; },
    renderMarkdown(text) { return (text && typeof marked !== 'undefined') ? marked.parse(text, { breaks: true, gfm: true }) : text; },
    async fetchList() {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (data.status === 'success') this.recipeList = data.data.map(i => ({ ...i, isExpanded: false, isEditingIng: false, isEditingSteps: false }));
    },
    async addRecipe() {
      if (!this.newRecipe.name) return alert('名称不能为空');
      const u = new URLSearchParams(this.newRecipe).toString();
      await fetch(`/api/add_recipe?${u}`, { method: 'POST' });
      this.newRecipe = { name: '', category: '', ingredients: '', difficulty: '', steps: '', tutorial_link: '' };
      this.fetchList();
    },
    async updateRecipe(item) {
      const u = new URLSearchParams({ id: item.id, name: item.name, category: item.category || '', difficulty: item.difficulty || '', ingredients: item.ingredients || '', steps: item.steps || '', tutorial_link: item.tutorial_link || '' }).toString();
      await fetch(`/api/update_recipe?${u}`, { method: 'POST' });
      item.isEditingIng = false; item.isEditingSteps = false;
      alert('已更新');
      this.fetchList();
    },
    async deleteRecipe(id) {
      if (confirm('确认删除？')) { await fetch(`/api/delete_recipe?id=${id}`, { method: 'POST' }); this.fetchList(); }
    }
  },
  mounted() { this.fetchList(); }
}