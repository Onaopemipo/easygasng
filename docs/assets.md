# Asset provenance

- `apps/web/public/assets/brand-reference.png`: unchanged user-supplied homepage screenshot, retained as reference only; website logo now uses the standalone original below.
- `apps/web/public/assets/delivery-illustration.png`: generated with the built-in imagegen tool, not a verified EasyGas photograph.
- `apps/web/public/assets/cylinder-illustration.png`: generated with the built-in imagegen tool, not verified product photography.
- Accessory illustrations are code-native visual symbols, not product specifications.

## Generation prompts

Hero: “Use case: photorealistic-natural. Asset type: wide website hero photograph for EasyGas Energy Solutions, Nigerian cooking gas delivery. Create a premium natural commercial photo of a smiling Black Nigerian male delivery professional in a forest green polo shirt with lime piping and green cap handing a clean glossy green LPG cooking gas cylinder to a Nigerian woman wearing a mustard yellow blouse at a modern Lagos home's doorway. A white delivery van and green tropical foliage softly blurred in background. Composition landscape 3:2, both people and cylinder primarily in right two-thirds, left side softly lit pale greenery and clean negative space for website type. Warm authentic daylight, premium editorial photography, realistic safe upright closed cylinder, no connected hose, no flames. Small word 'easygas' may appear on uniform and cylinder. No headlines, no UI, no watermark. This is illustrative marketing photography, not a verified company photograph.”

Cylinder: “Use case: product-mockup. Asset type: illustrative LPG cylinder product photo for EasyGas website. One premium glossy deep green 12.5kg cooking gas cylinder upright, complete valve safety collar and bottom foot ring, small easygas wordmark in white and lime with small orange flame on its front. Clean straight-on studio product photograph, soft realistic studio lighting, object isolated centered, full cylinder visible with generous padding. Actual transparent background. No floor, no additional objects, no UI, no surrounding text. Reference illustration, not a verified company product photograph.”

Both final assets are copied into the workspace. The mobile asset copies are `apps/mobile/assets/brand-reference.png` and `apps/mobile/assets/cylinder-illustration.png`. Original generation outputs remain in Codex's generated-image directory.

- `apps/web/public/assets/easygas-logo-hd.png`: original 2172 × 724 PNG from the user’s Easygas Energy Solutions Logo.png, copied unchanged and displayed with contain sizing.
- `apps/web/app/icon.png`: transparent flame cutout made with built-in imagegen from the user-supplied Green Flame App Icon.png. Prompt: remove the green rounded square and white background, including the inner opening; preserve the orange/yellow flame gradient and proportions, transparent alpha, no additional elements.
