const API_URL = window.CST3144_API_URL || 'https://cst3144-m01030169-backend.onrender.com';
const { createApp } = Vue;

createApp({
  data: () => ({ lessons: [], displayedLessons: [], cart: [], showCart: false, loading: true, error: null, sortAttribute: 'topic', sortOrder: 'asc', searchQuery: '', searchTimeout: null, checkoutName: '', checkoutPhone: '', orderMessage: '', submitting: false }),
  computed: {
    cartTotal() { return this.cart.reduce((sum, item) => sum + Number(item.price || 0), 0); },
    nameError() { return this.checkoutName !== '' && !/^[A-Za-z\s]+$/.test(this.checkoutName); },
    phoneError() { return this.checkoutPhone !== '' && !/^\d+$/.test(this.checkoutPhone); },
    isCheckoutValid() { return this.cart.length > 0 && /^[A-Za-z\s]+$/.test(this.checkoutName.trim()) && /^\d+$/.test(this.checkoutPhone); }
  },
  methods: {
    async fetchLessons() {
      this.loading = true; this.error = null;
      try { const response = await fetch(`${API_URL}/lessons`); if (!response.ok) throw new Error(); this.lessons = await response.json(); this.displayedLessons = [...this.lessons]; this.sortLessons(); }
      catch (error) { console.error(error); this.error = 'Could not load lessons. Please try again later.'; }
      finally { this.loading = false; }
    },
    sortLessons() {
      const direction = this.sortOrder === 'asc' ? 1 : -1;
      this.displayedLessons.sort((a, b) => { const left = typeof a[this.sortAttribute] === 'string' ? a[this.sortAttribute].toLowerCase() : a[this.sortAttribute]; const right = typeof b[this.sortAttribute] === 'string' ? b[this.sortAttribute].toLowerCase() : b[this.sortAttribute]; return left < right ? -direction : left > right ? direction : 0; });
    },
    onSearch() {
      clearTimeout(this.searchTimeout); this.searchTimeout = setTimeout(async () => {
        const q = this.searchQuery.trim();
        if (!q) { this.displayedLessons = [...this.lessons]; this.sortLessons(); return; }
        try { const response = await fetch(`${API_URL}/lessons/search?q=${encodeURIComponent(q)}`); if (!response.ok) throw new Error(); this.displayedLessons = await response.json(); this.sortLessons(); }
        catch (error) { console.error(error); const lower = q.toLowerCase(); this.displayedLessons = this.lessons.filter((l) => String(l.topic).toLowerCase().includes(lower) || String(l.location).toLowerCase().includes(lower) || String(l.price).includes(q) || String(l.space).includes(q)); }
      }, 300);
    },
    addToCart(lesson) { if (lesson.space <= 0) return; lesson.space -= 1; this.cart.push({ ...lesson }); },
    removeFromCart(index) { const item = this.cart[index]; const original = this.lessons.find((lesson) => lesson._id === item._id); if (original) original.space += 1; const displayed = this.displayedLessons.find((lesson) => lesson._id === item._id); if (displayed && displayed !== original) displayed.space += 1; this.cart.splice(index, 1); },
    async submitOrder() {
      if (!this.isCheckoutValid || this.submitting) return;
      this.submitting = true; this.orderMessage = '';
      try {
        const lessonIDs = this.cart.map((item) => item._id);
        const response = await fetch(`${API_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: this.checkoutName.trim(), phone: this.checkoutPhone, lessonIDs, spaces: lessonIDs.length }) });
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Order failed'); }
        await Promise.all(this.cart.map((item) => { const lesson = this.lessons.find((entry) => entry._id === item._id); return fetch(`${API_URL}/lessons/${item._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ space: lesson.space }) }); }));
        this.orderMessage = 'Order submitted successfully! Thank you for booking.'; this.cart = []; this.checkoutName = ''; this.checkoutPhone = ''; await this.fetchLessons();
      } catch (error) { console.error(error); this.orderMessage = error.message || 'Sorry, something went wrong. Please try again.'; }
      finally { this.submitting = false; }
    }
  },
  mounted() { this.fetchLessons(); }
}).mount('#app');
