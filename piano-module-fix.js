/* 
TEMPORARY FIX FILE - Espone le funzioni di piano.js al window object
Questo file serve per collegare le funzioni modularizzate con gli onclick HTML
*/

import { initPiano } from './piano.js';

// Funzioni da esporre globalmente per compatibilità con onclick HTML
window.selectMeal = function(meal, btnElement) {
  // Aggiorna pasto selezionato
  const buttons = document.querySelectorAll('.meal-btn');
  buttons.forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  
  // Chiama la funzione interna di piano.js
  if (window.pianoModule && window.pianoModule.selectMealInternal) {
    window.pianoModule.selectMealInternal(meal);
  }
};

window.filterOggiIngredients = function(query) {
  const searchQuery = query.toLowerCase().trim();
  const itemsWrap = document.getElementById('mealItemsWrap');
  if (!itemsWrap) return;
  
  const items = itemsWrap.querySelectorAll('.meal-item');
  let visibleCount = 0;
  
  items.forEach(item => {
    const name = (item.querySelector('.meal-item-name')?.textContent || '').toLowerCase();
    const cat = (item.querySelector('.meal-item-icon')?.textContent || '').toLowerCase();
    
    if (!searchQuery || name.includes(searchQuery) || cat.includes(searchQuery)) {
      item.style.display = '';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Aggiorna contatore
  const counter = document.getElementById('oggiSearchCounter');
  if (counter) {
    if (searchQuery) {
      counter.textContent = `${visibleCount} risultati`;
      counter.style.display = 'block';
    } else {
      counter.style.display = 'none';
    }
  }
};

window.clearOggiSearch = function() {
  const input = document.getElementById('oggiSearch');
  if (input) {
    input.value = '';
    window.filterOggiIngredients('');
  }
};

// Inizializza piano quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPiano);
} else {
  initPiano();
}

console.log('[piano-module-fix] Bridge functions loaded');
