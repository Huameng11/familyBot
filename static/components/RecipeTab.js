export default {
  name: 'RecipeTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>🍳 录入新菜谱</h3>
        <div class="form-group"><label>菜品名称 *</label><input type="text" v-model="newRecipe.name" class="form-control" placeholder="如：西红柿炒鸡蛋"></div>
        <div class="form-group"><label>菜谱分类</label><input type="text" v-model="newRecipe.category" class="form-control" placeholder="如：家常热菜、减脂餐"></div>
        <div class="form-group"><label>制作难度 / 耗时</label><input type="text" v-model="newRecipe.difficulty" class="form-control" placeholder="如：快手菜 (10分钟)"></div>
        <div class="form-group"><label>主料与配料</label><textarea v-model="newRecipe.ingredients" rows="2" class="form-control" placeholder="如：西红柿2个，鸡蛋3个..."></textarea></div>
        <div class="form-group"><label>烹饪步骤</label><textarea v-model="newRecipe.steps" rows="3" class="form-control" placeholder="1. 鸡蛋打散炒熟；2. 番茄炒出沙..."></textarea></div>
        <div class="form-group"><label>参考教程链接 (选填)</label><input type="text" v-model="newRecipe.tutorial_link" class="form-control" placeholder="粘贴视频教程网址"></div>
        <button class="btn" style="width:100%; background:#d32f2f;" @click="addRecipe">保存到菜谱</button>
      </div>

      <div class="card">
        <h3>📖 我的拿手菜 (共: {{ filteredRecipeList.length }} 道)</h3>
        <div style="margin-bottom: 15px;">
          <input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 搜索菜名、食材或分类...">
        </div>
        
        <div v-if="filteredRecipeList.length === 0" style="text-align:center;color:#999;font-size:13px;padding:15px 0;">暂无匹配的菜谱 🍽️</div>

        <div class="common-accordion-list">
          <div v-for="item in filteredRecipeList" :key="item.id" class="accordion-item recipe-item-theme">
            
            <div class="accordion-header" @click="toggleExpand(item)">
              <div class="header-main-info">
                <span class="header-title-text">🍳 {{ item.name || '未命名菜品' }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ item.category || '未分类' }}</span>
                  <span class="badge-item badge-sub">{{ item.difficulty || '未知难度' }}</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
            </div>

            <div v-show="item.isExpanded" class="accordion-body">
              <div class="form-group"><label>菜品名称</label><input type="text" class="form-control" v-model="item.name"></div>
              <div class="form-group"><label>菜谱分类</label><input type="text" class="form-control" v-model="item.category"></div>
              <div class="form-group"><label>制作难度 / 耗时</label><input type="text" class="form-control" v-model="item.difficulty"></div>
              <div class="form-group"><label>主料与配料</label><textarea class="form-control" rows="2" v-model="item.ingredients"></textarea></div>
              <div class="form-group"><label>烹饪步骤</label><textarea class="form-control" rows="4" v-model="item.steps"></textarea></div>
              
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>参考教程链接</label>
                  <a v-if="item.tutorial_link" :href="item.tutorial_link" target="_blank" style="font-size: 12px; color: #d32f2f; text-decoration: none; font-weight: bold;">▶ 点击观看教程</a>
                </div>
                <input type="text" class="form-control" v-model="item.tutorial_link" placeholder="粘贴视频教程网址">
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding: 8px 16px; font-size: 13px;" @click="deleteRecipe(item.id)">删除菜谱</button>
                <button class="btn" style="background:#d32f2f; padding: 8px 16px; font-size: 13px;" @click="updateRecipe(item)">保存修改</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `,
  data() {
    return {
      searchKey: '',
      recipeList: [],
      newRecipe: { name: '', category: '', ingredients: '', difficulty: '', steps: '', tutorial_link: '' }
    }
  },
  computed: {
    filteredRecipeList() {
      if (!this.searchKey.trim()) return this.recipeList;
      const key = this.searchKey.toLowerCase();
      return this.recipeList.filter(item => 
        (item.name && item.name.toLowerCase().includes(key)) ||
        (item.category && item.category.toLowerCase().includes(key)) ||
        (item.ingredients && item.ingredients.toLowerCase().includes(key))
      );
    }
  },
  methods: {
    toggleExpand(item) { item.isExpanded = !item.isExpanded; },
    async fetchList() {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (data.status === 'success') {
        this.recipeList = data.data.map(item => ({ ...item, isExpanded: false }));
      }
    },
    async addRecipe() {
      if (!this.newRecipe.name) return alert('请输入菜品名称');
      const params = new URLSearchParams(this.newRecipe).toString();
      await fetch(`/api/add_recipe?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newRecipe = { name: '', category: '', ingredients: '', difficulty: '', steps: '', tutorial_link: '' };
      this.fetchList();
    },
    async updateRecipe(item) {
      const payload = { id: item.id, name: item.name, category: item.category, ingredients: item.ingredients, difficulty: item.difficulty, steps: item.steps, tutorial_link: item.tutorial_link };
      const params = new URLSearchParams(payload).toString();
      await fetch(`/api/update_recipe?${params}`, { method: 'POST' });
      alert('修改已成功保存！');
    },
    async deleteRecipe(id) {
      if (confirm('确定要删除这道菜谱吗？')) {
        await fetch(`/api/delete_recipe?id=${id}`, { method: 'POST' });
        this.fetchList();
      }
    }
  },
  mounted() { this.fetchList(); }
}