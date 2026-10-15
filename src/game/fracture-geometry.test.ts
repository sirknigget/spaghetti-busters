import { describe, expect, it } from 'vitest';
import { chippedHole, fractureMask, perforatedGeometry, type Polygon } from './fracture-geometry';

const root={width:200,height:100};
const bounds={left:-100,right:100,bottom:-50,top:76};
const slab:Polygon=[{x:-100,y:-50},{x:100,y:-50},{x:100,y:76},{x:-100,y:76}];
const area=(geometry:ReturnType<typeof perforatedGeometry>)=>{
  const p=geometry.getAttribute('position'),count=geometry.groups[0]!.count;let sum=0;
  for(let i=0;i<count;i+=3)sum+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getY(i+2)-p.getY(i))-(p.getY(i+1)-p.getY(i))*(p.getX(i+2)-p.getX(i)))/2;
  return sum;
};

describe('physical code fracture surfaces',()=>{
  it('creates stable irregular chips with real open centers and walls',()=>{
    const hole=chippedHole(0,0,42);
    expect(hole).toEqual(chippedHole(0,0,42));
    expect(hole).not.toEqual(chippedHole(0,0,43));
    const geometry=perforatedGeometry([slab],[hole],16,{x:0,y:0},root);
    expect(area(geometry)).toBeLessThan(200*126-100);
    expect(area(geometry)).toBeGreaterThan(200*126-400);
    expect(geometry.groups[1]!.count).toBeGreaterThan(geometry.groups[0]!.count);
    const positions=geometry.getAttribute('position');
    for(let i=0;i<geometry.groups[0]!.count;i+=3){
      const ax=positions.getX(i),ay=positions.getY(i),bx=positions.getX(i+1),by=positions.getY(i+1),cx=positions.getX(i+2),cy=positions.getY(i+2);
      // The hole center cannot fall inside any surviving surface triangle.
      const crosses=[ax*by-ay*bx,bx*cy-by*cx,cx*ay-cy*ax];
      expect(crosses.every(v=>v>1e-5)||crosses.every(v=>v< -1e-5)).toBe(false);
    }
    geometry.dispose();
  });

  it.each(['x','y'] as const)('makes complementary jagged %s halves without losing or inventing surface',axis=>{
    const holes=[chippedHole(-2,2,22),chippedHole(3,0,23),chippedHole(30,20,24)];
    const whole=perforatedGeometry([slab],holes,16,{x:0,y:0},root);
    const halves=[-1,1].map(side=>perforatedGeometry([slab,fractureMask(axis,0,side,123,bounds)],holes,16,{x:side*45,y:12},root));
    expect(area(halves[0]!)+area(halves[1]!)).toBeCloseTo(area(whole),2);
    // Root UVs stay anchored even though a fragment's local origin is shifted.
    for(let sideIndex=0;sideIndex<halves.length;sideIndex++){
      const geometry=halves[sideIndex]!,p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),offsetX=(sideIndex===0?-1:1)*45;
      for(let i=0;i<geometry.groups[0]!.count;i++){
        expect(uv.getX(i)).toBeCloseTo((p.getX(i)+offsetX+100)/200,5);
        expect(uv.getY(i)).toBeCloseTo((p.getY(i)+12+50)/126,5);
      }
      geometry.dispose();
    }
    whole.dispose();
  });
});
