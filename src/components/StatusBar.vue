<template>
  <!-- 工具选中时的提示 -->
  <div v-if="selectedTool && selectedTool !== 'select'" class="mb-2">
    <div class="alert alert-info py-2 px-3 text-xs">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>绘制模式：所有元素已锁定，无法编辑</span>
    </div>
  </div>

  <!-- 选择模式提示 -->
  <div v-if="selectedTool === 'select'" class="mb-2">
    <div class="alert alert-success py-2 px-3 text-xs">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>选择模式：点击元素可选中并编辑</span>
    </div>
  </div>

  <!-- 绘制状态提示 -->
  <div v-if="isDrawing && !connectionMode.active" class="badge badge-warning mb-2">
    正在绘制 {{ selectedTool }}... (ESC或右键取消)
  </div>

  <!-- 连接状态提示 -->
  <div v-if="isDrawing && connectionMode.active" class="badge badge-info mb-2">
    正在连接元素... (拖拽到目标元素)
  </div>
</template>
