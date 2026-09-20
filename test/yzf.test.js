import {describe, it, expect} from 'vitest';
import * as THREE from 'three';
import {bakeRigidGeometry, describeGroup} from '../web/src/bikes/yzf-model.js';
import {validateModelDetection} from '../web/src/bikes/detection.js';

function rigidFixture() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 1,0,0, 0,1,0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0,0,1, 0,0,1, 0,0,1], 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(12).fill(0), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1,0,0,0, 1,0,0,0, 1,0,0,0], 4));
  geometry.setIndex([0,1,2]);
  const bone = new THREE.Bone(); bone.name = 'fixture'; bone.position.set(0.2, 0.4, 0);
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.add(bone); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton([bone]));
  mesh.position.set(0.3, 0.7, -0.8); mesh.rotation.y = 0.7; mesh.scale.setScalar(1.15);
  bone.position.x += 0.3; bone.rotation.x = 0.4;
  mesh.updateMatrixWorld(true); mesh.skeleton.update();
  return mesh;
}

describe('YZF rigid import', () => {
  it('preserves the rendered pose and triangle topology through bone and world transforms', () => {
    const mesh = rigidFixture();
    const before = Array.from(mesh.geometry.attributes.position.array);
    const baked = bakeRigidGeometry(mesh);
    for (let i = 0; i < 3; i++) {
      const expected = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      const actual = new THREE.Vector3().fromBufferAttribute(baked.attributes.position, i);
      expect(actual.distanceTo(expected)).toBeLessThan(0.000001);
    }
    expect(Array.from(baked.index.array)).toEqual([0,1,2]);
    expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(before);
    expect(baked.attributes.skinIndex).toBeUndefined();
    expect(baked.userData.sourceJoint).toBe('fixture');
  });
  it('refuses deforming weights instead of silently changing geometry', () => {
    const mesh = rigidFixture();
    mesh.geometry.attributes.skinWeight.setXYZW(0, 0.6, 0.4, 0, 0);
    expect(() => bakeRigidGeometry(mesh)).toThrow('deforming skin');
  });
  it('keeps secondary bodywork separate and maps both wheel meshes to the same wheel', () => {
    expect(describeGroup('bodyshell.001_44').id).toBe('bodywork-2');
    expect(describeGroup('wheel_lf.child_141').id).toBe('front-wheel');
    expect(describeGroup('wheel_lf.child.001_142').id).toBe('front-wheel');
    expect(describeGroup('misc_i_43').name).toBe('Source group I');
  });
});

describe('YZF CV contract', () => {
  const parts = [{id:'front-wheel'}, {id:'engine-exterior'}];
  it('accepts a valid normalized detection and copies only supported fields', () => {
    expect(validateModelDetection({partId:'front-wheel', confidence:0.9, bbox:[0.2,0.3,0.4,0.5], arbitrary:'ignored'}, parts))
      .toEqual({modelId:'yzf-2021',partId:'front-wheel',confidence:0.9,bbox:[0.2,0.3,0.4,0.5]});
  });
  it('rejects detections for another bike or unmodeled internals', () => {
    expect(() => validateModelDetection({modelId:'fz6',partId:'front-wheel'},parts)).toThrow('different motorcycle');
    expect(() => validateModelDetection({partId:'crankshaft'},parts)).toThrow('partId');
  });
  it('rejects invalid confidence and out-of-image or empty boxes', () => {
    for (const confidence of [NaN, Infinity, -0.1, 1.1]) expect(() => validateModelDetection({partId:'front-wheel',confidence},parts)).toThrow('Confidence');
    for (const bbox of [[0,0,0,1], [0.8,0,0.3,1], [0,0,1,2], [0,NaN,1,1]]) expect(() => validateModelDetection({partId:'front-wheel',bbox},parts)).toThrow('bbox');
  });
});
