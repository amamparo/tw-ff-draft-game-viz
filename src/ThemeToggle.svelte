<script>
  import { onMount } from 'svelte';
  import themeManager from './themeManager.js';
  
  let currentTheme = 'dark';
  let isSystemDefault = true;
  
  onMount(() => {
    currentTheme = themeManager.getTheme();
    isSystemDefault = themeManager.isSystemDefault();
    
    // Listen for theme changes
    themeManager.onChange((newTheme) => {
      currentTheme = newTheme;
      isSystemDefault = themeManager.isSystemDefault();
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