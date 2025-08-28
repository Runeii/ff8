import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Overrides the renderer to only render at a limited frame rate 
 */
export const FrameLimiter = ({ fps, gl, scene, camera, invalidate }: { fps: number; gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera; invalidate: () => void; }) => {
    const time = useRef(performance.now());
    const renderedToScreen = useRef<boolean>(false);

    useEffect(() => {
        const frameTime = 1000 / fps;
        const originalRender = gl.render.bind(gl);


        gl.render = (scene: THREE.Scene, camera: THREE.Camera) => {
            
            // logic to skip frames unless sufficient time has passed.
            // in order to handle multipass pipelines, time is only updated on the first render after a render to screen
            if (performance.now() - time.current >= frameTime) {
                if (renderedToScreen.current) {
                    time.current = performance.now();
                    renderedToScreen.current = false
                }
                if(gl.getRenderTarget() === null){
                    renderedToScreen.current = true;
                }
                originalRender(scene, camera);
            } else {
                invalidate();
            }
        };

        return () => {
            gl.render = originalRender;
        };
    }, [gl, scene, camera, fps, invalidate]);

    return null;
};