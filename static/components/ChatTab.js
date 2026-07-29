export default {
  name: 'ChatTab',
  template: `
    <div class="content-section">
      <div id="chat-box" ref="chatBox">
        <div v-for="(msg, index) in chatHistory" :key="index" :class="['msg', msg.role]">
          <div>{{ msg.text }}</div>
          
          <div v-if="msg.role === 'bot'" style="margin-top: 8px; text-align: right;">
            <button 
              class="btn" 
              style="background: #e8eaf6; color: #3F51B5; font-size: 11px; padding: 3px 8px; border-radius: 12px;"
              @click="toggleSpeak(msg.text, index)"
            >
              {{ speakingIndex === index ? '⏹️ 停止' : '🔊 朗读' }}
            </button>
          </div>
        </div>
        <div v-if="isThinking" class="loading">大管家正在检索数据库...</div>
      </div>

      <div class="input-area">
        <button class="voice-btn" @click="startVoice">{{ isRecording ? '🎙️' : '🎤' }}</button>
        <input type="text" class="chat-input" v-model="userInput" @keypress.enter="sendMessage" placeholder="有事请吩咐大管家...">
        <button class="btn" style="border-radius:20px;" @click="sendMessage">发送</button>
      </div>
    </div>
  `,
  data() {
    return {
      chatHistory: [{ role: 'bot', text: '欢迎回来！我是你的家庭超级管家 FamilyBot。' }],
      userInput: '',
      isThinking: false,
      isRecording: false,
      speakingIndex: null // 记录当前正在朗读的消息索引
    }
  },
  methods: {
    async sendMessage() {
      if (!this.userInput.trim()) return;
      const query = this.userInput;
      this.chatHistory.push({ role: 'user', text: query });
      this.userInput = '';
      this.isThinking = true;
      this.$nextTick(() => { this.scrollToBottom(); });

      try {
        const res = await fetch(`/api/chat?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        this.chatHistory.push({ role: 'bot', text: data.reply });
      } catch (e) {
        this.chatHistory.push({ role: 'bot', text: '网络连接失败，请确认后端服务是否正常运行。' });
      } finally {
        this.isThinking = false;
        this.$nextTick(() => { this.scrollToBottom(); });
      }
    },

    // 🚀 核心新增：朗读 / 停止朗读控制函数
    toggleSpeak(text, index) {
      if (!('speechSynthesis' in window)) {
        return alert('您的浏览器不支持语音朗读功能');
      }

      // 1. 如果正在朗读当前条目，则停止
      if (this.speakingIndex === index) {
        window.speechSynthesis.cancel();
        this.speakingIndex = null;
        return;
      }

      // 2. 先取消之前的播放
      window.speechSynthesis.cancel();

      // 3. 创建新的语音对象
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; // 设为中文
      utterance.rate = 1.0;     // 语速 (0.5 ~ 2.0)
      utterance.pitch = 1.0;    // 音调 (0 ~ 2)

      // 播放结束时的回调，重置按钮状态
      utterance.onend = () => {
        this.speakingIndex = null;
      };

      // 发生错误时的处理
      utterance.onerror = () => {
        this.speakingIndex = null;
      };

      // 开始播报
      this.speakingIndex = index;
      window.speechSynthesis.speak(utterance);
    },

    scrollToBottom() {
      const box = this.$refs.chatBox;
      if(box) box.scrollTop = box.scrollHeight;
    },

    startVoice() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return alert('您的浏览器不支持语音识别');
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.start();
      this.isRecording = true;
      recognition.onresult = (e) => {
        this.userInput = e.results[0][0].transcript;
        this.isRecording = false;
        this.sendMessage();
      };
      recognition.onerror = () => { this.isRecording = false; };
      recognition.onend = () => { this.isRecording = false; };
    }
  },

  // 页面切走或组件销毁时，自动停止播放，防止后台一直响
  unmounted() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}