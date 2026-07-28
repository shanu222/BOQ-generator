import { createDefaultProject, mergeRateCatalog } from '../packages/engine/src/defaults.ts';
import { runAreaEstimate } from '../packages/engine/src/area-based.ts';
import { DEFAULT_RATE_FACTORS } from '../packages/shared/src/index.ts';

const project = mergeRateCatalog(
  createDefaultProject({ rateFactors: { ...DEFAULT_RATE_FACTORS } }),
);
const { estimate } = runAreaEstimate(project, {
  areaSft: 2025,
  costPerSft: 4490,
  durationMonths: 6,
  mode: 'advanced',
});
const gt = estimate.costs.grandTotal;
console.log('Grand Total PKR:', Math.round(gt).toLocaleString('en-PK'));
console.log('Target range: 8.0–9.0 million');
console.log('Per sft PKR:', Math.round(gt / 2025));
console.log('Material:', Math.round(estimate.costs.material).toLocaleString('en-PK'));
console.log('Labour:', Math.round(estimate.costs.labour).toLocaleString('en-PK'));

const byModule: Record<string, number> = {};
for (const b of estimate.boq) {
  byModule[b.moduleId] = (byModule[b.moduleId] ?? 0) + b.amount;
}
console.log('\nBOQ by module (top):');
for (const [k, v] of Object.entries(byModule).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${k}: ${Math.round(v).toLocaleString('en-PK')}`);
}

const bricks = estimate.materials.find((m) => m.materialId === 'bricks');
console.log('\nBricks:', Math.round(bricks?.quantity ?? 0));
console.log('Cement bags:', Math.round(estimate.materials.find((m) => m.materialId === 'cement')?.quantity ?? 0));
console.log('Steel kg:', Math.round(estimate.materials.find((m) => m.materialId === 'steel-deformed')?.quantity ?? 0));

for (const area of [1215, 2025, 2835, 4050, 8100]) {
  const { estimate: e } = runAreaEstimate(project, {
    areaSft: area,
    costPerSft: 4490,
    durationMonths: 6,
    mode: 'advanced',
  });
  console.log(`${area} sft → PKR ${Math.round(e.costs.grandTotal).toLocaleString('en-PK')} (${Math.round(e.costs.grandTotal / area)}/sft)`);
}
