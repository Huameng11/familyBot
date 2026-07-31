export default {
  name: 'MedicineTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 录入新药品</h3>
        <div class="form-group"><label>药品名称 *</label><input type="text" class="form-control" v-model="newMed.name" placeholder="如：布洛芬悬浮液"></div>
        <div class="form-group"><label>数量/规格</label><input type="text" class="form-control" v-model="newMed.count" placeholder="如：1盒 / 100ml"></div>
        <div class="form-group"><label>存放位置</label><input type="text" class="form-control" v-model="newMed.location" placeholder="如：儿童房吊柜"></div>
        <div class="form-group"><label>有效期</label><input type="text" class="form-control" v-model="newMed.expire_date" placeholder="如：2028/8/4"></div>
        
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label>用法用量 / 说明书</label>
            <span v-if="isOcrLoading" style="font-size: 11px; color: #009688; font-weight: bold;">⚡ 正在解析...</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <textarea v-model="newMed.usage" rows="2" class="form-control" placeholder="手输，或点右侧拍照解析..."></textarea>
            <label class="btn" style="background: #009688; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; padding: 0 12px; cursor: pointer; border-radius: 8px;">
              <span style="font-size: 16px;">📷</span>
              <span style="font-size: 10px; font-weight: normal; margin-top: 2px;">拍照解析</span>
              <input type="file" accept="image/*" capture="camera" style="display: none;" @change="handleImageUpload($event, newMed)" :disabled="isOcrLoading">
            </label>
          </div>
        </div>
        <button class="btn" style="width:100%; background:#4CAF50; margin-top: 5px;" @click="addMed">保存到药箱</button>
      </div>

      <div style="margin-bottom: 15px;">
        <input type="text" class="form-control search-input" v-model="searchQuery" placeholder="🔍 快速搜索药品名称、位置、用途...">
      </div>

      <div class="common-accordion-list">
        <div v-for="item in filteredMedicines" :key="item.id" class="accordion-item med-item-theme">
          
          <div class="accordion-header" @click="toggleExpand(item)">
            <div class="header-main-info">
              <span class="header-title-text">💊 {{ item.name || '未命名药品' }}</span>
              <div class="header-badge-container">
                <span class="badge-item badge-main">{{ item.count || '无数量记录' }}</span>
                <span class="badge-item badge-sub">{{ item.location || '未知位置' }}</span>
              </div>
            </div>
            <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
          </div>

          <div v-show="item.isExpanded" class="accordion-body">
            <div class="form-group">
              <label>药品名称说明</label>
              <input type="text" class="form-control" v-model="item.name">
            </div>
            <div class="form-group">
              <label>数量 / 规格</label>
              <input type="text" class="form-control" v-model="item.count">
            </div>
            <div class="form-group">
              <label>存放位置</label>
              <input type="text" class="form-control" v-model="item.location">
            </div>
            <div class="form-group">
              <label>有效期</label>
              <input type="text" class="form-control" v-model="item.expire_date">
            </div>
            <div class="form-group">
              <label>用法用量 / 说明书</label>
              <div style="display: flex; gap: 8px;">
                <textarea v-model="item.usage" rows="3" class="form-control"></textarea>
                <label class="btn" style="background: #009688; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 0 10px; cursor: pointer; border-radius: 8px;">
                  <span style="font-size: 14px;">📷</span>
                  <input type="file" accept="image/*" capture="camera" style="display: none;" @change="handleImageUpload($event, item)" :disabled="isOcrLoading">
                </label>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
              <button class="btn" style="background:#f44336; padding: 8px 16px; font-size: 13px;" @click="deleteMed(item.id)">删除药品</button>
              <button class="btn" style="background:#2196F3; padding: 8px 16px; font-size: 13px;" @click="updateMed(item)">保存修改</button>
            </div>
          </div>

        </div>
        <div v-if="filteredMedicines.length === 0" style="text-align:center; color:#999; padding:20px;">
          暂无匹配的药品库存 📦
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      medicines: [],
      searchQuery: '',
      isOcrLoading: false,
      newMed: { name: '', count: '', location: '', expire_date: '', usage: '' }
    }
  },
  computed: {
    filteredMedicines() {
      if (!this.searchQuery.trim()) return this.medicines;
      const q = this.searchQuery.toLowerCase();
      return this.medicines.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) || 
        (m.usage && m.usage.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q))
      );
    }
  },
  methods: {
    toggleExpand(item) { item.isExpanded = !item.isExpanded; },
    async loadMedicines() {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (data.status === 'success') { this.medicines = data.data.map(item => ({ ...item, isExpanded: false })); }
    },
    async addMed() {
      if (!this.newMed.name) return alert('请输入药品名称');
      const params = new URLSearchParams(this.newMed).toString();
      await fetch(`/api/add_medicine?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newMed = { name: '', count: '', location: '', expire_date: '', usage: '' };
      this.loadMedicines();
    },
    async updateMed(item) {
      const payload = { id: item.id, name: item.name, count: item.count, location: item.location, expire_date: item.expire_date, usage: item.usage };
      const params = new URLSearchParams(payload).toString();
      await fetch(`/api/update_medicine?${params}`, { method: 'POST' });
      alert('修改已保存！');
    },
    async deleteMed(id) {
      if (confirm('确定要删除这条药品记录吗？')) {
        await fetch(`/api/delete_medicine?id=${id}`, { method: 'POST' });
        this.loadMedicines();
      }
    },
    async handleImageUpload(event, targetObject) {
      const file = event.target.files[0];
      if (!file) return;
      this.isOcrLoading = true;
      try {
        const compressedBlob = await this.compressImage(file, 1280, 0.8);
        const formData = new FormData();
        formData.append('file', compressedBlob, 'instruction.jpg');
        const res = await fetch('/api/parse_instruction', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') { targetObject.usage = data.text; alert('🎉 说明书识别成功！用法已自动填入。'); } 
        else { alert('识别失败：' + (data.detail || '未知错误')); }
      } catch (e) { alert('解析网络异常'); } 
      finally { this.isOcrLoading = false; event.target.value = ''; }
    },
    compressImage(file, maxSide = 1280, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image(); img.src = e.target.result;
          img.onload = () => {
            let width = img.width, height = img.height;
            if (width > maxSide || height > maxSide) {
              if (width > height) { height = Math.round((height * maxSide) / width); width = maxSide; } 
              else { width = Math.round((width * maxSide) / height); height = maxSide; }
            }
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
          };
          img.onerror = err => reject(err);
        };
        reader.onerror = err => reject(err);
      });
    }
  },
  mounted() { this.loadMedicines(); }
}