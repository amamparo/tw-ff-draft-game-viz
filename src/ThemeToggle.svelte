<script>
  import { onMount } from 'svelte';
  import themeManager from './themeManager.js';
  
  let currentTheme = 'dark';

  onMount(() => {
    currentTheme = themeManager.getTheme();
    themeManager.onChange((newTheme) => {
      currentTheme = newTheme;
    });
  });
  
  function toggleTheme() {
    themeManager.toggle();
  }
</script>

<div class="theme-toggle">
  <span class="theme-icon">☀️</span>
  <label class="theme-switch">
    <input 
      type="checkbox" 
      checked={currentTheme === 'dark'} 
      on:change={toggleTheme}
      aria-label="Toggle dark mode"
    >
    <span class="theme-slider"></span>
  </label>
  <span class="theme-icon">🌙</span>
</div>