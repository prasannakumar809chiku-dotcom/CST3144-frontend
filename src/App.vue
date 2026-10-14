<script setup>
import { computed, onMounted, ref } from 'vue'

const DEFAULT_API_BASE_URL = 'https://cst3144-m01030169-backend.onrender.com'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

const lessons = ref([])
const loading = ref(false)
const errorMessage = ref('')
const lessonsMessage = ref('')
const checkoutMessage = ref('')

const searchTerm = ref('')
const teacherFilter = ref('')
const sortBy = ref('subject')
const sortDirection = ref('asc')

const cart = ref({})
const checkout = ref({
  name: '',
  phone: ''
})
const submittingOrder = ref(false)

const enrolmentState = ref({})

const sortOptions = [
  { value: 'subject', label: 'Subject' },
  { value: 'location', label: 'Location' },
  { value: 'price', label: 'Price' },
  { value: 'spaces', label: 'Spaces' }
]

function normalizeLesson(rawLesson) {
  const id = rawLesson._id || rawLesson.id || rawLesson.lessonId
  return {
    ...rawLesson,
    id,
    subject: rawLesson.subject || 'Unknown subject',
    location: rawLesson.location || 'Unknown location',
    price: Number(rawLesson.price || 0),
    spaces: Number(rawLesson.spaces || 0),
    image: rawLesson.image || rawLesson.icon || 'https://via.placeholder.com/300x180?text=Lesson',
    description: rawLesson.description || 'No description available.',
    teacher: rawLesson.teacher || 'Teacher information unavailable'
  }
}

async function fetchLessons() {
  loading.value = true
  errorMessage.value = ''
  lessonsMessage.value = ''

  try {
    const params = new URLSearchParams()

    if (searchTerm.value.trim()) {
      params.set('search', searchTerm.value.trim())
      params.set('q', searchTerm.value.trim())
    }

    if (teacherFilter.value.trim()) {
      params.set('teacher', teacherFilter.value.trim())
    }

    const endpoint = `${API_BASE_URL}/lessons${params.toString() ? `?${params}` : ''}`
    const response = await fetch(endpoint)

    if (!response.ok) {
      throw new Error('Unable to load lessons from the backend API.')
    }

    const data = await response.json()
    lessons.value = Array.isArray(data) ? data.map(normalizeLesson).filter((lesson) => lesson.id) : []

    if (lessons.value.length === 0) {
      lessonsMessage.value = 'No lessons match your filters right now.'
    }
  } catch (error) {
    errorMessage.value = error.message || 'Something went wrong while loading lessons.'
    lessons.value = []
  } finally {
    loading.value = false
  }
}

const teacherOptions = computed(() => {
  const options = new Set(lessons.value.map((lesson) => lesson.teacher).filter(Boolean))
  return Array.from(options).sort((a, b) => a.localeCompare(b))
})

const sortedLessons = computed(() => {
  const searched = lessons.value.filter((lesson) => {
    const keyword = searchTerm.value.trim().toLowerCase()
    const teacher = teacherFilter.value.trim().toLowerCase()

    const keywordMatch = !keyword ||
      lesson.subject.toLowerCase().includes(keyword) ||
      lesson.location.toLowerCase().includes(keyword) ||
      lesson.description.toLowerCase().includes(keyword)

    const teacherMatch = !teacher || lesson.teacher.toLowerCase().includes(teacher)

    return keywordMatch && teacherMatch
  })

  const sorted = [...searched]
  sorted.sort((a, b) => {
    const first = a[sortBy.value]
    const second = b[sortBy.value]

    if (typeof first === 'number' && typeof second === 'number') {
      return sortDirection.value === 'asc' ? first - second : second - first
    }

    return sortDirection.value === 'asc'
      ? String(first).localeCompare(String(second))
      : String(second).localeCompare(String(first))
  })

  return sorted
})

const cartItems = computed(() => {
  return Object.entries(cart.value)
    .map(([lessonId, quantity]) => {
      const lesson = lessons.value.find((item) => item.id === lessonId)
      if (!lesson || quantity <= 0) {
        return null
      }

      return {
        lessonId,
        quantity,
        lesson,
        subtotal: quantity * lesson.price
      }
    })
    .filter(Boolean)
})

