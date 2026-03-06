<template>
  <footer class="relative py-16 bg-navy-950">
    <div class="max-w-6xl mx-auto px-6 md:px-12">
      <div class="flex flex-col items-center text-center">
        <!-- Logo mark -->
        <img
          src="/logo.jpg"
          alt="SAHA Institute"
          class="h-12 w-auto rounded opacity-70 mb-6"
        />

        <!-- Institute name -->
        <h3 class="font-display text-sm font-semibold tracking-wider text-navy-300 uppercase mb-1">
          SAHA Institute For Learning
        </h3>

        <p class="font-body text-xs text-navy-500 tracking-widest mb-8">
          Est. 2020
        </p>

        <!-- Divider -->
        <div class="w-8 h-px bg-navy-700 mb-8"></div>

        <!-- Contact placeholder -->
        <div class="flex flex-col sm:flex-row items-center gap-6 text-sm font-body text-navy-500">
          <a href="mailto:info@sahainstitute.com" class="animated-underline pb-0.5 hover:text-navy-300 transition-colors duration-300">
            info@sahainstitute.com
          </a>
          <span class="hidden sm:block w-1 h-1 rounded-full bg-navy-700"></span>
          <span class="hover:text-navy-300 transition-colors duration-300">
            (555) 123-4567
          </span>
        </div>

        <!-- Copyright -->
        <p class="mt-10 font-body text-[11px] text-navy-600 tracking-wider">
          &copy; 2024 SAHA Institute For Learning. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>
