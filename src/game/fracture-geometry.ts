import * as THREE from 'three';

export type Point = {x:number;y:number};
export type Polygon = Point[];
type Edge = {a:Point;b:Point};
type Interval = {left:Edge;right:Edge};
const at=(edge:Edge,y:number)=>edge.a.x+(edge.b.x-edge.a.x)*(y-edge.a.y)/(edge.b.y-edge.a.y);
const edges=(polygon:Polygon):Edge[]=>polygon.map((a,i)=>({a,b:polygon[(i+1)%polygon.length]!})).filter(e=>Math.abs(e.a.y-e.b.y)>.0001);

/** Stable entropy: geometry never flickers as the simulation advances. */
export function fractureNoise(seed:number,index:number) {
  let v=(seed^Math.imul(index+1,0x45d9f3b))|0;v=Math.imul(v^(v>>>16),0x45d9f3b);v=Math.imul(v^(v>>>16),0x45d9f3b);
  return ((v^(v>>>16))>>>0)/4294967295;
}

export function chippedHole(x:number,y:number,seed:number):Polygon {
  const points:Polygon=[];
  for(let i=0;i<10;i++){
    const angle=i*Math.PI*2/10,spread=.76+fractureNoise(seed,i)*.36;
    points.push({x:x+Math.cos(angle)*(5.7+fractureNoise(seed,20)*1.3)*spread,y:y+Math.sin(angle)*(9.8+fractureNoise(seed,21)*1.4)*spread});
  }
  return points;
}

/** Complementary, seeded fracture masks; the two contours share exactly the same broken edge. */
export function fractureMask(axis:'x'|'y',cut:number,side:number,seed:number,bounds:{left:number;right:number;bottom:number;top:number}):Polygon {
  const vertical=axis==='x',low=vertical?bounds.bottom:bounds.left,high=vertical?bounds.top:bounds.right;
  const along:Polygon=[];
  const count=Math.max(3,Math.ceil((high-low)/15));
  for(let i=0;i<=count;i++){
    const t=i/count,parallel=low+(high-low)*t;
    const broken=cut+(i===0||i===count?0:(fractureNoise(seed,i)-.5)*12);
    along.push(vertical?{x:broken,y:parallel}:{x:parallel,y:broken});
  }
  if(vertical)return side<0?[{x:bounds.left,y:low},...along,{x:bounds.left,y:high}]:[{x:bounds.right,y:low},{x:bounds.right,y:high},...along.reverse()];
  return side<0?[{x:low,y:bounds.bottom},{x:high,y:bounds.bottom},...along.reverse()]:[{x:low,y:bounds.top},...along,{x:high,y:bounds.top}];
}

/** Sweep the union of chipped holes through intersected fracture regions. Produces actual open
 * holes, interior walls and a solid broken perimeter, with UVs anchored to the original slab. */