const cartCount = computed(() => cartItems.value.reduce((total, item) => total + item.quantity, 0))
const cartTotal = computed(() => cartItems.value.reduce((total, item) => total + item.subtotal, 0))

const nameIsValid = computed(() => /^[A-Za-z\s]+$/.test(checkout.value.name.trim()))
const phoneIsValid = computed(() => /^[0-9]+$/.test(checkout.value.phone.trim()))

function addToCart(lesson) {
  if (lesson.spaces <= 0) {
    return
  }

  cart.value[lesson.id] = (cart.value[lesson.id] || 0) + 1
  lesson.spaces -= 1
}

function removeFromCart(lessonId) {
  const quantity = cart.value[lessonId]
  if (!quantity) {
    return
  }

  const lesson = lessons.value.find((item) => item.id === lessonId)
  if (lesson) {
    lesson.spaces += 1
  }

  if (quantity === 1) {
    delete cart.value[lessonId]
    cart.value = { ...cart.value }
  } else {
    cart.value[lessonId] -= 1
  }
}

async function loadEnrolment(lessonId) {
  enrolmentState.value = {
    ...enrolmentState.value,
    [lessonId]: {
      loading: true,
      error: '',
      data: null
    }

    function formatEnrolment(data) {
      if (!data || typeof data !== 'object') {
        return 'No enrolment details available.'
      }

      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ')
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/enrolment/${lessonId}`)

    if (!response.ok) {
      throw new Error('Enrolment information is currently unavailable.')
    }

    const data = await response.json()
    enrolmentState.value = {
      ...enrolmentState.value,
      [lessonId]: {
        loading: false,
        error: '',
        data
      }
    }
  } catch (error) {
    enrolmentState.value = {
      ...enrolmentState.value,
      [lessonId]: {
        loading: false,
        error: error.message,
        data: null
      }
    }
  }
}

async function submitOrder() {
  checkoutMessage.value = ''
  errorMessage.value = ''

  if (cartItems.value.length === 0) {
    errorMessage.value = 'Please add at least one lesson to your cart.'
    return
  }

  if (!nameIsValid.value || !phoneIsValid.value) {
    errorMessage.value = 'Please enter a valid name and phone number before checkout.'
    return
  }

  submittingOrder.value = true

  try {
    const orderPayload = {
      name: checkout.value.name.trim(),
      phone: checkout.value.phone.trim(),
      lessonIds: cartItems.value.map((item) => item.lessonId),
      items: cartItems.value.map((item) => ({
        lessonId: item.lessonId,
        subject: item.lesson.subject,
        quantity: item.quantity,
        price: item.lesson.price,
        spaces: item.quantity
      })),
      total: cartTotal.value
    }

    const orderResponse = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    })

    if (!orderResponse.ok) {
      throw new Error('Order submission failed. Please try again.')
    }

    await Promise.all(
      cartItems.value.map(async (item) => {
        const response = await fetch(`${API_BASE_URL}/lessons/${item.lessonId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lessonId: item.lessonId,
            spaces: item.lesson.spaces,
            decrementBy: item.quantity
          })
        })

        if (!response.ok) {
          throw new Error('Order saved, but lesson spaces could not be updated.')
        }
      })
    )

    cart.value = {}
    checkout.value = { name: '', phone: '' }
    checkoutMessage.value = 'Order placed successfully. Thank you for your booking!'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to complete checkout right now.'
  } finally {
    submittingOrder.value = false
  }
}

onMounted(fetchLessons)
</script>

