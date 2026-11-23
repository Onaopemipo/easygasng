import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
/** Continue historical source proofs only for this authorised testimonial presentation repair. */
export async function reviewedTestimonialUiSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/testimonial-publishing/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/app/product-ui.css','apps/web/components/testimonials.tsx']);
 if(!review.files[file])return incoming;
 assert.equal(incoming,review.baseline[file],file+' testimonial presentation baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' committed testimonial baseline');
 return review.files[file];
}