export function perforatedGeometry(regions:Polygon[],holes:Polygon[],depth:number,offset:Point,root:{width:number;height:number}):THREE.BufferGeometry {
  // Later fragments ignore distant inherited holes; their original source sheet may be huge.
  const limits=regions.reduce((box,polygon)=>({left:Math.max(box.left,Math.min(...polygon.map(p=>p.x))),right:Math.min(box.right,Math.max(...polygon.map(p=>p.x))),bottom:Math.max(box.bottom,Math.min(...polygon.map(p=>p.y))),top:Math.min(box.top,Math.max(...polygon.map(p=>p.y)))}),{left:-Infinity,right:Infinity,bottom:-Infinity,top:Infinity});
  holes=holes.filter(polygon=>Math.max(...polygon.map(p=>p.x))>=limits.left&&Math.min(...polygon.map(p=>p.x))<=limits.right&&Math.max(...polygon.map(p=>p.y))>=limits.bottom&&Math.min(...polygon.map(p=>p.y))<=limits.top);
  const regionEdges=regions.map(edges),holeEdges=holes.map(edges),allEdges=[...regionEdges.flat(),...holeEdges.flat()];
  const ys=[...new Set(allEdges.flatMap(e=>[e.a.y,e.b.y]))].sort((a,b)=>a-b);
  const crossingCuts:number[]=[];
  // Split at edge intersections too, so overlapping chips form clean, watertight unions.
  for(let row=0;row<ys.length-1;row++){
    const low=ys[row]!,high=ys[row+1]!,mid=(low+high)/2;
    const active=allEdges.filter(e=>mid>Math.min(e.a.y,e.b.y)&&mid<Math.max(e.a.y,e.b.y)).map(e=>({e,l:at(e,low),h:at(e,high)})).sort((a,b)=>Math.min(a.l,a.h)-Math.min(b.l,b.h));
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i]!,b=active[j]!;
      if(Math.min(b.l,b.h)>Math.max(a.l,a.h)+.001)break;
      const d0=a.l-b.l,d1=a.h-b.h;
      if(d0*d1<-.000001)crossingCuts.push(low+(high-low)*d0/(d0-d1));
    }
  }
  const cuts=[...new Set([...ys,...crossingCuts])].sort((a,b)=>a-b);
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
  const frontTriangles:number[][][]=[],walls:number[][][]=[];
  const span=(polygonEdges:Edge[],y:number):Interval[]=>{
    const crossings=polygonEdges.filter(e=>y>Math.min(e.a.y,e.b.y)&&y<Math.max(e.a.y,e.b.y)).sort((a,b)=>at(a,y)-at(b,y));
    const intervals:Interval[]=[];for(let i=0;i<crossings.length-1;i+=2)intervals.push({left:crossings[i]!,right:crossings[i+1]!});return intervals;
  };
  const intersect=(a:Interval[],b:Interval[],y:number):Interval[]=>a.flatMap(aa=>b.flatMap(bb=>{
    const left=at(aa.left,y)>at(bb.left,y)?aa.left:bb.left,right=at(aa.right,y)<at(bb.right,y)?aa.right:bb.right;
    return at(right,y)-at(left,y)>.001?[{left,right}]:[];
  }));
  for(let row=0;row<cuts.length-1;row++){
    const y0=cuts[row]!,y1=cuts[row+1]!;if(y1-y0<.0001)continue;const mid=(y0+y1)/2;
    let solids=span(regionEdges[0]!,mid);
    for(const region of regionEdges.slice(1))solids=intersect(solids,span(region,mid),mid);
    const holesAt=holeEdges.flatMap(e=>span(e,mid)).sort((a,b)=>at(a.left,mid)-at(b.left,mid));
    for(const hole of holesAt)solids=solids.flatMap(s=>{
      if(at(hole.right,mid)<=at(s.left,mid)||at(hole.left,mid)>=at(s.right,mid))return[s];
      const pieces:Interval[]=[];
      if(at(hole.left,mid)>at(s.left,mid))pieces.push({left:s.left,right:hole.left});
      if(at(hole.right,mid)<at(s.right,mid))pieces.push({left:hole.right,right:s.right});return pieces;
    });
    for(const s of solids){
      const x00=at(s.left,y0),x01=at(s.right,y0),x10=at(s.left,y1),x11=at(s.right,y1);
      frontTriangles.push([[x00,y0,depth],[x01,y0,depth],[x11,y1,depth],[x10,y1,depth]]);
      walls.push([[x00,y0,-depth],[x00,y0,depth],[x10,y1,depth],[x10,y1,-depth]],[[x01,y0,depth],[x01,y0,-depth],[x11,y1,-depth],[x11,y1,depth]]);
    }
  }
  const quad=(points:number[][],normal?:THREE.Vector3)=>{
    const n=normal??new THREE.Vector3().subVectors(new THREE.Vector3(...points[1] as [number,number,number]),new THREE.Vector3(...points[0] as [number,number,number])).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...points[2] as [number,number,number]),new THREE.Vector3(...points[0] as [number,number,number]))).normalize();
    for(const i of [0,1,2,0,2,3]){const p=points[i]!;positions.push(p[0]!-offset.x,p[1]!-offset.y,p[2]!);normals.push(n.x,n.y,n.z);uvs.push((p[0]!+root.width/2)/root.width,(p[1]!+root.height/2)/(root.height+26));}
  };
  frontTriangles.forEach(q=>quad(q,new THREE.Vector3(0,0,1)));const frontCount=positions.length/3;
  frontTriangles.forEach(q=>quad([...q].reverse().map(p=>[p[0]!,p[1]!,-depth]),new THREE.Vector3(0,0,-1)));walls.forEach(q=>quad(q));
  // Horizontal boundaries only occur at horizontal polygon segments; break them at every
  // crossing and retain those adjacent to solid on exactly one side.
  const horizontal=[...regions,...holes].flatMap(p=>p.map((a,i)=>({a,b:p[(i+1)%p.length]!}))).filter(e=>Math.abs(e.a.y-e.b.y)<.0001);
  const inside=(p:Point,polygon:Polygon)=>{let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i]!,b=polygon[j]!;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;};
  const solid=(p:Point)=>regions.every(poly=>inside(p,poly))&&!holes.some(poly=>inside(p,poly));
  for(const e of horizontal){const y=e.a.y,xs=[e.a.x,e.b.x,...allEdges.filter(a=>y>=Math.min(a.a.y,a.b.y)&&y<=Math.max(a.a.y,a.b.y)).map(a=>at(a,y))].filter(x=>x>=Math.min(e.a.x,e.b.x)-.001&&x<=Math.max(e.a.x,e.b.x)+.001).sort((a,b)=>a-b);
    for(let i=0;i<xs.length-1;i++){const a=xs[i]!,b=xs[i+1]!;if(b-a<.001)continue;const above=solid({x:(a+b)/2,y:y+.001}),below=solid({x:(a+b)/2,y:y-.001});if(above===below)continue;quad(above?[[a,y,-depth],[b,y,-depth],[b,y,depth],[a,y,depth]]:[[a,y,depth],[b,y,depth],[b,y,-depth],[a,y,-depth]]);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.addGroup(0,frontCount,0);geometry.addGroup(frontCount,positions.length/3-frontCount,1);geometry.computeBoundingSphere();return geometry;
}
