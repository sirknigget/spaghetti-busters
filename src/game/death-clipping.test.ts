import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clipDeathSolid } from './death-clipping';
import { chippedHole, perforatedGeometry } from './fracture-geometry';

const volume=(geometry:THREE.BufferGeometry)=>{
  const p=geometry.getAttribute('position');let sum=0;
  for(let i=0;i<p.count;i+=3){
    const ax=p.getX(i),ay=p.getY(i),az=p.getZ(i),bx=p.getX(i+1),by=p.getY(i+1),bz=p.getZ(i+1),cx=p.getX(i+2),cy=p.getY(i+2),cz=p.getZ(i+2);
    sum+=ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx);
  }
  return Math.abs(sum/6);
};

describe('direct death surface clipping',()=>{
  it.each(['x','y'] as const)('preserves volume and closes new %s seams around preexisting holes',axis=>{
    const solid=perforatedGeometry([[{x:-100,y:-50},{x:100,y:-50},{x:100,y:76},{x:-100,y:76}]],
      [chippedHole(1,2,42),chippedHole(29,16,43)],16,{x:0,y:0},{width:200,height:100});
    const halves=clipDeathSolid(solid,axis,0,37,axis==='x'?-51:-101,axis==='x'?77:101);
    expect(volume(halves[0])+volume(halves[1])).toBeCloseTo(volume(solid),0);
    for(const half of halves){
      const p=half.getAttribute('position'),n=half.getAttribute('normal');let seamWalls=0;
      for(let i=half.groups[0]!.count;i<p.count;i++)if(Math.abs(n.getZ(i))<.01&&Math.abs(axis==='x'?p.getX(i):p.getY(i))<7)seamWalls++;
      expect(seamWalls).toBeGreaterThan(12);
      for(let i=0;i<p.count;i++)expect(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i))).toBe(true);
      half.dispose();
    }
    solid.dispose();
  });
});
