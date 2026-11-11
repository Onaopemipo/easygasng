-- Additive support continuation. Legacy requests retain no SLA until explicitly enrolled.
ALTER TABLE support_requests ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE support_requests ADD COLUMN sla_policy jsonb;
ALTER TABLE support_requests ADD COLUMN response_due_at timestamptz;
ALTER TABLE support_requests ADD COLUMN resolution_due_at timestamptz;
ALTER TABLE support_requests ADD COLUMN first_response_at timestamptz;
ALTER TABLE support_requests ADD COLUMN resolved_at timestamptz;
CREATE TABLE support_sla_policies(branch_id text PRIMARY KEY REFERENCES branches(id),value jsonb NOT NULL,updated_by text NOT NULL REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE support_attachments(id text PRIMARY KEY,request_id text NOT NULL REFERENCES support_requests(id),owner_id text NOT NULL REFERENCES users(id),internal boolean NOT NULL DEFAULT false,alt text NOT NULL,mime text NOT NULL CHECK(mime='image/webp'),data bytea NOT NULL CHECK(octet_length(data)<=4000000),sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(request_id,owner_id,internal,sha256));
CREATE TABLE support_reply_operations(request_id text NOT NULL REFERENCES support_requests(id),author_id text NOT NULL REFERENCES users(id),operation_id text NOT NULL,fingerprint text NOT NULL,message_id text NOT NULL REFERENCES support_messages(id),PRIMARY KEY(request_id,author_id,operation_id));
CREATE TABLE support_sla_notices(request_id text NOT NULL REFERENCES support_requests(id),kind text NOT NULL,due_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(request_id,kind,due_at));
CREATE INDEX support_customer_page ON support_requests(customer_id,updated_at DESC,id DESC);
CREATE INDEX support_message_page ON support_messages(request_id,created_at,id);
CREATE INDEX support_attachment_ticket ON support_attachments(request_id,created_at,id);
CREATE TRIGGER support_attachments_immutable BEFORE UPDATE OR DELETE ON support_attachments FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER support_reply_operations_immutable BEFORE UPDATE OR DELETE ON support_reply_operations FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE support_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_reply_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sla_notices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON support_sla_policies TO easygas_server;
 GRANT SELECT,INSERT ON support_attachments,support_reply_operations,support_sla_notices TO easygas_server;
 CREATE POLICY trusted_server ON support_sla_policies TO easygas_server USING(true) WITH CHECK(true);
 CREATE POLICY trusted_server ON support_attachments TO easygas_server USING(true) WITH CHECK(true);
 CREATE POLICY trusted_server ON support_reply_operations TO easygas_server USING(true) WITH CHECK(true);
 CREATE POLICY trusted_server ON support_sla_notices TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
