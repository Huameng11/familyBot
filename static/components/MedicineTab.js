export default {
  name: 'MedicineTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 录入新药品</h3>
        <div class="form-group">
          <label>药品名称 *</label>
          <input type="text" v-model="newMed.name" class="form-control" placeholder="如：布洛芬悬浮液">
        </div>
        <div class="form-group">
          <label>数量 / 规格</label>
          <input type="text" v-model="newMed.count" class="form-control" placeholder="如：1盒 / 100ml">
        </div>
        <div class="form-group">
          <label>存放位置</label>
          <input type="text" v-model="newMed.location" class="form-control" placeholder="如：儿童房吊柜右大">
        </div>
        <div class="form-group">
          <label>有效期</label>
          <input type="text" v-model="newMed.expire_date" class="form-control" placeholder="如：2028/8/4">
        </div>
        
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label>用法用量 / 说明书</label>
            <span v-if="isOcrLoading" style="font-size: 11px; color: #009688; font-weight: bold;">⚡ 正在压缩照片并解析说明书...</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <textarea 
              v-model="newMed.usage" 
              rows="3" 
              class="form-control" 
              placeholder="可手动输入，或点击右侧按钮拍说明书自动解析..."
            ></textarea>
            
            <label class="btn" style="background: #009688; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; padding: 0 12px; cursor: pointer; border-radius: 8px;">
              <span style="font-size: 16px;">📷</span>
              <span style="font-size: 10px; font-weight: normal; margin-top: 2px;">拍照解析</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="camera" 
                style="display: none;" 
                @change="handleImageUpload($event, newMed)"
                :disabled="isOcrLoading"
              >
            </label>
          </div>
        </div>

        <button class="btn" style="width:100%; background:#4CAF50; margin-top: 5px;" @click="addMedicine">保存到药箱</button>
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
          
          <div class="form-group">
            <label>用法用量 / 说明书</label>
            <div style="display: flex; gap: 8px;">
              <textarea v-model="med.usage" rows="3" class="form-control"></textarea>
              <label class="btn" style="background: #009688; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 0 10px; cursor: pointer; border-radius: 8px;">
                <span style="font-size: 14px;">📷</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="camera" 
                  style="display: none;" 
                  @change="handleImageUpload($event, med)"
                  :disabled="isOcrLoading"
                >
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      searchKey: '',
      medList: [],
      isOcrLoading: false, // 标识当前是否正在进行图片压缩与 OCR 识别
      newMed: { name: '', count: '', location: '', expire_date: '', usage: '' }
    }
  },
  computed: {
    // 🔍 实时过滤计算属性
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
    // 拉取数据库最新列表
    async fetchList() {
      try {
        const res = await fetch('/api/medicines');
        const data = await res.json();
        if (data.status === 'success') this.medList = data.data;
      } catch (e) {
        console.error("加载药品列表失败", e);
      }
    },

    // 🚀 带 Canvas 高效压缩的拍照识别逻辑
    async handleImageUpload(event, targetObject) {
      const file = event.target.files[0];
      if (!file) return;

      this.isOcrLoading = true;

      try {
        // 1. 调用 Canvas 在前端将原图压缩为 JPEG 格式 (最大边长 1280px，质量 0.8)
        const compressedBlob = await this.compressImage(file, 1280, 0.8);

        // 2. 将压缩后的图片 Blob 塞进 FormData 发送给后端
        const formData = new FormData();
        formData.append('file', compressedBlob, 'instruction.jpg');

        const res = await fetch('/api/parse_instruction', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data.status === 'success') {
          // 自动填充提炼出来的说明书文本
          targetObject.usage = data.text;
          alert('🎉 说明书识别成功！用法与禁忌已自动填入文本框，请核对无误后点击保存。');
        } else {
          alert('识别失败：' + (data.detail || '服务未返回正确数据'));
        }
      } catch (e) {
        alert('解析网络通信异常，请确认后端 ocr 路由是否正常运行');
      } finally {
        this.isOcrLoading = false;
        event.target.value = ''; // 清空 input 值，允许用户重复拍摄
      }
    },

    // 🛠️ 纯前端 Canvas 图片压缩函数
    compressImage(file, maxSide = 1280, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            // 等比例缩放图片尺寸
            if (width > maxSide || height > maxSide) {
              if (width > height) {
                height = Math.round((height * maxSide) / width);
                width = maxSide;
              } else {
                width = Math.round((width * maxSide) / height);
                height = maxSide;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 输出 Blob 对象
            canvas.toBlob(
              (blob) => resolve(blob),
              'image/jpeg',
              quality
            );
          };
          img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
      });
    },

    // 新增药品
    async addMedicine() {
      if (!this.newMed.name) return alert('请输入药品名称');
      const params = new URLSearchParams(this.newMed).toString();
      await fetch(`/api/add_medicine?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newMed = { name: '', count: '', location: '', expire_date: '', usage: '' };
      this.fetchList();
    },

    // 修改已有药品
    async updateMedicine(med) {
      const params = new URLSearchParams(med).toString();
      await fetch(`/api/update_medicine?${params}`, { method: 'POST' });
      alert('修改成功');
      this.fetchList();
    },

    // 删除药品
    async deleteMedicine(id) {
      if (confirm('确定要删除这条药品记录吗？')) {
        await fetch(`/api/delete_medicine?id=${id}`, { method: 'POST' });
        this.fetchList();
      }
    }
  },
  mounted() {
    this.fetchList();
  }
}