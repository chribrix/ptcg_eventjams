<template>
  <div>
    <header class="shadow-sm bg-white"></header>
    <nav class="container mx-auto p-4">
      <NuxtLink class="font-bold" to="/">Products</NuxtLink>
    </nav>
  </div>

  <div class="container mx-auto p-4">
    <slot />
  </div>

  <div>
    <footer class="container mx-auto p-4 flex justify-between border-t-2">
      <ul class="flex gap-4">
        <li><NuxtLink to="/">Home </NuxtLink></li>
        <li><NuxtLink to="/about">About </NuxtLink></li>
        <li><NuxtLink to="/products/random">Random Product </NuxtLink></li>
      </ul>
    </footer>
  </div>
</template>

<style>
.router-link-exact-active {
  color: #12b488;
}
</style>
