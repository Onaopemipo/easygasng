# Product import template

Products → Import Products now offers a UTF-8 CSV template suitable for Excel or Google Sheets. Replace the example row and upload a CSV file; existing JSON imports remain supported. The example identifier is explicitly blocked to avoid accidental example products.

Headers: id, name, description, category, sizeKg, asset, safety. Categories must match an active catalogue category. Blank CSV sizeKg becomes null. Asset values: cylinder, burner, hose, regulator, kit. Imports allow 1–25 new products, up to 100 KB. Quoted commas, escaped quotes, multiline descriptions, CRLF and UTF-8 BOM are supported. Validation identifies the failing product and rejects malformed columns, unknown fields, invalid categories and duplicate/existing identifiers.

The owner must verify their identity using Add Product’s menu before saving. Each product uses the existing protected product.import endpoint. Products remain unpublished, unpriced and without stock. Existing approval, inventory and publication workflows apply. Imports commit per product; on failure, the UI retains only remaining rows for validation and retry. No schema or hosting changes.

Verification: 17 targeted parser/workflow tests passed; TypeScript and formatting checks passed. Local browser QA confirmed actual CSV download and successful CSV preview. Browser preview did not create business records. Screenshot: docs/screenshots/product-import-template-20261030.png. Normal port 3003 server preserved; isolated QA server on 3004 stopped after verification.
