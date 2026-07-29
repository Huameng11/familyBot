export default {
  name: 'MedicineTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 录入新药品</h3>
        <div class="form-group"><label>药品名称 *</label><input type="text" v-model="newMed.name" class="form-control" placeholder="如：布洛芬"></div>
        <div class="form-group"><label>数量 / 规格</label><input type="text" v-model="newMed.count" class="form-control"></div>
        <div class="form-group"><label>存放位置</label><input type="text" v-model="newMed.location" class="form-control"></div>
        <div class="form-group"><label>有效期</label><input type="text" v-model="newMed.expire_date" class="form-control"></div>
        <div class="form-group"><label>用法用量</label><input type="text" v-model="newMed.usage" class="form-control"></div>
        <button class="btn" style="width:100%; background:#4CAF50;" @click="addMedicine">保存到药箱</button>
      </div>
      <div class="card">
        <h3>📋 药箱库存 (显示: {{ filteredMedList.length }} / 共: {{ medList.length }})</h3>
        <div style="margin-bottom: 15px;">
          <input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 快速搜索药品名称、位置、用途...">
        </div>
        <div v-if="filteredMedList.length === 0" style="text-align:center;color:#999;font-size:13px;padding:15px 0;">
          {{ searchKey ? '未找到符合条件的药品' : '暂无数据' }}
        </div>
        <div v-for="med in filteredMedList" :key="med.id" class="item-card med-border">
          <div class="item-card-header">
            <input type="text" v-model="med.name" class="item-title-input">
            <div class="action-btns">
              <button class="btn" style="background:#f44336;padding:6px 12px;font-size:13px;" @click="deleteMedicine(med.id)">删除</button>
              <button class="btn" style="background:#2196F3;padding:6px 12px;font-size:13px;" @click="updateMedicine(med)">保存</button>
            </div>
          </div>
          <div class="form-group"><label>数量/规格</label><input type="text" v-model="med.count" class="form-control"></div>
          <div class="form-group"><label>存放位置</label><input type="text" v-model="med.location" class="form-control"></div>
          <div class="form-group"><label>有效期</label><input type="text" v-model="med.expire_date" class="form-control"></div>
          <div class="form-group"><label>用法用量</label><input type="text" v-model="med.usage" class="form-control"></div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      searchKey: '',
      medList: [],
      newMed: { name: '', count: '', location: '', expire_date: '', usage: '' }
    }
  },
  computed: {
    filteredMedList() {
      if (!this.searchKey.trim()) return this.medList;
      const key = this.searchKey.toLowerCase();
      return this.medList.filter(item => 
        (item.name && item.name.toLowerCase().includes(key)) ||
        (item.location && item.location.toLowerCase().includes(key)) ||
        (item.usage && item.usage.toLowerCase().includes(key)) ||
        (item.expire_date && item.expire_date.toLowerCase().includes(key))
      );
    }
  },
  methods: {
    async fetchList() {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (data.status === 'success') this.medList = data.data;
    },
    async addMedicine() {
      if (!this.newMed.name) return alert('请输入名称');
      const params = new URLSearchParams(this.newMed).toString();
      await fetch(`/api/add_medicine?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newMed = { name: '', count: '', location: '', expire_date: '', usage: '' };
      this.fetchList();
    },
    async updateMedicine(med) {
      const params = new URLSearchParams(med).toString();
      await fetch(`/api/update_medicine?${params}`, { method: 'POST' });
      alert('修改成功');
      this.fetchList();
    },
    async deleteMedicine(id) {
      if (confirm('确定要删除这条记录吗？')) {
        await fetch(`/api/delete_medicine?id=${id}`, { method: 'POST' });
        this.fetchList();
      }
    }
  },
  mounted() {
    this.fetchList();
  }
}