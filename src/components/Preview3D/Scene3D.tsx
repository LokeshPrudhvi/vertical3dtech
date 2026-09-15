import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { useConfigStore } from '@/store/ConfigProvider';
import { TentModel } from './TentModel';

function Loader() {
  return null;
}

export function Scene3D() {
  const product = useConfigStore((s) => s.product);
  const selectedOptions = useConfigStore((s) => s.config.selectedOptions);
  const zoneStates = useConfigStore((s) => s.config.zoneStates);

  const sizeSection = product.sections.find((s) => s.id === 'size');
  const selectedSizeOption = sizeSection?.options?.find((o) => o.id === selectedOptions[sizeSection.id]);
  const modelAsset = selectedSizeOption?.modelAsset;

  if (!modelAsset) {
    return <div className="scene3d-wrap scene3d-empty" role="status">No 3D model available for this configuration.</div>;
  }

  return (
    <div
      className="scene3d-wrap"
      role="region"
      aria-label="3D Interactive Tent Model Viewer"
      tabIndex={0}
    >
      <Canvas
        camera={{ position: [3.2, 1.7, 3.2], fov: 36 }}
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#e9edf1']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={<Loader />}>
          <TentModel modelAsset={modelAsset} product={product} zoneStates={zoneStates} />
          <Environment preset="city" />
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={6} blur={2.2} far={4} />
        </Suspense>
        <OrbitControls
          target={[0, 1.05, 0]}
          enablePan={false}
          minDistance={1.8}
          maxDistance={7}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
      <p className="scene3d-hint" aria-hidden="true">Drag with mouse or touch to rotate · Scroll to zoom</p>
    </div>
  );
}


