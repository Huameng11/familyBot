export default {
  name: 'ChatTab',
  template: `
    <div class="content-section">
      <div id="chat-box" ref="chatBox">
        <div v-for="(msg, index) in chatHistory" :key="index" :class="['msg', msg.role]">
          {{ msg.text }}
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
      isRecording: false
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
  }
}