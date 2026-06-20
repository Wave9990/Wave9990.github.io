/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'
import './BrandLanyard.css'

function makeCardTexture(back = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 880
  const ctx = canvas.getContext('2d')!
  const paper = ctx.createLinearGradient(0, 0, 640, 880)
  paper.addColorStop(0, '#eee9d8')
  paper.addColorStop(.55, '#d8d1bb')
  paper.addColorStop(1, '#bdb397')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, 640, 880)
  for (let i = 0; i < 900; i++) {
    const a = ((i * 47) % 100) / 100 * .05
    ctx.fillStyle = `rgba(23,21,18,${a})`
    ctx.fillRect((i * 83) % 640, (i * 131) % 880, 1 + i % 2, 1 + i % 3)
  }
  if (!back) {
    ctx.strokeStyle = 'rgba(10,10,9,.78)'
    ctx.lineWidth = 19
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(320, 338, 205, -.7, Math.PI * 1.65)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(10,10,9,.14)'
    ctx.lineWidth = 35
    ctx.beginPath()
    ctx.arc(330, 345, 220, 1.25, 2.5)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#090909'
    ctx.font = '700 285px "STKaiti", "KaiTi", "Songti SC", serif'
    ctx.fillText('吾', 320, 345)
    ctx.font = '600 28px "Songti SC", serif'
    ctx.letterSpacing = '8px'
    ctx.fillText('唯吾', 324, 650)
    ctx.font = '500 17px system-ui, sans-serif'
    ctx.letterSpacing = '3px'
    ctx.fillStyle = 'rgba(9,9,9,.62)'
    ctx.fillText('装修行业 IP 运营与内容获客服务商', 320, 706)
    ctx.fillStyle = '#090909'
    ctx.fillRect(246, 758, 148, 2)
  } else {
    ctx.fillStyle = '#0a0a09'
    ctx.fillRect(34, 34, 572, 812)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#dedbc8'
    ctx.font = '700 96px "STKaiti", "KaiTi", serif'
    ctx.fillText('唯吾', 320, 318)
    ctx.font = '500 23px system-ui, sans-serif'
    ctx.letterSpacing = '6px'
    ctx.fillText('WEIWU STUDIO', 320, 412)
    ctx.font = '400 18px system-ui, sans-serif'
    ctx.letterSpacing = '2px'
    ctx.fillStyle = 'rgba(222,219,200,.58)'
    ctx.fillText('让内容成为可复盘的获客系统', 320, 532)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeBandTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#090909'
  ctx.fillRect(0, 0, 1024, 96)
  ctx.fillStyle = '#dedbc8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.letterSpacing = '7px'
  ctx.fillText('WEIWU  ·  装修 IP  ·  WEIWU  ·  内容获客', 512, 48)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

function Band({ isMobile }: { isMobile: boolean }) {
  const band = useRef<any>(null)
  const fixed = useRef<any>(null)
  const joint1 = useRef<any>(null)
  const joint2 = useRef<any>(null)
  const joint3 = useRef<any>(null)
  const card = useRef<any>(null)
  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false)
  const [hovered, setHovered] = useState(false)
  const front = useMemo(() => makeCardTexture(false), [])
  const back = useMemo(() => makeCardTexture(true), [])
  const bandMap = useMemo(makeBandTexture, [])
  const curve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), [])
  const geometry = useMemo(() => new MeshLineGeometry(), [])
  const material = useMemo(() => {
    const instance = new MeshLineMaterial({ color: '#dedbc8', map: bandMap, useMap: 1, repeat: new THREE.Vector2(-3, 1), lineWidth: isMobile ? .52 : .58, resolution: new THREE.Vector2(1000, 1000) } as any)
    instance.depthTest = false
    return instance
  }, [bandMap, isMobile])
  const vec = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const angular = useMemo(() => new THREE.Vector3(), [])
  const rotation = useMemo(() => new THREE.Vector3(), [])
  const segmentProps = { canSleep: true, colliders: false as const, angularDamping: 7, linearDamping: 6, ccd: true }

  useRopeJoint(fixed, joint1, [[0,0,0],[0,0,0],.72])
  useRopeJoint(joint1, joint2, [[0,0,0],[0,0,0],.72])
  useRopeJoint(joint2, joint3, [[0,0,0],[0,0,0],.72])
  useSphericalJoint(joint3, card, [[0,0,0],[0,1.55,0]])

  useEffect(() => {
    document.body.style.cursor = hovered ? (dragged ? 'grabbing' : 'grab') : 'auto'
    return () => { document.body.style.cursor = 'auto' }
  }, [hovered, dragged])

  useEffect(() => () => { front.dispose(); back.dispose(); bandMap.dispose(); geometry.dispose(); material.dispose() }, [front, back, bandMap, geometry, material])

  useFrame((state, delta) => {
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, .5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, joint1, joint2, joint3, fixed].forEach(ref => ref.current?.wakeUp())
      const anchor = fixed.current?.translation() || { x: 0, y: 3.65, z: 0 }
      card.current.setNextKinematicTranslation({
        x: THREE.MathUtils.clamp(vec.x - dragged.x, anchor.x - 2.7, anchor.x + 3.2),
        y: THREE.MathUtils.clamp(vec.y - dragged.y, anchor.y - 4.2, anchor.y + .6),
        z: THREE.MathUtils.clamp(vec.z - dragged.z, -1.8, 1.8),
      })
    }
    if (!fixed.current || !joint1.current || !joint2.current || !joint3.current || !card.current) return
    const anchor = fixed.current.translation()
    const current = card.current.translation()
    const escaped = !Number.isFinite(current.x + current.y + current.z) || Math.abs(current.x - anchor.x) > 6 || current.y < anchor.y - 6 || current.y > anchor.y + 3 || Math.abs(current.z) > 5
    if (escaped) {
      const reset = (body:any, position:{x:number;y:number;z:number}) => {
        body.setTranslation(position, true)
        body.setLinvel({ x:0, y:0, z:0 }, true)
        body.setAngvel({ x:0, y:0, z:0 }, true)
      }
      reset(joint1.current, { x:anchor.x + .65, y:anchor.y - .05, z:anchor.z })
      reset(joint2.current, { x:anchor.x + 1.25, y:anchor.y - .12, z:anchor.z })
      reset(joint3.current, { x:anchor.x + 1.8, y:anchor.y - .18, z:anchor.z })
      reset(card.current, { x:anchor.x + 2.15, y:anchor.y - 1.7, z:anchor.z })
      setDragged(false)
    }
    ;[joint1, joint2].forEach(ref => {
      if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
      const distance = Math.max(.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
      ref.current.lerped.lerp(ref.current.translation(), delta * distance * 40)
    })
    curve.points[0].copy(joint3.current.translation())
    curve.points[1].copy(joint2.current.lerped)
    curve.points[2].copy(joint1.current.lerped)
    curve.points[3].copy(fixed.current.translation())
    geometry.setPoints(curve.getPoints(isMobile ? 16 : 28))
    angular.copy(card.current.angvel())
    rotation.copy(card.current.rotation())
    card.current.setAngvel({ x: angular.x, y: angular.y - rotation.y * .25, z: angular.z })
  })

  curve.curveType = 'chordal'
  return <>
    <group position={[-1.45, 3.65, 0]}>
      <RigidBody ref={fixed} {...segmentProps} type="fixed"/>
      <RigidBody ref={joint1} {...segmentProps} position={[.65,-.05,0]}><BallCollider args={[.08]}/></RigidBody>
      <RigidBody ref={joint2} {...segmentProps} position={[1.25,-.12,0]}><BallCollider args={[.08]}/></RigidBody>
      <RigidBody ref={joint3} {...segmentProps} position={[1.8,-.18,0]}><BallCollider args={[.08]}/></RigidBody>
      <RigidBody ref={card} {...segmentProps} position={[2.15,-1.7,0]} type={dragged ? 'kinematicPosition' : 'dynamic'}>
        <CuboidCollider args={[1.05,1.48,.07]}/>
        <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onPointerUp={(e:any) => { e.target.releasePointerCapture(e.pointerId); setDragged(false) }} onPointerDown={(e:any) => { e.target.setPointerCapture(e.pointerId); setDragged(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation()))) }}>
          <RoundedBox args={[2.12,2.98,.14]} radius={.14} smoothness={5}><meshPhysicalMaterial color="#171614" metalness={.28} roughness={.38} clearcoat={1}/></RoundedBox>
          <mesh position={[0,0,.076]}><planeGeometry args={[1.98,2.84]}/><meshBasicMaterial map={front}/></mesh>
          <mesh position={[0,0,-.076]} rotation={[0,Math.PI,0]}><planeGeometry args={[1.98,2.84]}/><meshBasicMaterial map={back}/></mesh>
          <mesh position={[0,1.58,0]}><torusGeometry args={[.22,.055,10,32]}/><meshStandardMaterial color="#89816d" metalness={.9} roughness={.2}/></mesh>
        </group>
      </RigidBody>
    </group>
    <mesh ref={band} geometry={geometry} material={material}/>
  </>
}

export default function BrandLanyard() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => { const resize = () => setMobile(window.innerWidth < 768); window.addEventListener('resize',resize); return () => window.removeEventListener('resize',resize) }, [])
  return <div className="brand-lanyard" aria-label="唯吾品牌吊牌，可拖拽互动">
    <a href="#top" className="brand-lanyard-anchor" aria-label="唯吾首页"><img src="/weiwu-mark.svg" alt=""/></a>
    <Canvas camera={{ position:[0,0,mobile ? 18 : 17], fov:26 }} dpr={[1,mobile ? 1.25 : 1.75]} gl={{ alpha:true, antialias:!mobile }}>
      <ambientLight intensity={Math.PI * .85}/>
      <Physics gravity={[0,mobile ? -16 : -23,0]} timeStep={1/60}><Band isMobile={mobile}/></Physics>
      <Environment blur={.8}><Lightformer intensity={4} color="#dedbc8" position={[-4,2,6]} scale={[8,3,1]}/><Lightformer intensity={2} color="#8c7b5d" position={[5,-2,3]} scale={[6,2,1]}/></Environment>
    </Canvas>
  </div>
}
