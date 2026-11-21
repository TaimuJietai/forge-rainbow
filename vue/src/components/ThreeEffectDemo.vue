<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const canvasHost = ref<HTMLDivElement | null>(null)
const fps = ref(0)
const rendererInfo = ref('检测中…')
const webglOk = ref(true)

const platform = computed(() => {
  try {
    const w = window as unknown as {
      webViewHost?: { platform?: string; webViewEnv?: string }
      Rainbow?: { version?: string }
    }
    return (
      w.webViewHost?.platform ??
      w.webViewHost?.webViewEnv ??
      (w.Rainbow ? 'jssdk' : 'h5')
    )
  } catch {
    return 'h5'
  }
})

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let points: THREE.Points | null = null
let raf = 0
let disposed = false
let frameCount = 0
let lastFpsAt = 0
let resizeObserver: ResizeObserver | null = null

const PARTICLE_COUNT = 1800

function createParticles() {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const colors = new Float32Array(PARTICLE_COUNT * 3)
  const color = new THREE.Color()

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3
    const radius = 1.2 + Math.random() * 2.4
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    // Teal → cyan → soft amber (readable on dark bg, not purple-default)
    color.setHSL(0.42 + Math.random() * 0.12, 0.75, 0.55 + Math.random() * 0.2)
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  return new THREE.Points(geometry, material)
}

function createCore() {
  const geo = new THREE.IcosahedronGeometry(0.55, 1)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x3dd6c6,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
  })
  return new THREE.Mesh(geo, mat)
}

function syncSize() {
  if (!canvasHost.value || !renderer || !camera) return
  const w = canvasHost.value.clientWidth || 1
  const h = canvasHost.value.clientHeight || 1
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate(now: number) {
  if (disposed || !renderer || !scene || !camera) return
  raf = requestAnimationFrame(animate)

  frameCount += 1
  if (!lastFpsAt) lastFpsAt = now
  if (now - lastFpsAt >= 500) {
    fps.value = Math.round((frameCount * 1000) / (now - lastFpsAt))
    frameCount = 0
    lastFpsAt = now
  }

  const t = now * 0.001
  if (points) {
    points.rotation.y = t * 0.22
    points.rotation.x = Math.sin(t * 0.35) * 0.18
  }
  const core = scene.getObjectByName('core')
  if (core) {
    core.rotation.x = t * 0.4
    core.rotation.y = t * 0.55
  }

  camera.position.x = Math.sin(t * 0.2) * 0.35
  camera.position.y = Math.cos(t * 0.15) * 0.2
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
}

function init() {
  const host = canvasHost.value
  if (!host) return

  try {
    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a1218, 0.08)

    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    camera.position.set(0, 0.2, 5.2)

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const gl = renderer.getContext()
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : 'WebGL'
    rendererInfo.value = vendor.length > 48 ? `${vendor.slice(0, 48)}…` : vendor

    points = createParticles()
    scene.add(points)

    const core = createCore()
    core.name = 'core'
    scene.add(core)

    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)

    syncSize()
    resizeObserver = new ResizeObserver(() => syncSize())
    resizeObserver.observe(host)
    window.addEventListener('resize', syncSize)

    lastFpsAt = 0
    frameCount = 0
    raf = requestAnimationFrame(animate)
  } catch (err) {
    webglOk.value = false
    rendererInfo.value = err instanceof Error ? err.message : 'WebGL 初始化失败'
  }
}

function teardown() {
  disposed = true
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', syncSize)
  resizeObserver?.disconnect()
  resizeObserver = null

  if (points) {
    points.geometry.dispose()
    ;(points.material as THREE.Material).dispose()
    points = null
  }

  const core = scene?.getObjectByName('core') as THREE.Mesh | undefined
  if (core) {
    core.geometry.dispose()
    ;(core.material as THREE.Material).dispose()
  }

  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
    renderer = null
  }

  scene = null
  camera = null
}

onMounted(() => {
  disposed = false
  init()
})

onUnmounted(() => {
  teardown()
})
</script>

<template>
  <section class="demo">
    <header class="hud">
      <div class="brand">
        <p class="eyebrow">Rainbow · Three.js</p>
        <h1>粒子星云</h1>
        <p class="sub">各端 WebView 渲染预览</p>
      </div>
      <dl class="meta">
        <div>
          <dt>平台</dt>
          <dd>{{ platform }}</dd>
        </div>
        <div>
          <dt>FPS</dt>
          <dd>{{ webglOk ? fps : '—' }}</dd>
        </div>
        <div class="gpu">
          <dt>GPU</dt>
          <dd>{{ rendererInfo }}</dd>
        </div>
      </dl>
    </header>

    <div ref="canvasHost" class="stage" aria-label="Three.js canvas">
      <p v-if="!webglOk" class="fallback">当前环境无法启动 WebGL：{{ rendererInfo }}</p>
    </div>
  </section>
</template>

<style scoped>
.demo {
  position: relative;
  min-height: 100dvh;
  width: 100%;
  margin: 0;
  overflow: hidden;
  color: #e8f4f1;
  background:
    radial-gradient(ellipse 80% 60% at 50% 35%, #16342f 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 80% 80%, #1a2a3a 0%, transparent 45%),
    linear-gradient(165deg, #071015 0%, #0c1a1f 45%, #0a1014 100%);
}

.hud {
  position: absolute;
  z-index: 2;
  inset: 0 0 auto 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.25rem 0;
  pointer-events: none;
}

.brand .eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7ec8b8;
}

.brand h1 {
  margin: 0;
  font-family: 'Avenir Next', 'Segoe UI', 'PingFang SC', sans-serif;
  font-size: clamp(1.6rem, 5vw, 2.2rem);
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.15;
}

.brand .sub {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: rgba(232, 244, 241, 0.65);
}

.meta {
  display: grid;
  gap: 0.35rem 1rem;
  margin: 0;
  padding: 0.65rem 0.85rem;
  min-width: 9rem;
  background: rgba(8, 18, 22, 0.45);
  border: 1px solid rgba(126, 200, 184, 0.22);
  backdrop-filter: blur(8px);
  font-size: 0.75rem;
}

.meta > div {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0.4rem;
  align-items: baseline;
}

.meta dt {
  margin: 0;
  color: rgba(126, 200, 184, 0.85);
}

.meta dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

.meta .gpu {
  grid-column: 1 / -1;
}

.stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 2rem;
  text-align: center;
  color: #f0a8a0;
  background: rgba(0, 0, 0, 0.35);
}
</style>
