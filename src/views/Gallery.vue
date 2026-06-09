<template>
  <div class="gallery-page">
    <div class="gallery-header">
      <h2>🏛️ 匿名广场</h2>
      <p>看看别人挂出来的短信，猜猜上下文是什么</p>
    </div>

    <div v-if="allPosts.length === 0" class="empty-state">
      <div class="icon">📭</div>
      <h3>广场还空空的</h3>
      <p>去情书墙挂出第一条短信，让大家猜猜看吧！</p>
      <router-link to="/wall" class="btn btn-primary">去情书墙</router-link>
    </div>

    <div v-else class="posts-grid">
      <div 
        v-for="post in allPosts" 
        :key="post.id"
        class="post-card card"
      >
        <div class="post-header">
          <span class="post-date">{{ formatDate(post.date) }}</span>
          <span 
            v-if="post.isSent" 
            class="post-type sent"
          >📤 发出的短信</span>
          <span 
            v-else 
            class="post-type received"
          >📥 收到的短信</span>
        </div>

        <div class="post-message">
          "{{ post.message }}"
        </div>

        <div class="post-tags" v-if="post.tags.length > 0">
          <span 
            v-for="tag in post.tags" 
            :key="tag.type"
            class="tag"
            :class="'tag-' + tag.type"
          >
            {{ tag.text }}
          </span>
        </div>

        <div class="post-meta" v-if="!post.anonymous && post.originalConversation">
          <span>来自: {{ post.originalConversation }}</span>
        </div>

        <div class="post-stats">
          <span>💭 {{ post.guesses.length }} 个猜测</span>
          <span v-if="post.context">🔓 已揭晓</span>
          <span v-else>🔒 待揭晓</span>
        </div>

        <div class="post-actions">
          <router-link 
            :to="'/guess/' + post.id" 
            class="btn btn-primary"
          >
            我来猜猜 →
          </router-link>
          
          <button 
            v-if="!post.context"
            class="btn btn-secondary"
            @click="revealContext(post)"
          >
            揭晓答案
          </button>
        </div>

        <div v-if="post.context" class="context-reveal">
          <div class="context-section" v-if="post.context.prev">
            <label>👆 上一条：</label>
            <p>{{ post.context.prev }}</p>
          </div>
          <div class="context-section" v-if="post.context.next">
            <label>👇 下一条：</label>
            <p>{{ post.context.next }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { store } from '@/store'

const allPosts = computed(() => {
  return [
    ...store.anonymousPosts,
    ...demoPosts
  ].sort((a, b) => b.date - a.date)
})

const demoPosts = [
  {
    id: 'demo1',
    message: '想你了，真的好想好想',
    date: Date.now() - 86400000,
    isSent: false,
    context: null,
    tags: [{ type: 'miss', text: '思念' }],
    guesses: [
      { id: 'g1', text: '应该是异地恋，好久没见了吧？', likes: 12 },
      { id: 'g2', text: '会不会是刚吵架和好？', likes: 8 }
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
      { id: 'g3', text: '好甜！应该是热恋期吧', likes: 25 }
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
      { id: 'g4', text: '是不是又忘了什么纪念日？', likes: 32 },
      { id: 'g5', text: '我猜是打游戏忘了回消息', likes: 28 },
      { id: 'g6', text: '感觉是惹女朋友生气了哈哈哈', likes: 19 }
    ],
    anonymous: true,
    originalConversation: null
  }
]

function revealContext(post) {
  if (!post.context) {
    post.context = {
      prev: '这是上一条消息的内容',
      next: '这是下一条消息的内容'
    }
  }
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
  if (diff < 86400000 * 7) {
    return Math.floor(diff / 86400000) + ' 天前'
  }
  
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
})
</script>

<style scoped>
.gallery-page {
  max-width: 1200px;
  margin: 0 auto;
}

.gallery-header {
  text-align: center;
  margin-bottom: 2rem;
}

.gallery-header h2 {
  font-size: 2rem;
  color: var(--love-red);
  margin-bottom: 0.5rem;
}

.gallery-header p {
  color: var(--text-light);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.post-card {
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(231, 76, 60, 0.15);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.post-date {
  color: var(--text-light);
  font-size: 0.85rem;
}

.post-type {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.post-type.sent {
  background: #ffe5e5;
  color: var(--love-red);
}

.post-type.received {
  background: #f3e5f5;
  color: var(--accent);
}

.post-message {
  font-size: 1.2rem;
  line-height: 1.6;
  color: var(--text-dark);
  padding: 1rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
  font-style: italic;
}

.post-tags {
  margin-bottom: 1rem;
}

.post-meta {
  color: var(--text-light);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.post-stats {
  display: flex;
  gap: 1.5rem;
  color: var(--text-light);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.post-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
}

.context-reveal {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-light);
  border-radius: 8px;
  border-left: 3px solid var(--love-pink);
}

.context-section {
  margin-bottom: 0.75rem;
}

.context-section:last-child {
  margin-bottom: 0;
}

.context-section label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-light);
  margin-bottom: 0.25rem;
}

.context-section p {
  font-size: 0.95rem;
  color: var(--text-dark);
  padding: 0.5rem;
  background: white;
  border-radius: 6px;
}
</style>
