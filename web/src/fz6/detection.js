import {PARTS} from './model.js';
/** CV contract: bounding boxes are [x, y, width, height], normalized to the source photo. */
export function validateDetection(payload) {
 if(!payload||!PARTS.some(p=>p.id===payload.partId))throw new Error('Use a supported partId from the component list.');
 if(payload.confidence!=null&&(!Number.isFinite(payload.confidence)||payload.confidence<0||payload.confidence>1))throw new Error('Confidence must be between 0 and 1.');
 if(payload.bbox!=null&&(!Array.isArray(payload.bbox)||payload.bbox.length!==4||payload.bbox.some(n=>!Number.isFinite(n)||n<0||n>1)||payload.bbox[2]===0||payload.bbox[3]===0||payload.bbox[0]+payload.bbox[2]>1||payload.bbox[1]+payload.bbox[3]>1))throw new Error('bbox must be normalized [x, y, width, height] inside the image.');
 return payload;
}
