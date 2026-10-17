<template>
  <div class="memory-shell">
    <header class="memory-header">
      <div class="memory-header__inner">
        <a class="memory-brand" href="./" aria-label="Match Memory home">
          <span class="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>MATCH<span class="brand-word">MEMORY</span></span>
        </a>
        <div class="memory-header__account"><slot name="account" /></div>
      </div>
    </header>
    <div class="memory-content"><slot /></div>
    <footer v-if="$slots.footer" class="memory-footer">
      <div class="memory-footer__inner"><slot name="footer" /></div>
    </footer>
  </div>
</template>
<script setup lang="ts">
defineOptions({ name: 'MemoryLayout' })
</script>
<style lang="scss" scoped>
.memory-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #f2f0e9;
  background: #142633;
  background-image: radial-gradient(ellipse at 80% 30%, #223a4670, transparent 65%);
  font-family: 'Roboto', sans-serif;
}
.memory-header { border-bottom: 1px solid #ffffff0c; }
.memory-header__inner, .memory-footer__inner { width: min(100%, 1156px); margin: auto; padding-inline: 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.memory-header__inner { min-height: 88px; }
.memory-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #f2f0e9; font-size: 14px; letter-spacing: 2px; line-height: 1.25; font-weight: 700; }
.brand-word { display: block; color: #ffb347; }
.brand-mark { display: grid; grid-template-columns: repeat(2, 11px); gap: 4px; transform: rotate(-12deg); }
.brand-mark i { width: 11px; height: 11px; border: 1.5px solid #ffb347; border-radius: 2px; }
.brand-mark i:first-child, .brand-mark i:last-child { background: #ffb347; }
.memory-header__account { min-width: 0; }
.memory-content { display: flex; flex: 1; min-width: 0; }
.memory-footer__inner { min-height: 60px; border-top: 1px solid #ffffff0c; color: #91a4af; font-size: 10px; letter-spacing: .2px; }
.memory-footer__inner :first-child { font-size: 8px; letter-spacing: 1.4px; }
@media (max-width: 700px) {
  .memory-header__inner { min-height: 68px; padding-inline: 20px; gap: 8px; }
  .memory-brand { font-size: 11px; letter-spacing: 1.5px; gap: 9px; }
  .brand-mark { grid-template-columns: repeat(2, 9px); gap: 3px; }
  .brand-mark i { width: 9px; height: 9px; }
  .memory-footer__inner { padding: 16px 20px; min-height: 48px; }
  .memory-footer__inner :last-child { display: none; }
}
@media (orientation: landscape) and (max-height: 600px) {
  .memory-header__inner { min-height: 58px; }
  .memory-footer__inner { min-height: 34px; padding-block: 8px; }
}
</style>
