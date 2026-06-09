<template>
  <div class="guess-page">
    <div v-if="!currentPost" class="empty-state">
      <div class="icon">🤔</div>
      <h3>找不到这条短信</h3>
      <p>可能已经被删除了，或者链接有误</p>
      <router-link to="/gallery" class="btn btn-primary">回广场</router-link>
    </div>

    <div v-else class="guess-container">
      <div class="back-link">
        <router-link to="/gallery">← 回到广场</router-link>
      </div>

      <div class="main-content">
        <div class="message-display card">
          <div class="display-header">
            <span class="display-date">{{ formatDate(currentPost.date) }}</span>
            <span 
              :class="['display-type', currentPost.isSent ? 'sent' : 'received']"
            >
              {{ currentPost.isSent ? '📤 发出' : '📥 收到' }}
            </span>
          </div>

          <div class="display-message">
            "{{ currentPost.message }}"
          </div>

          <div class="display-tags" v-if="currentPost.tags.length > 0">
            <span 
              v-for="tag in currentPost.tags" 
              :key="tag.type"
              class="tag"
              :class="'tag-' + tag.type"
            >
              {{ tag.text }}
            </span>
          </div>
        </div>

        <div class="guess-section card">
          <h3>💭 你来猜猜</h3>
          <p class="hint">这条短信的上下文是什么？发挥你的想象力！</p>

          <div class="guess-input">
            <textarea 
              v-model="guessText"
              placeholder="我猜当时的情况是..."
              rows="3"
            ></textarea>
            <button 
              class="btn btn-primary"
              :disabled="!guessText.trim()"
              @click="submitGuess"
            >
              提交猜测
            </button>
          </div>
        </div>

        <div class="guesses-list card">
          <div class="list-header">
            <h3>👀 大家的猜测 ({{ currentPost.guesses.length }})</h3>
            <div class="sort-options">
              <button 
                v-for="opt in sortOptions" 
                :key="opt.value"
                :class="{ active: sortBy === opt.value }"
                @click="sortBy = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div v-if="sortedGuesses.length === 0" class="no-guesses">
            <p>还没有人猜测，来当第一个吧！</p>
          </div>

          <div 
            v-for="guess in sortedGuesses" 
            :key="guess.id"
            class="guess-item"
          >
            <div class="guess-avatar">
              {{ getAvatarEmoji(guess.id) }}
            </div>
            <div class="guess-content">
              <p class="guess-text">{{ guess.text }}</p>
              <div class="guess-footer">
                <button 
                  class="like-btn"
                  :class="{ liked: guess.liked }"
                  @click="toggleLike(guess)"
                >
                  👍 {{ guess.likes }}
                </button>
                <span class="guess-time">{{ formatDate(guess.date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentPost.context" class="context-section card">
          <div class="context-header">
            <h3>🎉 答案揭晓</h3>
            <span class="reveal-badge">已揭晓</span>
          </div>

          <div class="context-content">
            <div class="context-item" v-if="currentPost.context.prev">
              <label>👆 上一条消息：</label>
              <div class="context-message">
                "{{ currentPost.context.prev }}"
              </div>
            </div>

            <div class="current-context">
              <label>📌 当前消息：</label>
              <div class="context-message highlight">
                "{{ currentPost.message }}"
              </div>
            </div>

            <div class="context-item" v-if="currentPost.context.next">
              <label>👇 下一条消息：</label>
              <div class="context-message">
                "{{ currentPost.context.next }}"
              </div>
            </div>
          </div>

          <div class="context-analysis">
            <h4>💡 对话分析</h4>
            <p>{{ analyzeContext(currentPost) }}</p>
          </div>
        </div>

        <div v-else class="reveal-section card">
          <h3>🔒 答案还未揭晓</h3>
          <p>等更多人来猜之后，才会公布答案哦～</p>
          <p class="hint">已有 {{ currentPost.guesses.length }} 人参与猜测</p>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: Math.min(100, currentPost.guesses.length * 20) + '%' }"
            ></div>
          </div>
          <p class="progress-text">
            {{ currentPost.guesses.length }} / 5 人猜测后自动揭晓
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { store } from '@/store'

const route = useRoute()
const guessText = ref('')
const sortBy = ref('likes')

const sortOptions = [
  { value: 'likes', label: '最多点赞' },
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最早' }
]

const currentPost = computed(() => {
  const id = route.params.id
  let post = store.anonymousPosts.find(p => p.id === id)
  
  if (!post) {
    const demoPosts = [
      {
        id: 'demo1',
        message: '想你了，真的好想好想',
        date: Date.now() - 86400000,
        isSent: false,
        context: null,
        tags: [{ type: 'miss', text: '思念' }],
        guesses: [
          { id: 'g1', text: '应该是异地恋，好久没见了吧？', likes: 12, date: Date.now() - 7200000 },
          { id: 'g2', text: '会不会是刚吵架和好？', likes: 8, date: Date.now() - 3600000 }
        ],
        anonymous: true,
        originalConversation: null
      },
      {
        id: 'demo2',
        message: '晚安，梦里见 🌙',
        date: Date.now() - 86400000 * 2,
        isSent: true,
        context: {
          prev: '今天好累啊，先睡了',
          next: '晚安呀，明天见 ❤️'
        },
        tags: [{ type: 'night', text: '晚安' }],
        guesses: [
          { id: 'g3', text: '好甜！应该是热恋期吧', likes: 25, date: Date.now() - 86400000 }
        ],
        anonymous: true,
        originalConversation: null
      },
      {
        id: 'demo3',
        message: '对不起，我错了还不行吗 😢',
        date: Date.now() - 86400000 * 3,
        isSent: true,
        context: null,
        tags: [{ type: 'sorry', text: '道歉' }],
        guesses: [
          { id: 'g4', text: '是不是又忘了什么纪念日？', likes: 32, date: Date.now() - 86400000 * 2 },
          { id: 'g5', text: '我猜是打游戏忘了回消息', likes: 28, date: Date.now() - 86400000 * 2 + 3600000 },
          { id: 'g6', text: '感觉是惹女朋友生气了哈哈哈', likes: 19, date: Date.now() - 86400000 }
        ],
        anonymous: true,
        originalConversation: null
      }
    ]
    post = demoPosts.find(p => p.id === id)
  }
  
  return post
})

const sortedGuesses = computed(() => {
  if (!currentPost.value) return []
  
  const guesses = [...currentPost.value.guesses]
  
  if (sortBy.value === 'likes') {
    guesses.sort((a, b) => b.likes - a.likes)
  } else if (sortBy.value === 'newest') {
    guesses.sort((a, b) => b.date - a.date)
  } else {
    guesses.sort((a, b) => a.date - b.date)
  }
  
  return guesses
})

function submitGuess() {
  if (!guessText.value.trim() || !currentPost.value) return
  
  const guess = {
    id: Math.random().toString(36).substr(2, 9),
    text: guessText.value.trim(),
    likes: 0,
    liked: false,
    date: Date.now()
  }
  
  currentPost.value.guesses.push(guess)
  guessText.value = ''
  
  if (currentPost.value.guesses.length >= 5 && !currentPost.value.context) {
    currentPost.value.context = {
      prev: '这是上一条消息的内容示例',
      next: '这是下一条消息的内容示例'
    }
  }
}

function toggleLike(guess) {
  if (guess.liked) {
    guess.likes--
    guess.liked = false
  } else {
    guess.likes++
    guess.liked = true
  }
}

function getAvatarEmoji(id) {
  const emojis = ['😊', '😎', '🤔', '😄', '🥰', '😏', '🤗', '😌', '🙃', '😋']
  const idx = id.charCodeAt(id.length - 1) % emojis.length
  return emojis[idx]
}

function formatDate(timestamp) {
  const d = new Date(timestamp)
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 3600000) {
    return Math.floor(diff / 60000) + ' 分钟前'
  }
  if (diff < 86400000) {
    return Math.floor(diff / 3600000) + ' 小时前'
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function analyzeContext(post) {
  if (!post.context) return ''
  
  const hasPrev = !!post.context.prev
  const hasNext = !!post.context.next
  
  if (hasPrev && hasNext) {
    return '这是一段双向对话中的消息，前后都有互动，可以看出对话的连贯性。'
  } else if (hasPrev) {
    return '这条消息是对上一条的回复，可以看出两人的互动关系。'
  } else if (hasNext) {
    return '这条消息引出了对方的回复，是对话中的主动发起方。'
  }
  
  return '这是一条独立的消息，但仍能从中感受到情感的温度。'
}

onMounted(() => {
})
</script>

<style scoped>
.guess-page {
  max-width: 800px;
  margin: 0 auto;
}

.back-link {
  margin-bottom: 1.5rem;
}

.back-link a {
  color: var(--love-red);
  text-decoration: none;
}

.back-link a:hover {
  text-decoration: underline;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.message-display {
  text-align: center;
}

.display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.display-date {
  color: var(--text-light);
}

.display-type {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
}

.display-type.sent {
  background: #ffe5e5;
  color: var(--love-red);
}

.display-type.received {
  background: #f3e5f5;
  color: var(--accent);
}

.display-message {
  font-size: 1.5rem;
  line-height: 1.8;
  padding: 2rem 1rem;
  font-style: italic;
  color: var(--text-dark);
  border-top: 2px solid var(--border);
  border-bottom: 2px solid var(--border);
  margin: 1.5rem 0;
}

.display-tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.guess-section h3 {
  margin-bottom: 0.5rem;
  color: var(--love-red);
}

.hint {
  color: var(--text-light);
  margin-bottom: 1rem;
}

.guess-input {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.guess-input textarea {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s;
}

.guess-input textarea:focus {
  outline: none;
  border-color: var(--love-pink);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h3 {
  color: var(--love-red);
}

.sort-options {
  display: flex;
  gap: 0.5rem;
}

.sort-options button {
  padding: 0.25rem 0.75rem;
  border: none;
  background: var(--bg-light);
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.sort-options button.active {
  background: var(--love-red);
  color: white;
}

.no-guesses {
  text-align: center;
  padding: 2rem;
  color: var(--text-light);
}

.guess-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.guess-item:last-child {
  border-bottom: none;
}

.guess-avatar {
  width: 40px;
  height: 40px;
  background: var(--bg-medium);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.guess-content {
  flex: 1;
}

.guess-text {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.guess-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.like-btn {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border);
  background: white;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.like-btn:hover {
  background: var(--bg-light);
}

.like-btn.liked {
  background: #ffe5e5;
  border-color: var(--love-red);
  color: var(--love-red);
}

.guess-time {
  font-size: 0.8rem;
  color: var(--text-light);
}

.context-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.context-header h3 {
  color: var(--love-red);
}

.reveal-badge {
  background: #d4edda;
  color: #155724;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.context-content {
  margin-bottom: 1.5rem;
}

.context-item,
.current-context {
  margin-bottom: 1rem;
}

.context-item label,
.current-context label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

.context-message {
  padding: 1rem;
  background: var(--bg-light);
  border-radius: 8px;
  font-style: italic;
  line-height: 1.6;
}

.context-message.highlight {
  background: #fff5f5;
  border-left: 3px solid var(--love-red);
}

.context-analysis {
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.context-analysis h4 {
  color: var(--text-dark);
  margin-bottom: 0.5rem;
}

.context-analysis p {
  color: var(--text-light);
  line-height: 1.6;
}

.reveal-section {
  text-align: center;
}

.reveal-section h3 {
  color: var(--text-dark);
  margin-bottom: 0.5rem;
}

.reveal-section p {
  color: var(--text-light);
  margin-bottom: 1rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--love-pink), var(--love-red));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: var(--text-light);
}
</style>
