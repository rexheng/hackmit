export function validateModelDetection(payload, parts, modelId = 'yzf-2021') {
  if (!payload || (payload.modelId != null && payload.modelId !== modelId)) throw new Error('The detection belongs to a different motorcycle.');
  if (!parts.some(part => part.id === payload.partId)) throw new Error('Use a partId from this model’s component list.');
  if (payload.confidence != null && (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1)) throw new Error('Confidence must be between 0 and 1.');
  const b = payload.bbox;
  if (b != null && (!Array.isArray(b) || b.length !== 4 || b.some(n => !Number.isFinite(n) || n < 0 || n > 1) || b[2] === 0 || b[3] === 0 || b[0] + b[2] > 1 || b[1] + b[3] > 1)) throw new Error('bbox must be normalized [x, y, width, height] inside the image.');
  return {modelId, partId: payload.partId, ...(payload.confidence != null && {confidence: payload.confidence}), ...(b && {bbox: [...b]})};
}
