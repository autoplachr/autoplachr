CREATE TABLE account (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, profile TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE session (token TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX session_owner ON session(account_id);
--> statement-breakpoint
CREATE TABLE otp (account_id TEXT PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE, code TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE listing (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE, vehicle TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','active','sold')), created INTEGER NOT NULL, views INTEGER NOT NULL DEFAULT 0, reveals INTEGER NOT NULL DEFAULT 0, boosted_until INTEGER, moderated INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE INDEX listing_owner ON listing(account_id);
--> statement-breakpoint
CREATE TABLE publication (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE, year INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX publication_quota ON publication(account_id,year);
--> statement-breakpoint
CREATE TABLE favorite (account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE, listing_id TEXT NOT NULL, price INTEGER NOT NULL, PRIMARY KEY(account_id,listing_id));
--> statement-breakpoint
CREATE TABLE report (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, url TEXT NOT NULL, reason TEXT NOT NULL, details TEXT NOT NULL, name TEXT, email TEXT, created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', decision TEXT);
--> statement-breakpoint
CREATE TABLE rate_limit (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);
