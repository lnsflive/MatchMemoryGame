<template>
  <GoogleAuth v-if="isAuthReturn" />
  <router-view v-else id="q-app" />
</template>
<script>
import { defineComponent } from 'vue'
import GoogleAuth from 'pages/GoogleAuth.vue'
export default defineComponent({
  name:'App',
  components:{GoogleAuth},
  data() {
    const query = new URLSearchParams(window.location.search)
    return {isAuthReturn:['state','access_token','error'].some(key => query.has(key))}
  }
})
</script>
