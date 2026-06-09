<template>
  <div id="app">
    <header class="site-header">
      <h1 @click="$router.push('/')" class="logo">✉️ 旧短信情书展</h1>
      <nav>
        <router-link to="/">首页</router-link>
        <router-link to="/wall">情书墙</router-link>
        <router-link to="/gallery">匿名广场</router-link>
      </nav>
    </header>
    <main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="site-footer">
      <p>💌 每一条旧短信，都是时光里的情书</p>
    </footer>
  </div>
</template>

<script setup>
</script>
