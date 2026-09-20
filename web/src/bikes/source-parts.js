import * as THREE from 'three';

// Spacing only moves the very same meshes used by the assembled vehicle.
// It never creates replacement geometry or asserts physical disassembly paths.
export function prepareSourceMeshes(part) {
  const radius = Math.max(.12, part.bounds.getSize(new THREE.Vector3()).length() * .38);
  part.meshes.forEach((mesh, index) => {
    mesh.userData.meshId = `${part.id}/mesh-${index + 1}`;
    mesh.userData.assemblyPosition = mesh.position.clone();
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    mesh.userData.detailOffset = new THREE.Vector3(Math.cos(angle), (index / Math.max(1, part.meshes.length - 1) - .5) * 1.4, Math.sin(angle)).multiplyScalar(radius);
    mesh.geometry.computeBoundingBox();
    mesh.userData.detailOffset.y = Math.max(mesh.userData.detailOffset.y, .025 - mesh.geometry.boundingBox.min.y);
  });
}

export function spreadSourceMeshes(part, amount) {
  const spacing = Number.isFinite(amount) ? THREE.MathUtils.clamp(amount, 0, 1) : 0;
  part.meshes.forEach(mesh => mesh.position.copy(mesh.userData.assemblyPosition).addScaledVector(mesh.userData.detailOffset, spacing));
}

export function sourcePartDescriptor(part) {
  return {
    id: part.id, name: part.name, category: part.category, sourceName: part.sourceName,
    meshCount: part.meshes.length, triangles: part.triangles, materialNames: part.materialNames,
    meshes: part.meshes.map((mesh, index) => ({
      id: mesh.userData.meshId, index: index + 1, sourceNode: mesh.userData.sourceNode,
      sourceGroup: mesh.userData.sourceGroup,
      materials: [].concat(mesh.userData.originalMaterial).map(material => material.name),
      triangles: (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3,
    })),
  };
}
