import { Canvas } from '@react-three/fiber'
import { OrbitControls, MeshDistortMaterial, Environment } from '@react-three/drei'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function Blob() {
  const mesh = useRef()

  // Gentle idle rotation so the shape always feels alive.
  useFrame((_, delta) => {
    mesh.current.rotation.y += delta * 0.15
    mesh.current.rotation.x += delta * 0.05
  })

  return (
    <mesh ref={mesh} scale={1.6}>
      <icosahedronGeometry args={[1, 32]} />
      <MeshDistortMaterial
        color="#6b7bff"
        roughness={0.15}
        metalness={0.6}
        distort={0.4}
        speed={2}
      />
    </mesh>
  )
}

export default function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <color attach="background" args={['#0a0a0f']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} />
        <Blob />
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>

      <div className="overlay">
        <h1>Michael Watters</h1>
        <p>Developer &middot; building something new</p>
      </div>
    </>
  )
}
