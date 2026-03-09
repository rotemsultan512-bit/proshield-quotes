-- ProShield Quotes – Supabase Schema
-- Run this in the Supabase SQL Editor

-- Products table
create table products (
  id bigint generated always as identity primary key,
  name text not null,
  unit text not null default 'מ"א',  -- מ"ר / מ"א / יח'
  cost_price numeric(10,2) not null default 0
);

-- Quotes table
create table quotes (
  id bigint generated always as identity primary key,
  project_name text not null,
  client_name text not null,
  profit_mode text not null default 'percent', -- percent / fixed
  profit_value numeric(10,2) not null default 0,
  total_cost numeric(10,2) not null default 0,
  sale_total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Quote lines table
create table quote_lines (
  id bigint generated always as identity primary key,
  quote_id bigint not null references quotes(id) on delete cascade,
  product_id bigint not null references products(id),
  qty numeric(10,2) not null default 0,
  with_install boolean not null default false,
  labor_cost numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0
);

-- Enable Row Level Security (open for anon – internal app)
alter table products enable row level security;
alter table quotes enable row level security;
alter table quote_lines enable row level security;

create policy "Allow all on products" on products for all using (true) with check (true);
create policy "Allow all on quotes"   on quotes   for all using (true) with check (true);
create policy "Allow all on quote_lines" on quote_lines for all using (true) with check (true);

-- Seed products from supplier price list
insert into products (name, unit, cost_price) values
  ('EasyDek', 'מ"א', 5.80),
  ('EasyDek - דבק', 'מ"א', 0.66),
  ('EasyDek - מעקה', 'מ"א', 12.00),
  ('דבק חום', 'יח''', 2.95),
  ('דבק ירוק', 'יח''', 0.23),
  ('דבק חממה', 'יח''', 1.80),
  ('דו"צ 3M VHB', 'מ"א', 3.92),
  ('דו"צ Tesa 50m', 'מ"א', 0.74),
  ('לוח PP 3 מ"מ', 'מ"ר', 4.05),
  ('לוח PP 4 מ"מ', 'מ"ר', 7.88),
  ('לוח PP 3 מ"מ 60/2', 'מ"ר', 2.43),
  ('לוח PP 4 מ"מ 60/2.2', 'מ"ר', 7.16),
  ('לוח PP 4 מ"מ 2X0.6 לבן', 'מ"ר', 4.73),
  ('לוח PP 4 מ"מ 2X1 לבן', 'מ"ר', 8.20),
  ('זווית פינה קשיחה', 'מ"א', 1.17),
  ('Floorliner Original 1x50', 'מ"ר', 6.24),
  ('Floorliner Vapor 1x50', 'מ"ר', 6.50),
  ('Allprotect Original 1x25', 'מ"ר', 19.80),
  ('Allprotect Flex 1x25', 'מ"ר', 11.55),
  ('Allprotect FR+', 'מ"ר', 21.10),
  ('Allprotect White 50m', 'מ"ר', 13.36),
  ('A.P Original - CUT 20cm', 'מ"א', 5.20),
  ('A.P Flex - CUT 10cm', 'מ"א', 1.95),
  ('A.P Flex - CUT 15cm', 'מ"א', 2.83),
  ('A.P Flex - CUT 17cm', 'מ"א', 3.24),
  ('A.P Flex - CUT 20cm', 'מ"א', 3.80),
  ('A.P Flex - CUT 25cm', 'מ"א', 4.67);
