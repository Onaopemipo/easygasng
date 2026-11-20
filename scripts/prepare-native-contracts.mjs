import { nativeReportNames } from '../packages/business-rules/src/native-report-scope.ts';
import { accountRoles } from '../packages/business-rules/src/staff-roles.ts';
import { z } from 'zod';
import { serviceConfig, checklistConfig } from '../apps/web/lib/service-schema.ts';
import fs from "node:fs";
const all = JSON.parse(
    fs.readFileSync("docs/native-workflows/api-contract-audit.json", "utf8"),
  ),
  path = "packages/business-rules/src/native-workflow-contracts.json",
  out = JSON.parse(fs.readFileSync(path, "utf8"));
for (const name of [
  ...Object.keys(out),
  'testimonials.manage','credits','approvals','incidents','rewards.retry',
  "technician.revoke",
  "staff.edit",
  "staff.suspend",
  "staff.reinstate",
  "staff.access.request",
])
  if (all[name]) out[name] = all[name];
function custom(action, source, fields) {
  out[action] = {
    type: "object",
    required: true,
    source,
    fields: fields.map(
      ([name, type = "text", required = true, extra = {}]) => ({
        name,
        type,
        required,
        ...extra,
      }),
    ),
  };
}
for (const action of [
  "invoice.correction.propose",
  "invoice.correction.decide",
  "invoice.excess.request",
  "invoice.request.create",
  "invoice.request.revoke",
])
  custom(action, "apps/web/lib/invoice-corrections.ts", [
    ["orderId", "text", false],
    ["bookingId", "text", false],
    [
      "kind",
      "select",
      action === "invoice.correction.propose",
      { options: ["credit", "debit", "void"] },
    ],
    [
      "amountKobo",
      "number",
      action === "invoice.correction.propose",
      { integer: true },
    ],
    ["reason"],
    ["noteId", "text", action === "invoice.correction.decide"],
    ["approve", "checkbox", action === "invoice.correction.decide"],
    ["acceptWalletCredit", "checkbox", action === "invoice.excess.request"],
    ["token", "text", false],
    [
      "channel",
      "select",
      action === "invoice.request.create",
      { options: ["sms", "whatsapp"] },
    ],
  ]);
for (const action of [
  "approval.submit",
  "approval.edit",
  "approval.cancel",
  "approval.retry",
  "approval.revise",
  "approval.owner_apply",
])
  custom(action, "apps/web/lib/approval-workflow.ts", [
    ["id"],
    ["reason"],
    ["value", "json", false],
    ["effectiveAt", "text", false],
  ]);
for (const action of ["crm.followup.create", "crm.followup.outcome"])
  custom(action, "apps/web/lib/winback-crm.ts", [
    ["customerId", "text", action === "crm.followup.create"],
    ["ownerId", "text", false],
    ["dueAt", "text", false],
    ["nextAction", "text", action === "crm.followup.create"],
    ["followupId", "text", action === "crm.followup.outcome"],
    ["outcome", "text", action === "crm.followup.outcome"],
    ["reason", "text", false],
  ]);
custom("staff.privileges.save", "apps/web/lib/staff-privileges.ts", [
  ["userId"],
  ["version", "number", true, { integer: true }],
  [
    "changes",
    "array",
    true,
    {
      item: {
        type: "object",
        required: true,
        fields: [
          { name: "privilege", type: "text", required: true },
          {
            name: "effect",
            type: "select",
            required: true,
            options: ["grant", "deny", "default"],
          },
        ],
      },
    },
  ],
  ["reason"],
]);
// These compound parsers include source-invoice choice and current revision checks on the server.
for (const c of Object.values(out))
  for (const f of c.fields) {
    if (
      ["branchId", "scope", "sourceBranch", "destinationBranch"].includes(
        f.name,
      ) &&
      f.type === "json"
    )
      f.type = "text";
  }
custom('inventory.workspace','apps/web/lib/inventory-workspace.ts',[
 ['branchId','text',false],['category','select',false,{options:['all','gas','cylinders','accessories','other']}],['status','select',false,{options:['all','healthy','low','out','held','reserved','shortage']}],['sort','select',false,{options:['name','available','available_desc','branch']}],['from','text',false],['to','text',false],['kind','text',false],['q','text',false],['page','number',false,{integer:true,min:1,max:10000}]
]);out['inventory.movements']=structuredClone(out['inventory.workspace']);
// Imported validators are resolved from their authoritative schema, not a prototype approximation.
function fromJson(schema, required=true) {
 const nullable=Array.isArray(schema.anyOf)&&schema.anyOf.some(s=>s.type==='null');
 if(nullable) return {...fromJson(schema.anyOf.find(s=>s.type!=='null'),required),nullable:true};
 const out={type:schema.type==='boolean'?'checkbox':schema.type==='integer'||schema.type==='number'?'number':schema.type==='object'?'object':schema.type==='array'?'array':'text',required};
 if(schema.enum){out.type='select';out.options=schema.enum;}
 if(schema.type==='integer')out.integer=true;
 if(schema.minimum!==undefined)out.min=schema.minimum;if(schema.maximum!==undefined)out.max=schema.maximum;
 if(schema.minLength!==undefined)out.min=schema.minLength;if(schema.maxLength!==undefined)out.max=schema.maxLength;
 if(schema.minItems!==undefined)out.min=schema.minItems;if(schema.maxItems!==undefined)out.max=schema.maxItems;
 if(schema.default!==undefined)out.value=schema.default;
 if(schema.type==='object')out.fields=Object.entries(schema.properties).map(([name,value])=>({name,...fromJson(value,schema.required?.includes(name)||false)}));
 if(schema.type==='array')out.item=fromJson(schema.items);
 return out;
}
for(const [action,name,validator] of [['services.propose','config',serviceConfig],['services.checklist.propose','checks',checklistConfig]]){
 const field=out[action].fields.find(f=>f.name===name);Object.assign(field,fromJson(z.toJSONSchema(validator)));
}
// Shared enum references are resolved explicitly instead of becoming free-text fields.
out['report.schedule'].fields.find(f=>f.name==='report').options=[...nativeReportNames];
out['staff.access.request'].fields.find(f=>f.name==='role').options=[...accountRoles];
fs.writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
console.log(Object.keys(out).length + " reviewed native endpoint contracts");
