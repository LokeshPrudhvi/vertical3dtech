import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ProductDefinition, ZoneState } from '@/types/product';
import { renderTentAtlas, preloadZoneImages, isZoneCustomized } from '@/lib/renderZoneToCanvas';

interface TentModelProps {
  modelAsset: string;
  product: ProductDefinition;
  zoneStates: Record<string, ZoneState>;
}

/**
 * TentModel loads the 3D GLB model and dynamically applies customizations.
 *
 * Key Design & Fallback Rules:
 * 1. If customer doesn't customize the tent, it displays the original GLTF texture & material.
 * 2. If customer customizes specific sections (e.g. Front color/logo), only those sections
 *    update on the 3D tent surface while untouched surfaces preserve the original GLTF texture.
 * 3. Never renders black or blank by ensuring canvas is initialized and preloaded before upload.
 */
export function TentModel({ modelAsset, product, zoneStates }: TentModelProps) {
  const { scene } = useGLTF(modelAsset);

  const atlasCanvasRef = useRef<HTMLCanvasElement>(
    typeof document !== 'undefined' ? document.createElement('canvas') : (null as unknown as HTMLCanvasElement)
  );
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const originalMapRef = useRef<THREE.Texture | null>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Check if any customization has been made by the customer
  const hasAnyCustomization = useMemo(() => {
    return Object.values(zoneStates).some((state) => isZoneCustomized(state));
  }, [zoneStates]);

  // Clone scene so materials/textures are isolated and find the fabric mesh & original texture
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isFabric =
          mat?.name === 'fabric_Mat' ||
          (Array.isArray(mat) && mat.some((m) => m.name === 'fabric_Mat')) ||
          mesh.name.toLowerCase().includes('fabric') ||
          mesh.parent?.name.toLowerCase() === 'fabric';

        if (isFabric) {
          const originalMat = Array.isArray(mat) ? mat[0] : mat;
          if (originalMat.map && !originalMapRef.current) {
            originalMapRef.current = originalMat.map;
          }

          const customMat = originalMat.clone();
          customMat.color.setHex(0xffffff);
          mesh.material = customMat;
        }
      }
    });

    return clone;
  }, [scene]);

  // Initialize CanvasTexture
  useEffect(() => {
    if (!atlasCanvasRef.current) return;

    if (!textureRef.current) {
      atlasCanvasRef.current.width = 2048;
      atlasCanvasRef.current.height = 2048;
      const ctx = atlasCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 2048, 2048);
      }
      const texture = new THREE.CanvasTexture(atlasCanvasRef.current);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      textureRef.current = texture;
    }

    return () => {
      textureRef.current?.dispose();
      textureRef.current = null;
    };
  }, []);

  // Synchronize 3D mesh material with configuration state
  useEffect(() => {
    const originalMap = originalMapRef.current;
    const baseImage = originalMap?.image || null;

    if (!hasAnyCustomization && originalMap) {
      // Customer has NOT customized -> keep original pristine GLTF model texture
      clonedScene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const isFabric =
            mat?.name === 'fabric_Mat' ||
            mesh.name.toLowerCase().includes('fabric') ||
            mesh.parent?.name.toLowerCase() === 'fabric';
          if (isFabric) {
            mat.map = originalMap;
            mat.needsUpdate = true;
          }
        }
      });
      return;
    }

    // Customer HAS customized -> render composite canvas texture
    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

    renderTimeoutRef.current = setTimeout(async () => {
      if (!atlasCanvasRef.current || !textureRef.current) return;

      await preloadZoneImages(zoneStates);
      await renderTentAtlas(atlasCanvasRef.current, product, zoneStates, baseImage);

      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }

      clonedScene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const isFabric =
            mat?.name === 'fabric_Mat' ||
            mesh.name.toLowerCase().includes('fabric') ||
            mesh.parent?.name.toLowerCase() === 'fabric';
          if (isFabric) {
            mat.map = textureRef.current;
            mat.needsUpdate = true;
          }
        }
      });
    }, 16);

    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [clonedScene, product, zoneStates, hasAnyCustomization]);

  return <primitive object={clonedScene} />;
}

// Preload GLB assets for instantaneous size switching
useGLTF.preload('/models/Tent_5_5.glb');
useGLTF.preload('/models/Tent_6_5_6_5.glb');
useGLTF.preload('/models/Tent_8_8.glb');


