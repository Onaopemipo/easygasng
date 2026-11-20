import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd(),
  dir = "apps/web/lib",
  result = {};
function main(file) {
  const text = fs.readFileSync(file, "utf8"),
    sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true),
    vars = new Map();
  function collect(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer)
      !vars.has(n.name.text) && vars.set(n.name.text, n.initializer);
    ts.forEachChild(n, collect);
  }
  collect(sf);
  function val(n) {
    if (!n) return undefined;
    if (ts.isStringLiteralLike(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(val);
    if (ts.isIdentifier(n) && vars.has(n.text)) return val(vars.get(n.text));
    return undefined;
  }
  function schema(n, seen = new Set()) {
    if (!n) return { type: "json", required: true };
    if (ts.isIdentifier(n)) {
      if (seen.has(n.text)) return { type: "json", required: true };
      return schema(vars.get(n.text), new Set([...seen, n.text]));
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      let m = n.expression.name.text,
        base = n.expression.expression;
      if (m === "object") {
        const properties = [];
        let obj = n.arguments[0];
        if (ts.isIdentifier(obj)) obj = vars.get(obj.text);
        if (obj && ts.isObjectLiteralExpression(obj))
          for (const p of obj.properties) {
            if (ts.isSpreadAssignment(p)) {
              const spread = schema(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier("z"),
                    "object",
                  ),
                  undefined,
                  [
                    ts.isIdentifier(p.expression)
                      ? vars.get(p.expression.text)
                      : p.expression,
                  ],
                ),
              );
              properties.push(...(spread.fields || []));
            } else if (ts.isPropertyAssignment(p))
              properties.push({
                name: p.name.getText(sf).replace(/^['"]|['"]$/g, ""),
                ...schema(p.initializer),
              });
            else if (ts.isShorthandPropertyAssignment(p))
              properties.push({ name: p.name.text, ...schema(p.name) });
          }
        return { type: "object", required: true, fields: properties };
      }
      if (["string", "uuid", "date", "datetime", "email", "url"].includes(m))
        return { type: "text", required: true, format: m };
      if (m === "number") return { type: "number", required: true };
      if (m === "boolean") return { type: "checkbox", required: true };
      if (m === "enum")
        return { type: "select", required: true, options: val(n.arguments[0]) };
      if (m === "literal")
        return {
          type: typeof val(n.arguments[0]) === "boolean" ? "checkbox" : "text",
          required: true,
          value: val(n.arguments[0]),
        };
      if (m === "array")
        return { type: "array", required: true, item: schema(n.arguments[0]) };
      if (
        ["record", "unknown", "any", "union", "discriminatedUnion"].includes(m)
      )
        return { type: "json", required: true };
      const s = schema(base, seen);
      if (["optional", "nullish"].includes(m)) s.required = false;
      if (["nullable", "nullish"].includes(m)) s.nullable = true;
      if (m === "default") {
        s.required = false;
        s.value = val(n.arguments[0]);
      }
      if (["min", "max", "length"].includes(m)) s[m] = val(n.arguments[0]);
      if (m === "int") s.integer = true;
      if (m === "positive") s.min = Number.MIN_VALUE;
      if (m === "nonnegative") s.min = 0;
      return s;
    }
    if (ts.isPropertyAccessExpression(n)) return schema(n.expression, seen);
    return { type: "json", required: true };
  }
  function actions(n) {
    const a = [];
    function v(x) {
      if (
        ts.isBinaryExpression(x) &&
        ["===", "=="].includes(x.operatorToken.getText(sf))
      ) {
        if (x.left.getText(sf) === "action" && ts.isStringLiteral(x.right))
          a.push(x.right.text);
        else if (x.right.getText(sf) === "action" && ts.isStringLiteral(x.left))
          a.push(x.left.text);
      }
      if (
        ts.isCallExpression(x) &&
        ts.isPropertyAccessExpression(x.expression) &&
        x.expression.name.text === "includes" &&
        x.arguments[0]?.getText(sf) === "action" &&
        ts.isArrayLiteralExpression(x.expression.expression)
      )
        a.push(
          ...x.expression.expression.elements
            .filter(ts.isStringLiteral)
            .map((x) => x.text),
        );
      ts.forEachChild(x, v);
    }
    v(n);
    return a;
  }
  function visit(n) {
    if (ts.isIfStatement(n)) {
      const names = actions(n.expression);
      if (names.length) {
        const pars = [];
        function p(x) {
          if (
            ts.isCallExpression(x) &&
            ts.isPropertyAccessExpression(x.expression) &&
            x.expression.name.text === "parse" &&
            x.arguments.some((a) =>
              ["input", "raw", "request"].includes(a.getText(sf)),
            )
          )
            pars.push(x.expression.expression);
          ts.forEachChild(x, p);
        }
        p(n.thenStatement);
        for (const a of names) {
          if (!result[a] && pars.length) {
            const s = schema(pars[0]);
            if (s.type === "object")
              result[a] = {
                ...s,
                source: file,
                line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
              };
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
}
for (const f of fs.readdirSync(dir))
  if (f.endsWith(".ts")) main(path.join(dir, f));
fs.writeFileSync(
  "docs/native-workflows/api-contract-audit.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(Object.keys(result).length + " API contracts extracted");
