import assert from "node:assert/strict";
import test from "node:test";

import {
  checkServedNginx,
  nginxConfigFindings,
} from "./check_nginx_config.mjs";

const valid = `
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  server {
   location / {
    root /usr/share/nginx/html;
    index index.html;
    add_header X-Content-Type-Options nosniff;
    add_header Permissions-Policy "geolocation=(self)";
   }
   location ~* ^/wifi-survey-v3/.*\\.mjs$ {
    root /usr/share/nginx/html;
    types { application/javascript mjs; }
   }
  }
}`;

test("Nginx gate requires an explicit JavaScript mapping for mjs", () => {
  assert.deepEqual(nginxConfigFindings(valid), []);
  const planted = valid.replace("types { application/javascript mjs; }", "");
  assert.deepEqual(nginxConfigFindings(planted), [
    ".mjs is not mapped to application/javascript in a dedicated location",
  ]);
});

test("Nginx gate rejects a duplicate types block beside mime.types", () => {
  const duplicate = valid.replace(
    "default_type application/octet-stream;",
    "types { application/javascript mjs; }\n default_type application/octet-stream;",
  );
  assert.match(
    nginxConfigFindings(duplicate).join("\n"),
    /must not duplicate mime\.types in the http scope/,
  );
});

test("configured served Nginx tree satisfies the static contract", async () => {
  const result = await checkServedNginx();
  assert.deepEqual(result.findings, []);
  assert.match(result.path, /demo\.mazemap_nginx\/nginx\.conf$/);
});