<template>
  <div class="app-shell">
    <header class="page-header">
      <h1>After-School Class Booking</h1>
      <p>Browse lessons, sort your options, and book classes with secure checkout.</p>
      <p class="info">API: {{ API_BASE_URL }}</p>
    </header>

    <main class="layout">
      <section class="lesson-panel" aria-live="polite">
        <h2>Lessons</h2>

        <form class="filters" @submit.prevent="fetchLessons">
          <label for="search-input">
            Search
            <input
              id="search-input"
              v-model="searchTerm"
              type="text"
              placeholder="Search by subject or keyword"
            />
          </label>

          <label for="teacher-filter">
            Teacher
            <select id="teacher-filter" v-model="teacherFilter">
              <option value="">All teachers</option>
              <option v-for="teacher in teacherOptions" :key="teacher" :value="teacher">
                {{ teacher }}
              </option>
            </select>
          </label>

          <label for="sort-by">
            Sort by
            <select id="sort-by" v-model="sortBy">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label for="sort-direction">
            Direction
            <select id="sort-direction" v-model="sortDirection">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>

          <button type="submit">Apply filters</button>
          <button type="button" class="secondary" @click="fetchLessons">Reload lessons</button>
        </form>

        <p v-if="loading" class="info">Loading lessons...</p>
        <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
        <p v-else-if="lessonsMessage" class="success">{{ lessonsMessage }}</p>
        <p v-if="!loading && lessons.length > 0 && lessons.length < 10" class="info">
          Showing {{ lessons.length }} lessons from the API.
        </p>

        <div v-if="!loading && lessons.length" class="lesson-grid">
          <article v-for="lesson in sortedLessons" :key="lesson.id" class="lesson-card">
            <img :src="lesson.image" :alt="`${lesson.subject} illustration`" loading="lazy" />
            <h3>{{ lesson.subject }}</h3>
            <p><strong>Teacher:</strong> {{ lesson.teacher }}</p>
            <p><strong>Location:</strong> {{ lesson.location }}</p>
            <p><strong>Price:</strong> £{{ lesson.price.toFixed(2) }}</p>
            <p><strong>Available spaces:</strong> {{ lesson.spaces }}</p>
            <p>{{ lesson.description }}</p>

            <div class="actions">
              <button :disabled="lesson.spaces === 0" @click="addToCart(lesson)">Add to cart</button>
              <button type="button" class="secondary" @click="loadEnrolment(lesson.id)">View enrolment</button>
            </div>

            <p v-if="lesson.spaces === 0" class="warning">Fully booked</p>

            <p v-if="enrolmentState[lesson.id]?.loading" class="info">Loading enrolment...</p>
            <p v-else-if="enrolmentState[lesson.id]?.error" class="error">
              {{ enrolmentState[lesson.id].error }}
            </p>
            <p v-else-if="enrolmentState[lesson.id]?.data" class="info">
              Enrolment: {{ formatEnrolment(enrolmentState[lesson.id].data) }}
            </p>
          </article>
        </div>

        <p v-if="!loading && !lessons.length && !errorMessage" class="info">
          No lessons available.
        </p>
      </section>

      <aside class="cart-panel">
        <h2>Cart ({{ cartCount }})</h2>

        <ul v-if="cartItems.length" class="cart-list" aria-live="polite">
          <li v-for="item in cartItems" :key="item.lessonId">
            <div>
              <strong>{{ item.lesson.subject }}</strong>
              <p>Qty: {{ item.quantity }} · £{{ item.subtotal.toFixed(2) }}</p>
            </div>
            <button class="secondary" @click="removeFromCart(item.lessonId)">Remove</button>
          </li>
        </ul>
        <p v-else class="info">Your cart is empty.</p>

        <p class="cart-total"><strong>Total:</strong> £{{ cartTotal.toFixed(2) }}</p>

        <form class="checkout" @submit.prevent="submitOrder">
          <h3>Checkout</h3>
          <p v-if="checkoutMessage" class="success">{{ checkoutMessage }}</p>

          <label for="checkout-name">
            Name
            <input
              id="checkout-name"
              v-model="checkout.name"
              type="text"
              placeholder="Letters and spaces only"
              required
            />
          </label>
          <p v-if="checkout.name && !nameIsValid" class="error">Name must contain letters and spaces only.</p>

          <label for="checkout-phone">
            Phone
            <input
              id="checkout-phone"
              v-model="checkout.phone"
              type="tel"
              placeholder="Numbers only"
              required
            />
          </label>
          <p v-if="checkout.phone && !phoneIsValid" class="error">Phone number must contain numbers only.</p>

          <button type="submit" :disabled="submittingOrder || !nameIsValid || !phoneIsValid || !cartItems.length">
            {{ submittingOrder ? 'Placing order...' : 'Place order' }}
          </button>
        </form>
      </aside>
    </main>
  </div>
</template>
