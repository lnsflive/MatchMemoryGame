<template>
  <GoogleAuth v-if="isAuthReturn" :search="authSearch" />
  <router-view v-else id="q-app" />
</template>
<script>
import { defineComponent } from 'vue'
import GoogleAuth from 'pages/GoogleAuth.vue'
export default defineComponent({
  name:'App',
  components:{GoogleAuth},
  data() {
    const authSearch = window.__memoryAuthReturn || window.location.search
    delete window.__memoryAuthReturn
    const query = new URLSearchParams(authSearch)
    return {authSearch,isAuthReturn:['state','access_token','error'].some(key => query.has(key))}
  }
})
</script>
