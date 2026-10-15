import * as THREE from 'three';
import { fractureNoise } from './fracture-geometry';

type Vertex=number[];
type Output={p:number[];n:number[];uv:number[];walls:Vertex[][];frontCount:number};
const clip=(polygon:Vertex[],distance:(v:Vertex)=>number):Vertex[]=>{
  const out:Vertex[]=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=distance(a),db=distance(b),inside=da>=-1e-7;
    if(inside)out.push(a);
    if((da>1e-7&&db< -1e-7)||(da< -1e-7&&db>1e-7)){
      const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]!-v)*t));
    }
  }
  return out;
};
function append(output:Output,polygon:Vertex[]){
  for(let i=1;i<polygon.length-1;i++){
    const a=polygon[0]!,b=polygon[i]!,c=polygon[i+1]!;
    const abx=b[0]!-a[0]!,aby=b[1]!-a[1]!,abz=b[2]!-a[2]!,acx=c[0]!-a[0]!,acy=c[1]!-a[1]!,acz=c[2]!-a[2]!;
    const cx=aby*acz-abz*acy,cy=abz*acx-abx*acz,cz=abx*acy-aby*acx;
    if(cx*cx+cy*cy+cz*cz<1e-12)continue;
    for(const v of [a,b,c]){output.p.push(v[0]!,v[1]!,v[2]!);output.n.push(v[3]!,v[4]!,v[5]!);output.uv.push(v[6]!,v[7]!);}
  }
}

/** Clip an already perforated solid. Historical hole contours never need to be swept again.
 * Both halves share the exact jagged seam; front intersections supply real interior walls. */
export function clipDeathSolid(geometry:THREE.BufferGeometry,axis:'x'|'y',cut:number,seed:number,
  parallelLow:number,parallelHigh:number):[THREE.BufferGeometry,THREE.BufferGeometry] {
  const perpendicular=axis==='x'?0:1,parallel=axis==='x'?1:0;
  const count=Math.max(3,Math.ceil((parallelHigh-parallelLow)/15)),step=(parallelHigh-parallelLow)/count;
  const seam=Array.from({length:count+1},(_,i)=>cut+(i===0||i===count?0:(fractureNoise(seed,i)-.5)*12));
  const outputs:Output[]=[{p:[],n:[],uv:[],walls:[],frontCount:0},{p:[],n:[],uv:[],walls:[],frontCount:0}];
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
  const frontCount=geometry.groups[0]!.count;
  for(let triangle=0;triangle<positions.count;triangle+=3){
    if(triangle===frontCount)outputs.forEach(out=>out.frontCount=out.p.length/3);
    const vertices:Vertex[]=[];
    for(let i=triangle;i<triangle+3;i++)vertices.push([positions.getX(i),positions.getY(i),positions.getZ(i),normals.getX(i),normals.getY(i),normals.getZ(i),uv.getX(i),uv.getY(i)]);
    // Most triangles lie nowhere near this seam. Preserve them verbatim, avoiding both
    // allocations and artificial band subdivisions of every historical hole wall.
    const crossLow=Math.min(...vertices.map(v=>v[perpendicular]!)),crossHigh=Math.max(...vertices.map(v=>v[perpendicular]!));
    if(crossHigh<cut-6){append(outputs[0]!,vertices);continue;}
    if(crossLow>cut+6){append(outputs[1]!,vertices);continue;}
    const lo=Math.min(...vertices.map(v=>v[parallel]!)),hi=Math.max(...vertices.map(v=>v[parallel]!));
    const start=Math.max(0,Math.min(count-1,Math.floor((lo-parallelLow)/step))),end=Math.max(start,Math.min(count-1,Math.floor((hi-parallelLow)/step)));
    for(let band=start;band<=end;band++){
      const low=parallelLow+band*step,high=low+step;
      let polygon=vertices;
      if(lo<low-1e-7)polygon=clip(polygon,v=>v[parallel]!-low);
      if(hi>high+1e-7)polygon=clip(polygon,v=>high-v[parallel]!);
      if(polygon.length<3)continue;
      const slope=(seam[band+1]!-seam[band]!)/step,intercept=seam[band]!-slope*low;
      const distance=(v:Vertex)=>v[perpendicular]!-slope*v[parallel]!-intercept;
      const ds=polygon.map(distance),min=Math.min(...ds),max=Math.max(...ds);
      if(max<=1e-7){append(outputs[0]!,polygon);continue;}
      if(min>=-1e-7){append(outputs[1]!,polygon);continue;}
      append(outputs[0]!,clip(polygon,v=>-distance(v)));append(outputs[1]!,clip(polygon,distance));
      if(triangle>=frontCount)continue;
      const intersections:Vertex[]=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=distance(a),db=distance(b);
        if(Math.abs(da)<1e-7)intersections.push(a);
        if(da*db< -1e-14){const t=da/(da-db);intersections.push(a.map((v,k)=>v+(b[k]!-v)*t));}
      }
      if(intersections.length<2)continue;
      intersections.sort((a,b)=>a[parallel]!-b[parallel]!);
      const a=intersections[0]!,b=intersections[intersections.length-1]!;
      if(Math.abs(a[parallel]!-b[parallel]!)<1e-7)continue;
      const normal=new THREE.Vector3(axis==='x'?1:-slope,axis==='x'?-slope:1,0).normalize();
      for(let side=0;side<2;side++){
        const outward=normal.clone().multiplyScalar(side===0?1:-1);
        const vertex=(v:Vertex,z:number)=>[v[0]!,v[1]!,z,outward.x,outward.y,0,v[6]!,v[7]!];
        const wall=[vertex(a,a[2]!),vertex(a,-a[2]!),vertex(b,-b[2]!),vertex(b,b[2]!)];
        const crossX=b[1]!-a[1]!,crossY=-(b[0]!-a[0]!);
        if(crossX*outward.x+crossY*outward.y<0)wall.reverse();
        outputs[side]!.walls.push(wall);
      }
    }
  }
  return outputs.map(output=>{
    if(frontCount===positions.count)output.frontCount=output.p.length/3;
    output.walls.forEach(wall=>append(output,wall));
    const result=new THREE.BufferGeometry();
    result.setAttribute('position',new THREE.Float32BufferAttribute(output.p,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(output.n,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(output.uv,2));
    result.addGroup(0,output.frontCount,0);result.addGroup(output.frontCount,output.p.length/3-output.frontCount,1);result.computeBoundingSphere();
    return result;
  }) as [THREE.BufferGeometry,THREE.BufferGeometry];
}
